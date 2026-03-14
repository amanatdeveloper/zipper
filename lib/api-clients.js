import { GoogleAdsApi } from 'google-ads-api';
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import https from 'https';

export function getGoogleAdsClient(credentials) {
  return new GoogleAdsApi({
    client_id: credentials.googleClientId,
    client_secret: credentials.googleClientSecret,
    developer_token: credentials.googleDeveloperToken,
  }).Customer({
    customer_id: credentials.googleCustomerId,
    login_customer_id: credentials.googleLoginCustomerId,
    refresh_token: credentials.googleRefreshToken,
  });
}

export function getWooCommerceClient(credentials) {
  // WooCommerce package export handle karne ke liye
  const WooCommerce = WooCommerceRestApi.default || WooCommerceRestApi;
  
  return new WooCommerce({
    url: credentials.wooUrl,
    consumerKey: credentials.wooCk,
    consumerSecret: credentials.wooCs,
    version: 'wc/v3',
    queryStringAuth: true,
    axiosConfig: {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
        'Host': new URL(credentials.wooUrl).host
      },
      timeout: 30000
    }
  });
}