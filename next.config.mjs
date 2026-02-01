/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // CSP configuration: Allow unsafe-eval in both development and production
    // Next.js and some dependencies (like webpack, HMR, React DevTools) require unsafe-eval
    // This is a known requirement for Next.js applications
    const cspDirectives = "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'self';";
    
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
          {
            key: 'Content-Security-Policy',
            value: cspDirectives
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
