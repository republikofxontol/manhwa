import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SearchAndFilters } from './components/SearchAndFilters';
import { MangaCard } from './components/MangaCard';
import { MangaDetailModal } from './components/MangaDetailModal';
import { MangaReader } from './components/MangaReader';
import { UserLists } from './components/UserLists';
import { Footer } from './components/Footer';
import { ComicItem, CacheStats, BookmarkItem, HistoryItem } from './types';
import { getBookmarks, getHistory, toggleBookmark, clearHistory } from './utils/helpers';
import { Loader2, ChevronLeft, ChevronRight, RefreshCw, BookOpen } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'manga' | 'manhwa' | 'manhua' | 'bookmarks' | 'history'>('catalog');
  const [comics, setComics] = useState<ComicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [selectedType, setSelectedType] = useState('all');

  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);

  const [selectedComic, setSelectedComic] = useState<ComicItem | null>(null);
  const [readingChapter, setReadingChapter] = useState<{
    chapterSlug: string;
    mangaTitle: string;
    mangaSlug: string;
  } | null>(null);

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const reloadUserData = useCallback(() => {
    setBookmarks(getBookmarks());
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    reloadUserData();
  }, [reloadUserData]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/manga/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setStats(data);
          setIsBuilding(data.isBuilding);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleTabChange = (tab: string) => {
    if (tab === 'catalog') {
      setActiveTab('catalog');
      setSelectedType('all');
    } else if (tab === 'manga' || tab === 'manhwa' || tab === 'manhua') {
      setActiveTab(tab as 'manga' | 'manhwa' | 'manhua');
      setSelectedType(tab);
    } else if (tab === 'bookmarks' || tab === 'history') {
      setActiveTab(tab as 'bookmarks' | 'history');
    }
    setPage(1);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    if (type === 'all') setActiveTab('catalog');
    else if (type === 'manga' || type === 'manhwa' || type === 'manhua') {
      setActiveTab(type as 'manga' | 'manhwa' | 'manhua');
    }
    setPage(1);
  };

  const fetchComics = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '24',
        type: selectedType,
        sort: sortBy,
        q: activeQuery
      });

      const res = await fetch(`/api/manga/list?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal memuat komik');

      const data = await res.json();
      if (data.status) {
        setComics(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (e) {
      console.error('Fetch comics failed:', e);
    } finally {
      setLoading(false);
    }
  }, [page, selectedType, sortBy, activeQuery]);

  useEffect(() => {
    if (activeTab !== 'bookmarks' && activeTab !== 'history') {
      fetchComics();
    }
  }, [fetchComics, activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchQuery.trim());
    setPage(1);
  };

  const handleRefreshCache = async () => {
    setIsBuilding(true);
    try {
      const res = await fetch('/api/manga/refresh');
      const data = await res.json();
      if (data.status) {
        await fetchStats();
        await fetchComics();
      }
    } catch (e) {
      console.error('Refresh cache failed:', e);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleToggleBookmark = (comic: ComicItem) => {
    toggleBookmark({
      slug: comic.slug,
      title: comic.title,
      coverUrl: comic.coverUrl,
      type: comic.type,
      latestChapter: comic.latestChapter,
      rating: comic.rating
    });
    reloadUserData();
  };

  const handleReadChapter = (chapterSlug: string, mangaTitle: string, mangaSlug: string) => {
    setSelectedComic(null);
    setReadingChapter({
      chapterSlug,
      mangaTitle,
      mangaSlug
    });
  };

  const lastReadForSelected = selectedComic
    ? history.find((h) => h.mangaSlug === selectedComic.slug)?.chapterSlug
    : null;

  return (
    <div className="min-h-screen bg-[#0B101B] text-[#F1F5F9] flex flex-col font-mono selection:bg-[#00B8DB] selection:text-[#020618]">
      {/* NAVBAR SIMETRIS */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        bookmarksCount={bookmarks.length}
        historyCount={history.length}
        totalComics={stats?.total || totalCount}
        isBuilding={isBuilding}
        onRefreshCache={handleRefreshCache}
      />

      {/* AREA KONTEN UTAMA */}
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 flex-1">
        {/* FULLSCREEN MANGA READER */}
        {readingChapter && (
          <MangaReader
            chapterSlug={readingChapter.chapterSlug}
            mangaTitle={readingChapter.mangaTitle}
            mangaSlug={readingChapter.mangaSlug}
            onClose={() => {
              setReadingChapter(null);
              reloadUserData();
            }}
            onNavigateChapter={(newChapterSlug) => {
              setReadingChapter({
                chapterSlug: newChapterSlug,
                mangaTitle: readingChapter.mangaTitle,
                mangaSlug: readingChapter.mangaSlug
              });
              reloadUserData();
            }}
          />
        )}

        {/* MODAL DETAIL KOMIK DENGAN BACA, UNDUH ZIP, DAN BOOKMARK */}
        {selectedComic && (
          <MangaDetailModal
            slug={selectedComic.slug}
            initialComic={selectedComic}
            isOpen={true}
            onClose={() => setSelectedComic(null)}
            onReadChapter={handleReadChapter}
            isBookmarked={bookmarks.some((b) => b.slug === selectedComic.slug)}
            onToggleBookmark={handleToggleBookmark}
            lastReadChapterSlug={lastReadForSelected}
          />
        )}

        {/* PENGALIH TAMPILAN: FAVORIT, RIWAYAT, ATAU KATALOG */}
        {activeTab === 'bookmarks' ? (
          <UserLists
            type="bookmarks"
            bookmarks={bookmarks}
            history={history}
            onSelectComic={(comic) => setSelectedComic(comic)}
            onReadChapter={handleReadChapter}
            onRemoveBookmark={(slug) => {
              toggleBookmark({
                slug,
                title: '',
                coverUrl: '',
                type: '',
                latestChapter: '',
                rating: null
              });
              reloadUserData();
            }}
            onClearHistory={() => {}}
          />
        ) : activeTab === 'history' ? (
          <UserLists
            type="history"
            bookmarks={bookmarks}
            history={history}
            onSelectComic={(comic) => setSelectedComic(comic)}
            onReadChapter={handleReadChapter}
            onRemoveBookmark={() => {}}
            onClearHistory={() => {
              clearHistory();
              reloadUserData();
            }}
          />
        ) : (
          <>
            {/* PENCARIAN DAN URUTAN (BERSIH, SIMETRIS, TANPA ELEMEN BERLEBIHAN) */}
            <SearchAndFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={(s) => {
                setSortBy(s);
                setPage(1);
              }}
              onSearchSubmit={handleSearchSubmit}
            />

            {/* SPANDUK FILTER PENCARIAN AKTIF */}
            {activeQuery && (
              <div className="flex items-center justify-between px-3.5 py-2 bg-[#111928] border border-[#1D293D] text-xs">
                <span className="text-[#CAD5E2]">
                  Pencarian: <strong className="text-[#00B8DB]">"{activeQuery}"</strong>
                </span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveQuery('');
                    setPage(1);
                  }}
                  className="text-[11px] text-[#00B8DB] hover:underline uppercase font-bold cursor-pointer"
                >
                  [ HAPUS FILTER ]
                </button>
              </div>
            )}

            {/* GRID KOMIK SIMETRIS */}
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center text-[#CAD5E2]">
                <Loader2 className="w-8 h-8 text-[#00B8DB] animate-spin mb-3" />
                <p className="text-xs font-mono uppercase">MEMUAT KOLEKSI KOMIK...</p>
              </div>
            ) : comics.length === 0 ? (
              <div className="bg-[#111928] border border-[#1D293D] p-12 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-[#64748B] mx-auto opacity-50" />
                <h3 className="text-sm font-bold text-[#F1F5F9] uppercase tracking-wider">
                  TIDAK ADA KOMIK
                </h3>
                <p className="text-xs text-[#CAD5E2] font-mono max-w-md mx-auto">
                  {activeQuery
                    ? `Tidak ada komik yang cocok dengan "${activeQuery}".`
                    : 'Cache belum terisi.'}
                </p>
                <button
                  onClick={handleRefreshCache}
                  disabled={isBuilding}
                  className="h-10 px-4 bg-[#008B9E] text-[#020618] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isBuilding ? 'animate-spin' : ''}`} />
                  <span>SINKRONISASI</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
                {comics.map((comic) => (
                  <MangaCard
                    key={comic.slug}
                    comic={comic}
                    onSelect={(c) => setSelectedComic(c)}
                    isBookmarked={bookmarks.some((b) => b.slug === comic.slug)}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </div>
            )}

            {/* KONTROL PAGINASI SIMETRIS */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[#1D293D] text-xs font-mono">
                <button
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
                  }}
                  disabled={page <= 1 || loading}
                  className="h-11 px-5 bg-[#111928] border border-[#1D293D] hover:border-[#00B8DB] disabled:opacity-40 disabled:pointer-events-none text-[#CAD5E2] hover:text-[#00B8DB] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>SEBELUMNYA</span>
                </button>

                <div className="flex items-center gap-2 text-xs text-[#CAD5E2]">
                  <span className="text-[#64748B] hidden sm:inline">HALAMAN</span>
                  <span className="h-8 px-3 bg-[#0B101B] border border-[#1D293D] flex items-center justify-center font-bold text-[#00B8DB] tabular-nums">
                    {page}
                  </span>
                  <span className="text-[#64748B]">/</span>
                  <span className="h-8 px-3 bg-[#0B101B] border border-[#1D293D] flex items-center justify-center font-bold text-[#CAD5E2] tabular-nums">
                    {totalPages}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
                  }}
                  disabled={page >= totalPages || loading}
                  className="h-11 px-5 bg-[#111928] border border-[#1D293D] hover:border-[#00B8DB] disabled:opacity-40 disabled:pointer-events-none text-[#CAD5E2] hover:text-[#00B8DB] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>SELANJUTNYA</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* FOOTER SIMETRIS */}
      <Footer
        totalComics={stats?.total || totalCount}
      />
    </div>
  );
}
