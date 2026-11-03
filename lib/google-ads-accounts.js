// Google Ads account discovery for onboarding.
//
// `listAccessibleCustomers` only returns accounts the authenticated user can
// reach directly, so manager (MCC) accounts are expanded through
// `customer_client` to surface nested client accounts as well.

import { normalizeCustomerId } from './customer-id.js';

export { normalizeCustomerId, formatCustomerId } from './customer-id.js';

const GOOGLE_ADS_API_VERSION = 'v23';
const GOOGLE_ADS_API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
const MAX_DISCOVERY_DEPTH = 5;
const MAX_DISCOVERY_ACCOUNTS = 1000;

async function runSearch({ accessToken, developerToken, customerId, loginCustomerId, query }) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  };

  if (loginCustomerId) {
    headers['login-customer-id'] = normalizeCustomerId(loginCustomerId);
  }

  const results = [];
  let pageToken = null;

  do {
    const response = await fetch(
      `${GOOGLE_ADS_API_BASE}/customers/${normalizeCustomerId(customerId)}/googleAds:search`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, ...(pageToken ? { pageToken } : {}) }),
      }
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        payload?.error?.message || `Google Ads API request failed (HTTP ${response.status})`
      );
    }

    results.push(...(payload.results || []));
    pageToken = payload.nextPageToken || null;
  } while (pageToken);

  return results;
}

async function listAccessibleCustomerIds({ accessToken, developerToken }) {
  const response = await fetch(
    `${GOOGLE_ADS_API_BASE}/customers:listAccessibleCustomers`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Google Ads API could not list accessible accounts (HTTP ${response.status})`
    );
  }

  const payload = await response.json().catch(() => ({}));

  return (payload.resourceNames || [])
    .map((resourceName) => normalizeCustomerId(String(resourceName).split('/')[1]))
    .filter(Boolean);
}

export async function discoverAdvertisingAccounts({ accessToken, developerToken }) {
  const accessibleCustomerIds = await listAccessibleCustomerIds({
    accessToken,
    developerToken,
  });

  const accounts = [];
  const seen = new Set();

  const addAccount = ({ customerId, descriptiveName, manager, loginCustomerId }) => {
    const id = normalizeCustomerId(customerId);

    if (!id || seen.has(id) || accounts.length >= MAX_DISCOVERY_ACCOUNTS) {
      return;
    }

    seen.add(id);
    accounts.push({
      customerId: id,
      descriptiveName: descriptiveName || '',
      manager: Boolean(manager),
      loginCustomerId: loginCustomerId ? normalizeCustomerId(loginCustomerId) : id,
    });
  };

  const exploreManager = async (managerId, loginCustomerId, depth) => {
    if (depth > MAX_DISCOVERY_DEPTH) {
      return;
    }

    const results = await runSearch({
      accessToken,
      developerToken,
      customerId: managerId,
      loginCustomerId,
      query:
        'SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.level FROM customer_client',
    });

    for (const row of results) {
      const client = row.customerClient;

      if (!client?.id) {
        continue;
      }

      addAccount({
        customerId: client.id,
        descriptiveName: client.descriptiveName,
        manager: client.manager,
        loginCustomerId: managerId,
      });

      if (client.manager) {
        await exploreManager(client.id, managerId, depth + 1);
      }
    }
  };

  for (const customerId of accessibleCustomerIds) {
    let descriptiveName = '';
    let manager = false;

    try {
      const results = await runSearch({
        accessToken,
        developerToken,
        customerId,
        loginCustomerId: null,
        query: 'SELECT customer.id, customer.descriptive_name, customer.manager FROM customer',
      });

      const customer = results[0]?.customer;
      descriptiveName = customer?.descriptiveName || '';
      manager = Boolean(customer?.manager);
    } catch (error) {
      // `listAccessibleCustomers` already proved access, so keep the account
      // selectable even when its detail lookup fails.
      descriptiveName = '';
      manager = false;
    }

    addAccount({ customerId, descriptiveName, manager, loginCustomerId: customerId });

    if (manager) {
      await exploreManager(customerId, customerId, 1);
    }
  }

  return accounts;
}

export function getEligibleAdvertisingAccounts(accounts) {
  return (Array.isArray(accounts) ? accounts : []).filter(
    (account) => !account?.manager
  );
}
