/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  // Для GitHub Pages - статический экспорт
  // Для Vercel - обычная сборка с API routes
  ...(isGitHubPages && { output: 'export' }),
  basePath: isGitHubPages ? '/market_comparison_tool' : '',
  assetPrefix: isGitHubPages ? '/market_comparison_tool' : '',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig

