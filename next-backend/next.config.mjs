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
}

export default nextConfig
