import { BookmarkItem, HistoryItem } from '../types';

export function getProxiedImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  // JIKA JALUR RELATIF ATAU CDN EKSTERNAL, RUTIKAN LEWAT PROXY UNTUK MENGHINDARI BLOKIR HOTLINK
  if (
    url.startsWith('/api/view/') ||
    url.startsWith('/') ||
    url.includes('manwhaku.my.id') ||
    url.includes('csmcscns.id') ||
    url.includes('cdncid') ||
    url.includes('uploads')
  ) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

const BOOKMARKS_KEY = 'dansmanhwa_bookmarks';
const OLD_BOOKMARKS_KEY = 'dansmanwha_bookmarks';
const HISTORY_KEY = 'dansmanhwa_history';
const OLD_HISTORY_KEY = 'dansmanwha_history';

export function getBookmarks(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY) || localStorage.getItem(OLD_BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookmarks(items: BookmarkItem[]): void {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save bookmarks:', e);
  }
}

export function isBookmarked(slug: string): boolean {
  const bookmarks = getBookmarks();
  return bookmarks.some((b) => b.slug === slug);
}

export function toggleBookmark(item: Omit<BookmarkItem, 'addedAt'>): boolean {
  const bookmarks = getBookmarks();
  const index = bookmarks.findIndex((b) => b.slug === item.slug);
  if (index !== -1) {
    bookmarks.splice(index, 1);
    saveBookmarks(bookmarks);
    return false;
  } else {
    bookmarks.unshift({
      ...item,
      addedAt: new Date().toISOString()
    });
    saveBookmarks(bookmarks);
    return true;
  }
}

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY) || localStorage.getItem(OLD_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(entry: HistoryItem): void {
  try {
    const history = getHistory().filter((h) => h.mangaSlug !== entry.mangaSlug);
    history.unshift(entry);
    // SIMPAN MAKSIMAL 50 RIWAYAT TERAKHIR
    if (history.length > 50) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(OLD_HISTORY_KEY);
  } catch {}
}

export function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return `${diffSec}d lalu`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}j lalu`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}h lalu`;
  } catch {
    return isoString;
  }
}
