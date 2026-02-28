import { GoogleAdsApi } from 'google-ads-api';
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

// Google Ads Client Setup
export function getGoogleAdsClient() {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_DEVELOPER_TOKEN,
  });

  return client.Customer({
    customer_id: process.env.GOOGLE_CUSTOMER_ID,
    login_customer_id: process.env.GOOGLE_LOGIN_CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
}

// WooCommerce Client Setup
export function getWooCommerceClient() {
  return new WooCommerceRestApi({
    url: process.env.WOO_URL,
    consumerKey: process.env.WOO_CK,
    consumerSecret: process.env.WOO_CS,
    version: 'wc/v3',
    queryStringAuth: true, // Credentials ko URL params mein bhejay ga (403 bypass karne ke liye best hai)
    axiosConfig: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 seconds timeout
    }
  });
}