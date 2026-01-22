/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    config.resolve.alias["@react-native-async-storage/async-storage"] = false;
    return config;
  },
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, content-type, Authorization' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' }, // Allow Safe to fetch resources
          // Removing X-Frame-Options to allow framing
        ],
      }
    ];
  },
};

module.exports = nextConfig;
