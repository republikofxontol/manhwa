import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

export const BASE = 'https://manwhaku.my.id';
export const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 JAM
const CACHE_FILE = path.resolve(process.cwd(), 'cache_storage.json');

export const SOURCES = [
  '/manga',
  '/manga?page=2',
  '/manga?page=3',
  '/manga?page=4',
  '/manga?page=5',
  '/manga?page=6',
  '/manga?page=7',
  '/manga?page=8',
  '/manga?page=9',
  '/manga?page=10',
  '/manga?type=manga',
  '/manga?type=manhwa',
  '/manga?type=manhua',
  '/'
];

export interface ComicItem {
  title: string;
  slug: string;
  url: string;
  coverUrl: string;
  rating: number | null;
  latestChapter: string;
  type: string;
  lastUpdated?: string;
}

export interface CacheState {
  t: number;
  items: ComicItem[];
  logs: Array<{ timestamp: string; type: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR'; message: string }>;
}

let cache: CacheState = {
  t: 0,
  items: [],
  logs: []
};

// CACHE DALAM MEMORI UNTUK RESPON SUB-MILIDETIK
const detailCache = new Map<string, { t: number; data: MangaDetail }>();
const chapterCache = new Map<string, { t: number; data: ChapterDetail }>();

// FUNGSI KLASIFIKASI AKURAT: MEMASTIKAN MANGA (JEPANG), MANHWA (KOREA), DAN MANHUA (CHINA) TIDAK TERCAMPUR
export function classifyComic(title: string, slug: string, originalType?: string): 'manga' | 'manhwa' | 'manhua' {
  const t = (title + ' ' + slug).toLowerCase();

  // 1. CIRI KHAS MURIM & WEBTOON KOREA (MANHWA)
  const isKoreanMurim = /mount hua|hwasan|murim|heavenly demon|demon cult|chung myung|volcanic age|nano machine|poison dragon|northern blade|reaper of the drifting|legend of the northern/i.test(t);
  if (isKoreanMurim) return 'manhwa';

  // 2. CIRI KHAS MANGA JEPANG (KATA ROMAJI / JUDUL MANGA POPULER JEPANG)
  const isJapaneseManga = 
    /(^|[\s\-_])(no|wa|wo|ni|ga|de|to|mo|ka|isekai|yuusha|yusha|saikyou|mangaka|shuumatsu|valkyrie|taoreta|batsu|harem|fujin|otsukiai|sukutta|deshita|fufu|kurasu|nonbiri|shiawase|inaka|otome|sensei|san|kun|chan|sama|senpai|kouhai|tensei|doujin|monogatari|shingeki|jujutsu|boruto|naruto|chainsaw|bleach|berserk|tokyo|attack on titan|death note|demon slayer|kimetsu|boku|my hero|shikimori|nagatoro|komi|spy x family|dr stone|black clover|vinland|blue lock|haikyuu|gintama|fairy tail|hunter x hunter|one piece)([\s\-_]|$)/i.test(t) ||
    /taoreta|shuumatsu|yuusha|yusha|saikyou|mangaka|batsu harem|wolf girl|feasting lord/i.test(t);

  // 3. CIRI KHAS MANHUA CHINA (KULTIVASI / XIANXIA / WUXIA)
  const isChineseManhua = 
    /cultivat|immortal|sovereign|apocalypse battle|giantess buddy|global game|demonic emperor|peerless|tales of demons|yuan zun|battle through the heavens|soul land|magic emperor|invincible at the start|urban immortal|asura|martial god|hundred times|all hail the sect leader/i.test(t);

  // 4. CIRI KHAS WEBTOON & MANHWA KOREA (TEMA LEVELING, SYSTEM, HUNTER, BOSS, SEKOLAH KOREA)
  const isKoreanManhwa = 
    /peter|lookism|eleceed|quest|hero|boss|bad person|juvenile|paladin|scorned genius|constellation|ranker|dungeon|leveling|system|swordmaster|return of the|reincarnat|regress|player|weak hero|how to fight|viral hit|study group|mercenary|overpowered|trash of the|estate developer|infinite mage|pick me up|unruly heir|sea of blood|demon king|dark captive|homebody|conquest|ticket hero|academy/i.test(t);

  if (isJapaneseManga && !isKoreanMurim && !isKoreanManhwa) return 'manga';
  if (isChineseManhua) return 'manhua';
  if (isKoreanManhwa) return 'manhwa';
  if (isJapaneseManga) return 'manga';

  // JIKA TIDAK ADA KATA KUNCI KHUSUS, GUNAKAN TIPE ASLI DENGAN PENYARINGAN CERMAT
  if (originalType === 'manhua') return 'manhua';
  if (originalType === 'manga' && isJapaneseManga) return 'manga';
  return 'manhwa';
}

// MEMUAT CACHE PERSISTEN DARI DISK JIKA TERSEDIA
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
      cache = parsed;
      // KLASIFIKASI ULANG SECARA AKURAT KE MANGA (JEPANG), MANHWA (KOREA), DAN MANHUA (CHINA)
      cache.items = cache.items.map((i) => ({
        ...i,
        type: classifyComic(i.title, i.slug, i.type)
      }));
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
      console.log(`[DANSKOMIK] Cache dimuat dari disk: ${cache.items.length} komik terklasifikasi akurat.`);
    }
  }
} catch (e) {
  console.warn('[DANSKOMIK] Gagal membaca cache disk:', e);
}

