import './globals.css'
import { Providers } from '../lib/providers.js'
import LayoutWrapper from '../components/LayoutWrapper.js'

export const metadata = {
  title: 'Zippper Ads Profit Dashboard',
  description: 'Professional Google Ads & WooCommerce Profitability Dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  )
}
