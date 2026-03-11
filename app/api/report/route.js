import { NextResponse } from 'next/server';
import { getGoogleAdsClient } from '../../../lib/api-clients.js';

export async function GET(request) {
  try {
    const customer = getGoogleAdsClient();
    
    // Sirf testing ke liye aik simple query
    const googleQuery = `
      SELECT metrics.clicks 
      FROM shopping_performance_view 
      WHERE segments.date DURING LAST_30_DAYS 
      LIMIT 1`;
    
    await customer.query(googleQuery);

    return NextResponse.json({ 
      success: true, 
      message: "Google Ads connection is SUCCESSFUL. Only WooCommerce is blocked by Cloudflare." 
    });

  } catch (error) {
    console.error("Debug Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Google Ads also failed: " + error.message,
      tip: "Check if Google Cloud Console has this server IP whitelisted in Redirect URIs"
    });
  }
}