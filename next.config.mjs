/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Suppress Edge Runtime warnings for Node.js-only modules
    // These warnings are false positives since we've configured
    // all routes using auth/admin middleware to use Node.js runtime
    if (isServer) {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        {
          module: /node_modules\/bcryptjs/,
          message: /Edge Runtime/,
        },
        {
          module: /node_modules\/jsonwebtoken/,
          message: /Edge Runtime/,
        },
        {
          module: /node_modules\/jws/,
          message: /Edge Runtime/,
        },
        {
          module: /src\/lib\/auth\.ts/,
          message: /Edge Runtime/,
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