let building: Promise<ComicItem[]> | null = null;

export function addLog(type: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR', message: string) {
  const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
  cache.logs.unshift({ timestamp, type, message });
  if (cache.logs.length > 50) {
    cache.logs.pop();
  }
}

export const clean = (s: unknown) => String(s || '').replace(/\s+/g, ' ').trim();

export const absUrl = (path: string) =>
  !path ? '' : /^https?:\/\//i.test(path) ? path : BASE + (path.startsWith('/') ? path : '/' + path);

export const realImage = (src?: string | null) => {
  if (!src) return '';
  try {
    const u = new URL(src, BASE);
    return u.searchParams.get('url') || u.href;
  } catch {
    return src;
  }
};

export const slugify = (s: string) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const parseCards = ($: cheerio.CheerioAPI): ComicItem[] => {
  const seen = new Set<string>();
  const items: ComicItem[] = [];

  $('h3').each((_, h) => {
    const title = clean($(h).text());
    if (!title || title.toLowerCase().includes('install aplikasi')) return;

    const parent = $(h).closest('div');
    const container = parent.parent();
    const text = container.text();

    const $a = $(h).find('a').first().length ? $(h).find('a').first() : container.find('a').first();
    const href = $a.attr('href') || '';

    const $img = container.find('img').first();

    const starMatch = text.match(/★\s*([\d.]+)/) || text.match(/([\d.]+)\s*★/);
    const rating = starMatch ? starMatch[1] : null;

    const chapter = (text.match(/(?:Chapter|Ch\.)\s*([\d.]+)/i) || [])[1];
    const rawType = (text.match(/(Manga|Manhwa|Manhua)/i) || [])[1];

    const slug = href ? href.split('?')[0].split('/').filter(Boolean).pop() || slugify(title) : slugify(title);

    // KLASIFIKASIKAN DENGAN AKURAT SEHINGGA MANGA HANYA JEPANG, MANHWA HANYA KOREA, DAN MANHUA HANYA CHINA
    const calculatedType = classifyComic(title, slug, rawType ? rawType.toLowerCase() : undefined);

    items.push({
      title,
      slug,
      url: href ? absUrl(href) : `${BASE}/manga/${slug}`,
      coverUrl: realImage($img.attr('src') || $img.attr('data-src')),
      rating: rating ? Number(rating) : null,
      latestChapter: chapter || '',
      type: calculatedType,
      lastUpdated: new Date().toISOString()
    });
  });

  return items;
};

