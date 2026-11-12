// Cloudflare Workers cannot run gRPC or Node TLS agents, so both integrations
// are implemented directly on top of fetch. This keeps the report pipeline
// usable on the Workers runtime (and still works under plain Node.js).

const GOOGLE_ADS_API_VERSION = 'v23';
const GOOGLE_ADS_API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
const GOOGLE_ADS_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ADS_MAX_PAGES = 100;

const accessTokenCache = new Map();

// Structured errors carry a machine-readable `code` so the API can return an
// `errorCode` and the dashboard can explain the failure instead of showing a
// raw upstream body (e.g. a Cloudflare "error code: 1016" page).
export class IntegrationError extends Error {
  constructor(message, { code = 'integration_error', status = null, source = null, detail = null } = {}) {
    super(message);
    this.name = 'IntegrationError';
    this.code = code;
    this.status = status;
    this.source = source;
    // Technical cause for the server log — never shown to the user.
    this.detail = detail;
  }
}

// Cloudflare answers with a plain-text "error code: NNNN" body when it cannot
// reach the origin. These are CDN-level failures, not WooCommerce API errors.
const CLOUDFLARE_ERROR_DETAILS = {
  1001: 'the store DNS could not be resolved',
  1003: 'the store rejected a direct IP connection',
  1005: "the store has blocked this server's IP address",
  1006: "the store has blocked this server's IP address",
  1007: "the store has blocked this server's IP address",
  1008: "the store has blocked this server's IP address",
  1016: "Cloudflare could not resolve the store's origin server DNS",
  1020: "the store's firewall denied this server",
  520: 'the store returned an unknown error',
  521: "the store's server is down",
  522: "the store's server timed out",
  523: "the store's origin server is unreachable",
  524: 'the store took too long to respond',
  525: 'the SSL handshake with the store failed',
  526: "the store's SSL certificate is invalid",
  530: "the store's origin server DNS could not be resolved",
};

function parseCloudflareErrorPage(payload) {
  if (typeof payload !== 'string') return null;

  const match = payload.trim().match(/^error code:\s*(\d{3,4})$/i);
  if (!match) return null;

  const code = Number(match[1]);
  const detail = CLOUDFLARE_ERROR_DETAILS[code];

  return {
    code,
    message: detail
      ? `The store website is unreachable — ${detail}.`
      : `The store website is unreachable (Cloudflare error ${code}).`,
  };
}

function describeNetworkError(error) {
  return error?.cause?.message || error?.message || 'network error';
}

function normalizeCustomerId(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

export async function getGoogleAdsAccessToken(credentials) {
  const cacheKey = `${credentials.googleClientId}:${credentials.googleRefreshToken}`;
  const cached = accessTokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  let response;

  try {
    response = await fetch(GOOGLE_ADS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: credentials.googleClientId,
        client_secret: credentials.googleClientSecret,
        refresh_token: credentials.googleRefreshToken,
        grant_type: 'refresh_token',
      }),
    });
  } catch (error) {
    throw new IntegrationError('Could not reach Google Ads. Please try again.', {
      code: 'google_network_error',
      source: 'google_ads',
      detail: describeNetworkError(error),
    });
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.access_token) {
    const authRevoked = payload.error === 'invalid_grant' || response.status === 401;

    throw new IntegrationError(
      authRevoked
        ? 'Google Ads access was revoked or the refresh token is invalid. Reconnect Google Ads for this store.'
        : payload.error_description ||
          payload.error ||
          `Google OAuth token refresh failed (${response.status})`,
      {
        code: authRevoked ? 'google_auth_revoked' : 'google_oauth_error',
        status: response.status,
        source: 'google_ads',
      }
    );
  }

  const expiresInSeconds = Number(payload.expires_in) || 3600;

  accessTokenCache.set(cacheKey, {
    accessToken: payload.access_token,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });

  return payload.access_token;
}

