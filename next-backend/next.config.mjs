/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep these packages server-side only (avoid bundling native binaries)
    serverComponentsExternalPackages: [
      'pdf-parse',
      'tesseract.js',
      '@prisma/client',
      'bcryptjs',
    ],
  },

  // CORS headers — allow the React frontend to call the API
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.FRONTEND_URL || 'http://localhost:5173',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ]
  },
}

export default nextConfig