export async function fetchPage(path: string): Promise<string> {
  const response = await axios.get(BASE + path, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    timeout: 25000,
    maxRedirects: 5,
    responseType: 'text'
  });
  return String(response.data || '');
}

export async function runBuild(): Promise<ComicItem[]> {
  const now = Date.now();
  const items: ComicItem[] = [];
  const seen = new Set<string>();

  addLog('INFO', `Sinkronisasi cache: mengambil data dari ${SOURCES.length} katalog...`);

  // PENGAMBILAN DATA DALAM BATCH PARALEL (2 HALAMAN SEKALIGUS)
  for (let i = 0; i < SOURCES.length; i += 2) {
    const batch = SOURCES.slice(i, i + 2);
    await Promise.all(
      batch.map(async (src) => {
        try {
          const html = await fetchPage(src);
          const parsed = parseCards(cheerio.load(html));
          for (const card of parsed) {
            const key = card.title.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            items.push(card);
          }
          addLog('INFO', `${src} -> ${parsed.length} komik`);
        } catch (e: unknown) {
          const err = e as Error;
          addLog('WARN', `${src} -> ${err.message}`);
        }
      })
    );

    if (items.length > 0) {
      cache.items = [...items];
    }
  }

  if (items.length > 0) {
    cache.t = now;
    cache.items = items;
    addLog('SUCCESS', `Cache selesai dibangun: ${items.length} komik terindeks.`);
    // MENYIMPAN KE DISK UNTUK START INSTAN TANPA DELAY
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
    } catch {}
  } else if (cache.items.length > 0) {
    addLog('WARN', `Tetap menggunakan ${cache.items.length} komik dari cache sebelumnya.`);
  }

  return cache.items;
}

export async function buildCache(force = false): Promise<ComicItem[]> {
  if (!force && cache.items.length > 0 && Date.now() - cache.t < CACHE_TTL) {
    return cache.items;
  }
  if (!building) {
    building = runBuild().finally(() => {
      building = null;
    });
  }
  if (!force && cache.items.length > 0) {
    return cache.items;
  }
  return building;
}

export async function scrapeSearch(query: string) {
  const all = await buildCache(false);
  if (!all.length) {
    throw new Error('Cache belum terisi, coba lakukan refresh cache.');
  }

  const words = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const items = all.filter((m) => {
    const t = m.title.toLowerCase();
    return words.every((w) => t.includes(w));
  });

  return { query, scanned: all.length, total: items.length, items };
}

export function getCacheStats() {
  const mangaCount = cache.items.filter((i) => i.type === 'manga').length;
  const manhwaCount = cache.items.filter((i) => i.type === 'manhwa').length;
  const manhuaCount = cache.items.filter((i) => i.type === 'manhua').length;

  return {
    total: cache.items.length,
    lastUpdated: cache.t ? new Date(cache.t).toISOString() : null,
    isBuilding: building !== null,
    breakdown: {
      manga: mangaCount,
      manhwa: manhwaCount,
      manhua: manhuaCount
    },
    logs: cache.logs.slice(0, 15)
  };
}

export function getPaginatedList(params: {
  page?: number;
  limit?: number;
  type?: string;
  sort?: string;
  q?: string;
}) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 24));
  let list = [...cache.items];

  // FILTER PENCARIAN KATA KUNCI
  if (params.q && params.q.trim()) {
    const words = params.q.trim().toLowerCase().split(/\s+/);
    list = list.filter((item) => {
      const t = item.title.toLowerCase();
      return words.every((w) => t.includes(w));
    });
  }

  // FILTER KATEGORI TIPE (MANGA / MANHWA / MANHUA)
  if (params.type && params.type !== 'all') {
    const targetType = params.type.toLowerCase();
    list = list.filter((item) => item.type.toLowerCase() === targetType);
  }

  // PENGURUTAN (RATING, JUDUL, ATAU CHAPTER TERBARU)
  if (params.sort === 'rating') {
    list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (params.sort === 'title') {
    list.sort((a, b) => a.title.localeCompare(b.title));
  } else if (params.sort === 'latest') {
    list.sort((a, b) => (parseFloat(b.latestChapter) || 0) - (parseFloat(a.latestChapter) || 0));
  }

  const total = list.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const items = list.slice(start, start + limit);

  return {
    page,
    limit,
    total,
    totalPages,
    items
  };
}