export function getGoogleAdsClient(credentials) {
  const customerId = normalizeCustomerId(credentials.googleCustomerId);
  const loginCustomerId = normalizeCustomerId(credentials.googleLoginCustomerId);

  return {
    async query(query) {
      if (!customerId) {
        throw new Error('Google Ads customer ID is not configured for this store');
      }

      const accessToken = await getGoogleAdsAccessToken(credentials);
      const results = [];
      let pageToken = null;

      for (let page = 0; page < GOOGLE_ADS_MAX_PAGES; page += 1) {
        const headers = {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': credentials.googleDeveloperToken,
          'Content-Type': 'application/json',
        };

        if (loginCustomerId) {
          headers['login-customer-id'] = loginCustomerId;
        }

        let response;

        try {
          response = await fetch(
            `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                query,
                ...(pageToken ? { pageToken } : {}),
              }),
            }
          );
        } catch (error) {
          throw new IntegrationError('Could not reach Google Ads. Please try again.', {
            code: 'google_network_error',
            source: 'google_ads',
            detail: describeNetworkError(error),
          });
        }

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const statusMessages = {
            401: 'Google Ads authentication failed. Reconnect Google Ads for this store.',
            403: 'Google Ads permission denied. Check the developer token and manager-account access.',
            429: 'Google Ads API rate limit reached. Try again later.',
          };

          throw new IntegrationError(
            statusMessages[response.status] ||
              payload?.error?.message ||
              `Google Ads API request failed (${response.status})`,
            {
              code: 'google_ads_error',
              status: response.status,
              source: 'google_ads',
            }
          );
        }

        results.push(...(payload.results || []));

        pageToken = payload.nextPageToken || null;

        if (!pageToken) {
          break;
        }
      }

      return results;
    },
  };
}

function normalizeWooBaseUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');

  if (!trimmed) {
    throw new IntegrationError('WooCommerce store URL is not configured for this store', {
      code: 'woo_url_missing',
      source: 'woocommerce',
    });
  }

  return trimmed;
}

function buildWooUrl(baseUrl, endpoint, params) {
  const path = String(endpoint || '').replace(/^\/+/, '');
  const url = new URL(`${normalizeWooBaseUrl(baseUrl)}/wp-json/wc/v3/${path}`);

  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }

  return url;
}

export function getWooCommerceClient(credentials) {
  async function request(method, endpoint, params = {}, data) {
    let url;

    try {
      url = buildWooUrl(credentials.wooUrl, endpoint, params);
    } catch (error) {
      if (error instanceof IntegrationError) throw error;

      throw new IntegrationError('The store URL is not a valid URL. Update it in store settings.', {
        code: 'woo_url_invalid',
        source: 'woocommerce',
      });
    }

    // Matches the previous `queryStringAuth: true` behaviour of the
    // @woocommerce/woocommerce-rest-api client.
    url.searchParams.set('consumer_key', credentials.wooCk || '');
    url.searchParams.set('consumer_secret', credentials.wooCs || '');

    let response;

    try {
      response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Scalefire/1.0)',
          ...(data ? { 'Content-Type': 'application/json' } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(30000),
      });
    } catch (error) {
      const timedOut = error?.name === 'TimeoutError';

      throw new IntegrationError(
        timedOut
          ? 'The store website took too long to respond. Please try again later.'
          : 'Could not reach the store website. Check the store URL and try again.',
        {
          code: timedOut ? 'woo_timeout' : 'woo_connection_failed',
          source: 'woocommerce',
          detail: describeNetworkError(error),
        }
      );
    }

    const text = await response.text();
    let payload = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';

      const cloudflareError = parseCloudflareErrorPage(payload);
      if (cloudflareError) {
        throw new IntegrationError(cloudflareError.message, {
          code: 'woo_cloudflare_unreachable',
          status: response.status,
          source: 'woocommerce',
        });
      }

      if (payload && typeof payload === 'object' && payload.message) {
        // Real WooCommerce API error, e.g. invalid credentials.
        const authError =
          response.status === 401 ||
          String(payload.code || '').startsWith('woocommerce_rest_authentication_error');

        throw new IntegrationError(
          authError
            ? 'Invalid WooCommerce consumer key or secret. Update them in store settings.'
            : payload.message,
          {
            code: authError ? 'woo_invalid_credentials' : 'woo_api_error',
            status: response.status,
            source: 'woocommerce',
          }
        );
      }

      if (response.status === 401) {
        throw new IntegrationError(
          'Invalid WooCommerce consumer key or secret. Update them in store settings.',
          { code: 'woo_invalid_credentials', status: 401, source: 'woocommerce' }
        );
      }

      if (response.status === 404) {
        throw new IntegrationError(
          'WooCommerce REST API was not found at this store URL. Check the store URL.',
          { code: 'woo_url_not_found', status: 404, source: 'woocommerce' }
        );
      }

      if (response.status === 403) {
        // A CDN/WAF (usually Cloudflare) answered instead of WordPress. The
        // store is reachable but blocking this server's IP — fix it on the
        // store side (Security > Events, allowlist the REST API path).
        throw new IntegrationError(
          "WooCommerce blocked the request (HTTP 403): the store's CDN/firewall rejected this server, not a credentials problem.",
          { code: 'woo_blocked', status: 403, source: 'woocommerce' }
        );
      }

      const isHtml = /html/i.test(contentType) || /^\s*<!doctype html/i.test(String(payload));
      const message =
        typeof payload === 'string' && payload && !isHtml
          ? payload.slice(0, 200)
          : `WooCommerce request failed (HTTP ${response.status})`;

      throw new IntegrationError(message, {
        code: 'woo_request_failed',
        status: response.status,
        source: 'woocommerce',
      });
    }

    return { data: payload, headers: response.headers };
  }

  return {
    get: (endpoint, params) => request('GET', endpoint, params),
    post: (endpoint, data, params) => request('POST', endpoint, params, data),
    put: (endpoint, data, params) => request('PUT', endpoint, params, data),
    delete: (endpoint, params) => request('DELETE', endpoint, params),
  };
}
