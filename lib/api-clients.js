// Cloudflare Workers cannot run gRPC or Node TLS agents, so both integrations
// are implemented directly on top of fetch. This keeps the report pipeline
// usable on the Workers runtime (and still works under plain Node.js).

const GOOGLE_ADS_API_VERSION = 'v23';
const GOOGLE_ADS_API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
const GOOGLE_ADS_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ADS_MAX_PAGES = 100;

const accessTokenCache = new Map();

function normalizeCustomerId(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

export async function getGoogleAdsAccessToken(credentials) {
  const cacheKey = `${credentials.googleClientId}:${credentials.googleRefreshToken}`;
  const cached = accessTokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const response = await fetch(GOOGLE_ADS_TOKEN_URL, {
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

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.access_token) {
    const message =
      payload.error_description ||
      payload.error ||
      `Google OAuth token refresh failed (${response.status})`;
    throw new Error(message);
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

        const response = await fetch(
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

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            payload?.error?.message ||
            `Google Ads API request failed (${response.status})`;
          throw new Error(message);
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
    throw new Error('WooCommerce store URL is not configured for this store');
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
    const url = buildWooUrl(credentials.wooUrl, endpoint, params);

    // Matches the previous `queryStringAuth: true` behaviour of the
    // @woocommerce/woocommerce-rest-api client.
    url.searchParams.set('consumer_key', credentials.wooCk || '');
    url.searchParams.set('consumer_secret', credentials.wooCs || '');

    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Scalefire/1.0)',
        ...(data ? { 'Content-Type': 'application/json' } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(30000),
    });

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
      let message;

      if (payload && typeof payload === 'object' && payload.message) {
        // Real WooCommerce API error, e.g. invalid credentials.
        message = payload.message;
      } else if (typeof payload === 'string' && !/html/i.test(contentType)) {
        message = payload.slice(0, 200);
      } else if (response.status === 403) {
        // A CDN/WAF (usually Cloudflare) answered instead of WordPress. The
        // store is reachable but blocking this server's IP — fix it on the
        // store side (Security > Events, allowlist the REST API path).
        message = `WooCommerce blocked the request (HTTP 403): the store's CDN/firewall rejected this server, not a credentials problem.`;
      } else {
        message = `WooCommerce request failed (HTTP ${response.status})`;
      }

      throw new Error(message);
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
