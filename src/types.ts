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

export interface ChapterDetail {
  mangaTitle: string;
  chapterTitle: string;
  chapterSlug: string;
  mangaSlug: string;
  images: string[];
  prevChapterSlug?: string | null;
  nextChapterSlug?: string | null;
}

export interface LogEntry {
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
}

export interface CacheStats {
  total: number;
  lastUpdated: string | null;
  isBuilding: boolean;
  breakdown: {
    manga: number;
    manhwa: number;
    manhua: number;
  };
  logs: LogEntry[];
}

export interface BookmarkItem {
  slug: string;
  title: string;
  coverUrl: string;
  type: string;
  latestChapter: string;
  rating: number | null;
  addedAt: string;
}

export interface HistoryItem {
  mangaSlug: string;
  mangaTitle: string;
  chapterSlug: string;
  chapterTitle: string;
  coverUrl: string;
  readAt: string;
}
