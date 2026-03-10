import { GoogleAdsApi } from 'google-ads-api';
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

export function getGoogleAdsClient() {
  return new GoogleAdsApi({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_DEVELOPER_TOKEN,
  }).Customer({
    customer_id: process.env.GOOGLE_CUSTOMER_ID,
    login_customer_id: process.env.GOOGLE_LOGIN_CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
}

export function getWooCommerceClient() {
  return new WooCommerceRestApi({
    url: process.env.WOO_URL,
    consumerKey: process.env.WOO_CK,
    consumerSecret: process.env.WOO_CS,
    version: 'wc/v3',
    queryStringAuth: true,
    axiosConfig: {
      // Yeh line same-server requests ke liye zaroori hai
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      }),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
        'Host': 'www.zippermobilityscooters.com' // Force the host header
      },
      timeout: 30000
    }
  });
}