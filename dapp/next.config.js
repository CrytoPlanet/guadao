/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias["@react-native-async-storage/async-storage"] = false;
    return config;
  },
};

module.exports = nextConfig;
