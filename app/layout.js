import './globals.css'
import { Providers } from '../lib/providers.js'

export const metadata = {
  title: 'Scalefire',
  description: 'AI-powered ecommerce growth and profitability platform',
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
