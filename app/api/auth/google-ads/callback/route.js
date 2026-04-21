import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${baseUrl}/onboarding?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/onboarding?error=No authorization code received`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${baseUrl}/api/auth/google-ads/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(`Token exchange failed: ${errorData.error_description || 'Unknown error'}`);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token } = tokens;

    if (!refresh_token) {
      throw new Error('No refresh token received. Please try again and ensure you grant consent.');
    }

    // Fetch accessible customers using Google Ads API v17
    let accounts = [];
    try {
      const accessibleCustomersResponse = await fetch(
        'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      console.log('Accessible customers response status:', accessibleCustomersResponse.status);

      if (accessibleCustomersResponse.ok) {
        const accessibleCustomersData = await accessibleCustomersResponse.json();
        const resourceNames = accessibleCustomersData.resourceNames || [];
        const customerIds = resourceNames.map(name => name.split('/')[1]);

        console.log('Found customer IDs:', customerIds);

        // Get customer details for each
        for (const customerId of customerIds.slice(0, 10)) {
          try {
            const searchResponse = await fetch(
              `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${access_token}`,
                  'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  query: `SELECT customer.descriptive_name, customer.id FROM customer WHERE customer.id = '${customerId}'`,
                }),
              }
            );

            if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              const results = searchData.results || [];
              if (results.length > 0) {
                const customer = results[0].customer;
                accounts.push({
                  customerId: customer.id.toString(),
                  descriptiveName: customer.descriptive_name || `Account ${customer.id}`,
                });
              }
            } else {
              console.warn(`Search failed for customer ${customerId}: ${searchResponse.status}`);
              // Add basic account info without descriptive name
              accounts.push({
                customerId: customerId.toString(),
                descriptiveName: `Account ${customerId}`,
              });
            }
          } catch (err) {
            console.error(`Error fetching details for customer ${customerId}:`, err.message);
            // Still add the account with basic info
            accounts.push({
              customerId: customerId.toString(),
              descriptiveName: `Account ${customerId}`,
            });
          }
        }
      } else {
        const errorText = await accessibleCustomersResponse.text();
        console.warn('Failed to fetch accessible customers:', accessibleCustomersResponse.status, errorText);
        // Continue without account list - user can manually enter customer ID
        accounts = [];
      }
    } catch (err) {
      console.error('Error fetching accessible customers:', err.message);
      // Continue without account list - user can manually enter customer ID
      accounts = [];
    }

    // Pass tokens and accounts back to frontend
    const accountsJson = encodeURIComponent(JSON.stringify(accounts));
    const refreshTokenEncoded = encodeURIComponent(refresh_token);

    return NextResponse.redirect(
      `${baseUrl}/onboarding?google_accounts=${accountsJson}&google_refresh_token=${refreshTokenEncoded}&auth_success=true`
    );

  } catch (err) {
    console.error('Google Ads OAuth callback error:', err);
    return NextResponse.redirect(
      `${baseUrl}/onboarding?error=${encodeURIComponent(err.message)}`
    );
  }
}