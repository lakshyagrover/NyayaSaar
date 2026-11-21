// Root layout for Next.js — required by App Router
// Since this is a pure API backend, the layout is minimal.
export const metadata = {
  title: 'AI Court Summarizer — Backend API',
  description: 'Next.js REST API backend for the AI Court Judgment Summarizer',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
