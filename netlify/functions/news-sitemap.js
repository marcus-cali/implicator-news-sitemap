export async function handler() {
  const FEED = 'https://www.implicator.ai/latest/rss/';
  const TWO_DAYS = 1000 * 60 * 60 * 48; // 48 hours
  try {
    const res = await fetch(FEED, {
      headers: { 'User-Agent': 'ImplicatorNewsSitemap/1.0 (+https://www.implicator.ai/)' }
    });
    if (!res.ok) throw new Error(`Feed fetch ${res.status}`);
    const xml = await res.text();

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
    const now = Date.now();
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const norm = u => u
      ?.replace(/^http:\/\//,'https://')
      ?.replace(/^https:\/\/implicator\.ai/,'https://www.implicator.ai');

    const entries = items.map(item => {
      const loc = norm((item.match(/<link>([\s\S]*?)<\/link>/) || [])[1]?.trim());
      const title = (item.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim();
      const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]?.trim();
      const when = pubDate ? new Date(pubDate) : null;
      return { loc, title, when };
    })
    .filter(e => e.loc && e.title && e.when && (now - e.when.getTime()) <= TWO_DAYS)
    .slice(0, 1000); // Google News limit

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries.map(e => `
  <url>
    <loc>${esc(e.loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>Implicator.ai</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${e.when.toISOString()}</news:publication_date>
      <news:title>${esc(e.title)}</news:title>
    </news:news>
  </url>`).join('')}
</urlset>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=300'
      },
      body
    };
  } catch (err) {
    // Return an empty valid doc on error so Google doesn't treat it as a crawl failure
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"></urlset>`
    };
  }
}