export interface MangaDetail {
  title: string;
  slug: string;
  coverUrl: string;
  rating: number | null;
  status: string;
  type: string;
  synopsis: string;
  genres: string[];
  totalChapters: number;
  firstChapterSlug?: string;
  latestChapterSlug?: string;
  chapters: Array<{
    slug: string;
    title: string;
    chapterNumber: string;
    releaseDate?: string;
  }>;
}

export async function scrapeDetail(slug: string): Promise<MangaDetail> {
  // PERIKSA CACHE MEMORI TERLEBIH DAHULU (TTL 1 JAM)
  const cached = detailCache.get(slug);
  if (cached && Date.now() - cached.t < 60 * 60 * 1000) {
    return cached.data;
  }

  const url = `${BASE}/manga/${slug}`;
  const res = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
    },
    timeout: 15000
  });

  const html = res.data;
  const $ = cheerio.load(html);

  const title = $('h1').text().trim() || slug;
  let coverUrl = realImage($('img[alt="' + title + '"]').attr('src') || $('img').first().attr('src'));

  let chapters: Array<{ slug: string; title: string; chapterNumber: string; releaseDate?: string }> = [];
  let synopsis = '';
  let status = 'ONGOING';
  let type = classifyComic(title, slug).toUpperCase();
  let rating: number | null = null;
  let firstChapterSlug = '';
  let latestChapterSlug = '';

  // EKSTRAKSI DARI PAYLOAD NEXT.JS RSC
  const nextMatches = html.match(/self\.__next_f\.push\(\[1,"(.*?)"\]\)/g);
  if (nextMatches) {
    for (const match of nextMatches) {
      try {
        const unescaped = match.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const fcMatch = unescaped.match(/"firstChapterSlug":"(.*?)"/);
        if (fcMatch) firstChapterSlug = fcMatch[1];
        const lcMatch = unescaped.match(/"latestChapterSlug":"(.*?)"/);
        if (lcMatch) latestChapterSlug = lcMatch[1];
        const statusMatch = unescaped.match(/"status":"(.*?)"/);
        if (statusMatch) status = statusMatch[1].toUpperCase();
        const ratingMatch = unescaped.match(/"initialRating":"(.*?)"/);
        if (ratingMatch) rating = parseFloat(ratingMatch[1]) || null;
      } catch {}
    }
  }

  // EKSTRAKSI DAFTAR CHAPTER SECARA GLOBAL DAN ROBUST
  const seen = new Set<string>();
  const chRegex = /\\?"slug\\?":\\?"([^"\\]+)\\?",\\?"title\\?":\\?"([^"\\]+)\\?",\\?"chapterNumber\\?":\\?"([^"\\]+)\\?"(?:,\\?"releaseDate\\?":\\?"([^"\\]+)\\?")?/g;
  let match;
  while ((match = chRegex.exec(html)) !== null) {
    const chSlug = match[1];
    if (chSlug.includes('chapter') && !seen.has(chSlug)) {
      seen.add(chSlug);
      chapters.push({
        slug: chSlug,
        title: match[2],
        chapterNumber: match[3],
        releaseDate: match[4] || undefined
      });
    }
  }

  // EKSTRAKSI SINOPSIS
  $('p').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 30 && !synopsis) synopsis = t;
  });

  // EKSTRAKSI DAFTAR GENRE
  const genres: string[] = [];
  $('a[href*="genre="]').each((_, el) => {
    const g = $(el).text().trim();
    if (g && !genres.includes(g)) genres.push(g);
  });

  // FALLBACK COVER JIKA DIPERLUKAN
  if (!coverUrl || coverUrl.includes('og-image')) {
    const cachedItem = cache.items.find((i) => i.slug === slug);
    if (cachedItem?.coverUrl) coverUrl = cachedItem.coverUrl;
  }

  if (chapters.length > 0) {
    if (!latestChapterSlug) latestChapterSlug = chapters[0].slug;
    if (!firstChapterSlug) firstChapterSlug = chapters[chapters.length - 1].slug;
  }

  const result: MangaDetail = {
    title,
    slug,
    coverUrl,
    rating,
    status,
    type,
    synopsis: synopsis || 'Tidak ada sinopsis tersedia untuk judul ini.',
    genres,
    totalChapters: chapters.length,
    firstChapterSlug,
    latestChapterSlug,
    chapters
  };

  // SIMPAN HASIL KE CACHE DETAIL MEMORI
  detailCache.set(slug, { t: Date.now(), data: result });
  return result;
}

