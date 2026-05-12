import fs from 'fs';
import path from 'path';

const DOMAIN = 'https://noureddinelmobaraki-web.github.io/NL';
const PAGES = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/#me-bit-gallery', priority: '0.8', changefreq: 'weekly' },
  { url: '/#my-songs-section', priority: '0.9', changefreq: 'weekly' },
  { url: '/#drawings-section', priority: '0.8', changefreq: 'weekly' },
];

function generateSitemap() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(page => `  <url>
    <loc>${DOMAIN}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  const distDir = path.resolve(process.cwd(), 'dist');
  
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xml);
  console.log('✅ Sitemap generated successfully in dist/sitemap.xml');
}

generateSitemap();
