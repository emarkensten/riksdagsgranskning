import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Riksdagsgranskning',
  description: 'Granskningsapp för svenska riksdagspolitiker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  )
}
