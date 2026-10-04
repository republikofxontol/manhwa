import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Bookmark,
  RotateCcw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ChapterDetail } from '../types';
import { getProxiedImageUrl, saveHistory, isBookmarked, toggleBookmark } from '../utils/helpers';
import { downloadChapterAsZip, DownloadProgress } from '../utils/downloader';

interface MangaReaderProps {
  chapterSlug: string;
  mangaTitle: string;
  mangaSlug: string;
  onClose: () => void;
  onNavigateChapter: (newChapterSlug: string) => void;
}

export const MangaReader: React.FC<MangaReaderProps> = ({
  chapterSlug,
  mangaTitle,
  mangaSlug,
  onClose,
  onNavigateChapter
}) => {
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widthMode, setWidthMode] = useState<'fit' | 'wide' | 'full'>('fit');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(mangaSlug));
  const [isDownloading, setIsDownloading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setFailedImages({});

    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    fetch(`/api/manga/chapter/${encodeURIComponent(chapterSlug)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Gagal mengambil data chapter');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          if (data.status && data.data) {
            setChapter(data.data);
            saveHistory({
              mangaSlug,
              mangaTitle: data.data.mangaTitle || mangaTitle,
              chapterSlug,
              chapterTitle: data.data.chapterTitle || chapterSlug,
              coverUrl: '',
              readAt: new Date().toISOString()
            });
          } else {
            throw new Error(data.message || 'Gambar chapter tidak ditemukan');
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [chapterSlug, mangaSlug, mangaTitle]);

  // NAVIGASI KEYBOARD & PROGRES SCROLL
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && chapter?.prevChapterSlug) {
        onNavigateChapter(chapter.prevChapterSlug);
      } else if (e.key === 'ArrowRight' && chapter?.nextChapterSlug) {
        onNavigateChapter(chapter.nextChapterSlug);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (totalHeight > 0) {
            const progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
            setScrollProgress(progress);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [chapter, onClose, onNavigateChapter]);

  const [downloadMsg, setDownloadMsg] = useState('');

  const handleDownloadZip = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadMsg('Menyiapkan...');

    try {
      await downloadChapterAsZip(chapterSlug, (p: DownloadProgress) => {
        setDownloadMsg(p.message);
      });
    } catch (err: unknown) {
      const e = err as Error;
      console.error('Download chapter error:', e);
      // FALLBACK TAUTAN LANGSUNG JIKA PERLU
      const link = document.createElement('a');
      link.href = `/api/manga/chapter/${encodeURIComponent(chapterSlug)}/download`;
      link.download = `${chapterSlug}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadMsg('');
      }, 1500);
    }
  };

  const handleToggleBookmark = () => {
    const nextState = toggleBookmark({
      slug: mangaSlug,
      title: mangaTitle,
      coverUrl: '',
      type: 'manhwa',
      latestChapter: '',
      rating: null
    });
    setBookmarked(nextState);
  };

  const handleImageError = (index: number) => {
    setFailedImages((prev) => ({ ...prev, [index]: true }));
  };

  const handleRetryImage = (index: number) => {
    setFailedImages((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  const getMaxWidthClass = () => {
    if (widthMode === 'fit') return 'max-w-3xl';
    if (widthMode === 'wide') return 'max-w-5xl';
    return 'max-w-full';
  };

  return (
    <div className="min-h-screen bg-[#060A12] text-[#F1F5F9] flex flex-col relative z-50 select-none">
      {/* BILAH STICKY PEMBACA (KETINGGIAN H-12) */}
      <header className="sticky top-0 z-50 bg-[#0B101B] border-b border-[#1D293D]">
        {/* BILAH INDIKATOR PROGRES 2PX SIMETRIS */}
        <div className="w-full h-0.5 bg-[#111928]">
          <div
            className="h-full bg-[#00B8DB] transition-all duration-100 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 h-12 flex items-center justify-between gap-3">
          {/* KIRI: KELUAR DAN JUDUL */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onClose}
              className="h-8 px-3 bg-[#111928] border border-[#1D293D] hover:border-[#00B8DB] text-[#CAD5E2] hover:text-[#00B8DB] text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Kembali ke katalog"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">TUTUP</span>
            </button>

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#F1F5F9] truncate leading-tight">
                {mangaTitle}
              </span>
              <span className="text-[10px] text-[#00B8DB] font-mono truncate leading-none mt-0.5">
                {chapter?.chapterTitle || chapterSlug}
              </span>
            </div>
          </div>

          {/* KANAN: AKSI, PILIHAN LEBAR, UNDUH, FAVORIT, NAVIGASI */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* UNDUH CHAPTER ZIP */}
            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              title="Download Seluruh Halaman Chapter (ZIP)"
              className="h-8 px-2.5 bg-[#111928] border border-[#1D293D] hover:border-[#00B8DB] text-[#CAD5E2] hover:text-[#00B8DB] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00B8DB]" />
                  <span className="text-[#00B8DB] text-[10px] font-mono">{downloadMsg || 'ZIP...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-[#00B8DB]" />
                  <span className="hidden md:inline">DOWNLOAD ZIP</span>
                </>
              )}
            </button>

            {/* SIMPAN FAVORIT */}
            <button
              onClick={handleToggleBookmark}
              title={bookmarked ? 'Tersimpan di favorit' : 'Simpan ke favorit'}
              className={`h-8 px-2.5 border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                bookmarked
                  ? 'bg-[#FBBF24] border-[#FBBF24] text-[#020618]'
                  : 'bg-[#111928] border-[#1D293D] text-[#CAD5E2] hover:text-[#00B8DB] hover:border-[#00B8DB]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
              <span className="hidden lg:inline">{bookmarked ? 'FAVORIT' : 'BOOKMARK'}</span>
            </button>

            {/* PRESET LEBAR TAMPILAN */}
            <div className="hidden sm:flex items-center border border-[#1D293D] bg-[#0B101B] p-0.5">
              <button
                onClick={() => setWidthMode('fit')}
                className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  widthMode === 'fit' ? 'bg-[#00B8DB] text-[#020618]' : 'text-[#CAD5E2]'
                }`}
              >
                FIT
              </button>
              <button
                onClick={() => setWidthMode('wide')}
                className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  widthMode === 'wide' ? 'bg-[#00B8DB] text-[#020618]' : 'text-[#CAD5E2]'
                }`}
              >
                LEBAR
              </button>
              <button
                onClick={() => setWidthMode('full')}
                className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  widthMode === 'full' ? 'bg-[#00B8DB] text-[#020618]' : 'text-[#CAD5E2]'
                }`}
              >
                PENUH
              </button>
            </div>

            {/* CHAPTER SEBELUMNYA */}
            <button
              onClick={() => chapter?.prevChapterSlug && onNavigateChapter(chapter.prevChapterSlug)}
              disabled={!chapter?.prevChapterSlug}
              title="Chapter Sebelumnya (Panah Kiri)"
              className="h-8 px-2 bg-[#111928] border border-[#1D293D] disabled:opacity-30 disabled:pointer-events-none hover:border-[#00B8DB] text-[#CAD5E2] hover:text-[#00B8DB] flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* CHAPTER BERIKUTNYA */}
            <button
              onClick={() => chapter?.nextChapterSlug && onNavigateChapter(chapter.nextChapterSlug)}
              disabled={!chapter?.nextChapterSlug}
              title="Chapter Berikutnya (Panah Kanan)"
              className="h-8 px-2.5 bg-[#008B9E] hover:bg-[#009CB0] disabled:opacity-30 disabled:pointer-events-none text-[#020618] text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="hidden sm:inline">LANJUT</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* AREA KONTEN BACAAN (DIOPTIMALKAN UNTUK SCROLLING HALUS) */}
      <main
        ref={containerRef}
        className={`flex-1 w-full mx-auto ${getMaxWidthClass()} px-0 py-2 flex flex-col items-center`}
      >
        {loading ? (
          <div className="py-36 flex flex-col items-center justify-center text-[#CAD5E2]">
            <Loader2 className="w-10 h-10 text-[#00B8DB] animate-spin mb-4" />
            <p className="text-xs font-mono uppercase">MEMUAT GAMBAR CHAPTER...</p>
          </div>
        ) : error ? (
          <div className="py-24 px-4 w-full max-w-md mx-auto text-center space-y-4">
            <div className="p-4 bg-rose-950/40 border border-rose-800 text-[#FDA4AF] text-xs font-mono text-left">
              <div className="flex items-center gap-2 font-bold mb-2">
                <AlertCircle className="w-4 h-4" />
                <span>GAGAL MEMUAT GAMBAR</span>
              </div>
              <p>{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="h-10 px-4 bg-[#008B9E] text-[#020618] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>COBA LAGI</span>
            </button>
          </div>
        ) : chapter && chapter.images.length > 0 ? (
          <div className="w-full flex flex-col items-center shadow-2xl">
            {chapter.images.map((imgSrc, index) => {
              const proxiedSrc = getProxiedImageUrl(imgSrc);
              const isFailed = failedImages[index];

              return (
                <div
                  key={index}
                  className="w-full relative min-h-[350px] flex items-center justify-center bg-[#0B101B]"
                  style={{ contentVisibility: 'auto' }}
                >
                  {isFailed ? (
                    <div className="w-full py-16 flex flex-col items-center justify-center text-center p-4">
                      <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
                      <p className="text-xs text-[#CAD5E2] font-mono mb-2">
                        Halaman {index + 1} gagal dimuat
                      </p>
                      <button
                        onClick={() => handleRetryImage(index)}
                        className="h-8 px-3 bg-[#111928] border border-[#1D293D] hover:border-[#00B8DB] text-xs font-mono text-[#00B8DB] flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Muat Ulang Halaman</span>
                      </button>
                    </div>
                  ) : (
                    <img
                      src={proxiedSrc}
                      alt={`Halaman ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={() => handleImageError(index)}
                      className="w-full h-auto block select-none"
                    />
                  )}

                  {/* LABEL NOMOR HALAMAN SIMETRIS */}
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-[#0B101B]/85 border border-[#1D293D] text-[9px] text-[#64748B] font-mono tabular-nums">
                    {index + 1} / {chapter.images.length}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-32 text-center text-xs text-[#64748B] font-mono">
            Chapter ini tidak memiliki gambar atau masih dalam proses pembaruan.
          </div>
        )}

        {/* NAVIGASI BAWAH SIMETRIS (KETINGGIAN H-12) */}
        {chapter && (
          <div className="w-full py-8 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 border-t border-[#1D293D]">
            <button
              onClick={() => chapter.prevChapterSlug && onNavigateChapter(chapter.prevChapterSlug)}
              disabled={!chapter.prevChapterSlug}
              className="w-full sm:w-auto h-12 px-6 bg-[#111928] border border-[#1D293D] hover:border-[#00B8DB] disabled:opacity-30 disabled:pointer-events-none text-[#CAD5E2] hover:text-[#00B8DB] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>CHAPTER SEBELUMNYA</span>
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="w-full sm:w-auto h-12 px-6 bg-[#111928] border border-[#1D293D] hover:border-[#00B8DB] text-[#00B8DB] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#00B8DB]" />
                  <span>{downloadMsg || 'MENGUNDUH ZIP...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>UNDUH CHAPTER INI (ZIP)</span>
                </>
              )}
            </button>

            <button
              onClick={() => chapter.nextChapterSlug && onNavigateChapter(chapter.nextChapterSlug)}
              disabled={!chapter.nextChapterSlug}
              className="w-full sm:w-auto h-12 px-6 bg-[#008B9E] hover:bg-[#009CB0] disabled:opacity-30 disabled:pointer-events-none text-[#020618] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>CHAPTER BERIKUTNYA</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
