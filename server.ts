import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  scrapeSearch,
  buildCache,
  getPaginatedList,
  getCacheStats,
  scrapeDetail,
  scrapeChapter,
  BASE,
  addLog
} from './src/server/scraper.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// CACHE BUFFER GAMBAR DALAM MEMORI UNTUK PEMBACAAN CEPAT, HALUS TANPA DELAY
const imageCache = new Map<string, { buffer: Buffer; contentType: string; t: number }>();
const MAX_IMAGE_CACHE_ENTRIES = 300;

// ENDPOINT PROXY GAMBAR UNTUK MELEWATI CORS DAN BLOKIR HOTLINK
app.get('/api/proxy-image', async (req, res) => {
  const rawUrl = req.query.url as string;
  if (!rawUrl) {
    return res.status(400).send('Missing url parameter');
  }

  let targetUrl = rawUrl;
  if (targetUrl.startsWith('/api/view/')) {
    targetUrl = `${BASE}${targetUrl}`;
  } else if (targetUrl.startsWith('/')) {
    targetUrl = `${BASE}${targetUrl}`;
  }

  // JIKA SUDAH TERSIMPAN DI CACHE BUFFER CEPAT
  const cached = imageCache.get(targetUrl);
  if (cached && Date.now() - cached.t < 24 * 60 * 60 * 1000) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.send(cached.buffer);
  }

  try {
    const response = await axios.get(targetUrl, {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        Referer: 'https://manwhaku.my.id/'
      }
    });

    const contentType = String(response.headers['content-type'] || 'image/jpeg');
    const buffer = Buffer.from(response.data);

    // HAPUS ENTRI TERTUA JIKA CACHE PENUH
    if (imageCache.size >= MAX_IMAGE_CACHE_ENTRIES) {
      const firstKey = imageCache.keys().next().value;
      if (firstKey) imageCache.delete(firstKey);
    }
    imageCache.set(targetUrl, { buffer, contentType, t: Date.now() });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.send(buffer);
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(502).json({ error: 'Failed to fetch image', message: error.message });
  }
});

// ENDPOINT UNDUH ZIP CHAPTER DARI SERVER SUMBER
app.get('/api/manga/chapter/:chapterSlug/download', async (req, res) => {
  const chapterSlug = req.params.chapterSlug;
  if (!chapterSlug) {
    return res.status(400).json({ error: 'chapterSlug diperlukan' });
  }

  const targetUrl = `${BASE}/api/chapter/${encodeURIComponent(chapterSlug)}/download`;
  try {
    const response = await axios.get(targetUrl, {
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        Referer: 'https://manwhaku.my.id/'
      }
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${chapterSlug}.zip"`);
    response.data.pipe(res);
  } catch (err: unknown) {
    const error = err as Error;
    addLog('ERROR', `Gagal download zip chapter ${chapterSlug}: ${error.message}`);
    return res.status(502).json({ error: 'Gagal mengunduh zip dari server sumber', message: error.message });
  }
});

// 1. ENDPOINT PENCARIAN (SESUAI SPESIFIKASI PROMPT)
app.get(['/manga/manwhaku/search', '/api/manga/search'], async (req, res) => {
  const q = ((req.query.q as string) || '').trim();
  if (!q) {
    return res.status(400).json({ status: false, message: 'Parameter "q" wajib diisi.' });
  }

  const started = Date.now();
  const timeTaken = () => ((Date.now() - started) / 1000).toFixed(2) + 's';

  try {
    const data = await scrapeSearch(q);
    addLog('INFO', `Pencarian "${q}" -> ${data.total} hasil (${timeTaken()})`);
    return res.json({ status: true, result: data, time_taken: timeTaken() });
  } catch (err: unknown) {
    const error = err as Error;
    addLog('ERROR', `Gagal mencari: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: 'Gagal mencari di Manwhaku: ' + (error.message || error),
      time_taken: timeTaken()
    });
  }
});

// 2. ENDPOINT REFRESH SINKRONISASI CACHE
app.get(['/manga/manwhaku/refresh', '/api/manga/refresh'], async (_req, res) => {
  const started = Date.now();
  const timeTaken = () => ((Date.now() - started) / 1000).toFixed(2) + 's';

  try {
    const items = await buildCache(true);
    return res.json({ status: true, result: { total: items.length }, time_taken: timeTaken() });
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(500).json({
      status: false,
      message: 'Gagal refresh cache: ' + (error.message || error),
      time_taken: timeTaken()
    });
  }
});

// ENDPOINT DAFTAR KOMIK DENGAN PAGINASI, FILTER, DAN URUTAN
app.get('/api/manga/list', async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 24;
  const type = (req.query.type as string) || 'all';
  const sort = (req.query.sort as string) || 'rating';
  const q = (req.query.q as string) || '';

  const stats = getCacheStats();
  if (stats.total === 0) {
    await buildCache(false);
  }

  const data = getPaginatedList({ page, limit, type, sort, q });
  return res.json({ status: true, ...data });
});

// ENDPOINT STATISTIK STATUS CACHE & BREAKDOWN
app.get('/api/manga/stats', (_req, res) => {
  const stats = getCacheStats();
  return res.json({ status: true, ...stats });
});

// ENDPOINT DETAIL INFORMASI KOMIK & DAFTAR CHAPTER
app.get('/api/manga/detail/:slug', async (req, res) => {
  const slug = req.params.slug;
  if (!slug) return res.status(400).json({ status: false, message: 'Slug diperlukan' });

  const started = Date.now();
  try {
    const detail = await scrapeDetail(slug);
    return res.json({
      status: true,
      data: detail,
      time_taken: ((Date.now() - started) / 1000).toFixed(2) + 's'
    });
  } catch (err: unknown) {
    const error = err as Error;
    addLog('ERROR', `Gagal memuat detail komik "${slug}": ${error.message}`);
    return res.status(500).json({ status: false, message: error.message });
  }
});

// ENDPOINT BACA CHAPTER DAN DAFTAR GAMBAR
app.get('/api/manga/chapter/:chapterSlug', async (req, res) => {
  const chapterSlug = req.params.chapterSlug;
  if (!chapterSlug) return res.status(400).json({ status: false, message: 'chapterSlug diperlukan' });

  const started = Date.now();
  try {
    const chapterData = await scrapeChapter(chapterSlug);
    return res.json({
      status: true,
      data: chapterData,
      time_taken: ((Date.now() - started) / 1000).toFixed(2) + 's'
    });
  } catch (err: unknown) {
    const error = err as Error;
    addLog('ERROR', `Gagal memuat chapter "${chapterSlug}": ${error.message}`);
    return res.status(500).json({ status: false, message: error.message });
  }
});

// KONFIGURASI SERVER STATIS DAN VITE
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DANSKOMIK] Server siap di http://0.0.0.0:${PORT}`);
  });
}

startServer();