export interface ChapterDetail {
  mangaTitle: string;
  chapterTitle: string;
  chapterSlug: string;
  mangaSlug: string;
  images: string[];
  prevChapterSlug?: string | null;
  nextChapterSlug?: string | null;
}

export async function scrapeChapter(chapterSlug: string): Promise<ChapterDetail> {
  // PERIKSA CACHE MEMORI CHAPTER TERLEBIH DAHULU (TTL 2 JAM)
  const cached = chapterCache.get(chapterSlug);
  if (cached && Date.now() - cached.t < 2 * 60 * 60 * 1000) {
    return cached.data;
  }

  const url = `${BASE}/read/${chapterSlug}`;
  const res = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
    },
    timeout: 20000
  });

  const html = res.data;
  let images: string[] = [];
  let mangaTitle = '';
  let chapterTitle = '';
  let mangaSlug = '';

  const nextMatches = html.match(/self\.__next_f\.push\(\[1,"(.*?)"\]\)/g);
  if (nextMatches) {
    for (const match of nextMatches) {
      try {
        const unescaped = match.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const imgMatch = unescaped.match(/"images":(\[.*?\])/);
        if (imgMatch && imgMatch[1]) {
          const parsed = JSON.parse(imgMatch[1]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            images = parsed;
          }
        }
        const mTitleMatch = unescaped.match(/"mangaTitle":"(.*?)"/);
        if (mTitleMatch) mangaTitle = mTitleMatch[1];
        const chTitleMatch = unescaped.match(/"chapterTitle":"(.*?)"/);
        if (chTitleMatch) chapterTitle = chTitleMatch[1];
        const mSlugMatch = unescaped.match(/"mangaSlug":"(.*?)"/);
        if (mSlugMatch) mangaSlug = mSlugMatch[1];
      } catch {}
    }
  }

  // CARI CHAPTER SEBELUMNYA DAN BERIKUTNYA DARI DETAIL
  let prevChapterSlug: string | null = null;
  let nextChapterSlug: string | null = null;

  if (mangaSlug) {
    try {
      const detail = await scrapeDetail(mangaSlug);
      const chList = detail.chapters;
      const curIdx = chList.findIndex((c) => c.slug === chapterSlug);
      if (curIdx !== -1) {
        if (curIdx > 0) {
          nextChapterSlug = chList[curIdx - 1].slug;
        }
        if (curIdx < chList.length - 1) {
          prevChapterSlug = chList[curIdx + 1].slug;
        }
      }
    } catch {}
  }

  const result: ChapterDetail = {
    mangaTitle: mangaTitle || chapterSlug,
    chapterTitle: chapterTitle || chapterSlug,
    chapterSlug,
    mangaSlug,
    images,
    prevChapterSlug,
    nextChapterSlug
  };

  chapterCache.set(chapterSlug, { t: Date.now(), data: result });
  return result;
}

// PEMANASAN CACHE DI LATAR BELAKANG JIKA KOSONG
if (cache.items.length === 0) {
  setTimeout(() => {
    buildCache(false).catch((e) => {
      console.warn('Initial warming error:', e.message);
    });
  }, 500);
}
