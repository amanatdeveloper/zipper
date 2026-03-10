import { GoogleAdsApi } from 'google-ads-api';
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

// --- 1. Google Ads Client Setup ---
export function getGoogleAdsClient() {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_DEVELOPER_TOKEN,
  });

  return client.Customer({
    customer_id: process.env.GOOGLE_CUSTOMER_ID,
    login_customer_id: process.env.GOOGLE_LOGIN_CUSTOMER_ID, // Omar's Manager Account ID
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
}

// --- 2. WooCommerce Client Setup ---
export function getWooCommerceClient() {
  return new WooCommerceRestApi({
    url: process.env.WOO_URL,
    consumerKey: process.env.WOO_CK,
    consumerSecret: process.env.WOO_CS,
    version: 'wc/v3',
    queryStringAuth: true, // Sab se zaroori: Credentials ko URL params mein bhejta hai (403 bypass ke liye)
    axiosConfig: {
      headers: {
        // Browser ki identity assume karna taake server block na kare
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 20000 // 20 seconds timeout taake slow servers par crash na ho
    }
  });
}