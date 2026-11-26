export const metadata = {
  title: 'NyayaSaar API',
  description: 'Next.js REST API backend for the AI Court Judgment Summarizer',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
