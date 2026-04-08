import './globals.css'
import { Providers } from '@/lib/providers.js'

export const metadata = {
  title: 'Zippper Ads Profit Dashboard',
  description: 'Professional Google Ads & WooCommerce Profitability Dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
