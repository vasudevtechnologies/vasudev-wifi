import './globals.css'

export const metadata = {
  title: 'Vasudev Technologies — WiFi Router Battery Backup System | Power Never Stops',
  description: 'Experience the future of continuous connectivity. Vasudev Technologies WiFi Router Battery Backup System — engineered for intelligent backup power and smart IoT monitoring.',
  keywords: 'WiFi Router, Battery Backup, IoT, Vasudev Technologies, Smart Router, ESP32',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
