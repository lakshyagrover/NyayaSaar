const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'pdf-parse',
      'tesseract.js',
      '@prisma/client',
      'bcryptjs',
    ],
  },
}

export default nextConfig
