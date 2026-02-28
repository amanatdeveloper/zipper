import './globals.css'

export const metadata = {
  title: 'Zippper Ads Profit Dashboard',
  description: 'Professional Google Ads & WooCommerce Profitability Dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
