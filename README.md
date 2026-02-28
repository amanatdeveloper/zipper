# Zippper Ads Profit Dashboard

Professional Google Ads & WooCommerce profitability dashboard built with Next.js.

**Developed by: Amanat Developers**

## Features

- Real-time Google Ads Shopping performance data
- WooCommerce sales integration
- Product-level profitability analysis
- Smart recommendations based on ACOS and conversion rates
- Date range filtering (7 or 30 days)
- Responsive design with Tailwind CSS

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.local.template` to `.env.local` and fill in your API credentials:
```bash
cp .env.local.template .env.local
```

3. Configure your environment variables:
   - Google Ads API credentials
   - WooCommerce store URL and API keys

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Deployment

Deploy to Vercel:
```bash
vercel
```

Make sure to add all environment variables in your Vercel project settings.

## Recommendation Logic

- **Target CPA:** 15%
- **Target Conv. Rate:** 1%
- **Target Monthly Sales:** 5

### Rules:
1. CPA < 15% & Sales >= 5 → ✅ Do Nothing (Optimal)
2. CPA < 15% & Sales < 5 → 🚀 Increase Bid (Growth Opp)
3. CPA >= 15% & Conv Rate < 1% → 📉 Reduce Bid (Low Efficiency)
4. CPA >= 15% & Conv Rate >= 1% → 💰 Reduce Price (Price Resistance)

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Lucide Icons
- Google Ads API
- WooCommerce REST API
