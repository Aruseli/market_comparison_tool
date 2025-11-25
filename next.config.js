/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig = {
  ...(isProduction && { output: 'export' }),
  basePath: isProduction ? '/market_comparison_tool' : '',
  assetPrefix: isProduction ? '/market_comparison_tool' : '',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig

