import React, { useState, useEffect } from 'react';
import { X, Star, Bookmark, BookOpen, Layers, Search, Download, ChevronRight, Loader2 } from 'lucide-react';
import { MangaDetail, ComicItem } from '../types';
import { getProxiedImageUrl } from '../utils/helpers';

import { downloadChapterAsZip, DownloadProgress } from '../utils/downloader';

interface MangaDetailModalProps {
  slug: string;
  initialComic?: ComicItem | null;
  isOpen: boolean;
  onClose: () => void;
  onReadChapter: (chapterSlug: string, mangaTitle: string, mangaSlug: string) => void;
  isBookmarked: boolean;
  onToggleBookmark: (comic: ComicItem) => void;
  lastReadChapterSlug?: string | null;
}

export const MangaDetailModal: React.FC<MangaDetailModalProps> = ({
  slug,
  initialComic,
  isOpen,
  onClose,
  onReadChapter,
  isBookmarked,
  onToggleBookmark,
  lastReadChapterSlug
}) => {
  const [detail, setDetail] = useState<MangaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapterFilter, setChapterFilter] = useState('');
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [downloadingChapter, setDownloadingChapter] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !slug) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/manga/detail/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Gagal mengambil data dari server');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          if (data.status && data.data) {
            setDetail(data.data);
          } else {
            throw new Error(data.message || 'Detail tidak ditemukan');
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
  }, [isOpen, slug]);

  if (!isOpen) return null;

  const title = detail?.title || initialComic?.title || slug;
  const coverUrl = getProxiedImageUrl(detail?.coverUrl || initialComic?.coverUrl);
  const rawType = (detail?.type || initialComic?.type || 'manhwa').toLowerCase();
  const typeLabel =
    rawType === 'manga' ? 'MANGA (JEPANG)' : rawType === 'manhua' ? 'MANHUA (CHINA)' : 'MANHWA (KOREA)';
  const rating = detail?.rating ?? initialComic?.rating ?? null;

  const allChapters = detail?.chapters || [];
  const filteredChapters = chapterFilter.trim()
    ? allChapters.filter(
        (ch) =>
          ch.title.toLowerCase().includes(chapterFilter.toLowerCase()) ||
          ch.chapterNumber.includes(chapterFilter) ||
          ch.slug.toLowerCase().includes(chapterFilter.toLowerCase())
      )
    : allChapters;

  const firstChapterSlug = detail?.firstChapterSlug || (allChapters.length > 0 ? allChapters[allChapters.length - 1].slug : '');
  const latestChapterSlug = detail?.latestChapterSlug || (allChapters.length > 0 ? allChapters[0].slug : '');

  const [downloadMsg, setDownloadMsg] = useState('');

  const handleDownloadZip = async (targetSlug: string) => {
    if (!targetSlug || downloadingChapter) return;
    setDownloadingChapter(targetSlug);
    setDownloadMsg('Menyiapkan...');

    try {
      await downloadChapterAsZip(targetSlug, (p: DownloadProgress) => {
        setDownloadMsg(p.message);
      });
    } catch (err: unknown) {
      const e = err as Error;
      console.error('Download error:', e);
      // FALLBACK KE TAUTAN LANGSUNG JIKA ZIP CLIENT MENGALAMI KENDALA
      const link = document.createElement('a');
      link.href = `/api/manga/chapter/${encodeURIComponent(targetSlug)}/download`;
      link.download = `${targetSlug}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => {
        setDownloadingChapter(null);
        setDownloadMsg('');
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#020618]/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#111928] border border-[#1D293D] shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden">
        {/* BILAH ATAS MODAL */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0B101B] border-b border-[#1D293D]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#00B8DB]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#CAD5E2]">
              DETAIL KOMIK · {typeLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 bg-[#111928] border border-[#1D293D] text-[#CAD5E2] hover:text-rose-400 hover:border-rose-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ISI BADAN MODAL */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {loading && !detail ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#CAD5E2]">
              <Loader2 className="w-8 h-8 text-[#00B8DB] animate-spin mb-3" />
              <p className="text-xs font-mono uppercase">MEMUAT METADATA KOMIK...</p>
            </div>
          ) : error && !detail ? (
            <div className="p-4 bg-rose-950/40 border border-rose-800 text-[#FDA4AF] text-xs font-mono">
              <p className="font-bold mb-1">GAGAL MEMUAT DETAIL KOMIK</p>
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* PEMBAGIAN KIRI-KANAN SIMETRIS */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                {/* KIRI: SAMPUL */}
                <div className="sm:col-span-4 flex flex-col">
                  <div className="aspect-[3/4] w-full bg-[#0B101B] border border-[#1D293D] overflow-hidden relative shadow-lg">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#64748B]">
                        <BookOpen className="w-8 h-8 opacity-50" />
                      </div>
                    )}
                    {rating && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-[#0B101B]/95 border border-[#1D293D] px-2 py-0.5 text-xs font-bold text-[#F1F5F9] tabular-nums">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>{rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* KANAN: INFORMASI & AKSI UTAMA */}
                <div className="sm:col-span-8 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="h-5 px-2 bg-[#0B101B] border border-[#1D293D] text-[#00B8DB] text-[10px] font-bold uppercase tracking-wider flex items-center">
                        {typeLabel}
                      </span>
                      <span className="h-5 px-2 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center">
                        {detail?.status || 'ONGOING'}
                      </span>
                      {allChapters.length > 0 && (
                        <span className="h-5 px-2 bg-[#0B101B] border border-[#1D293D] text-[#CAD5E2] text-[10px] font-mono tracking-wider flex items-center">
                          {allChapters.length} CHAPTER
                        </span>
                      )}
                    </div>

                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] leading-tight">
                      {title}
                    </h1>

                    {/* DAFTAR GENRE */}
                    {detail?.genres && detail.genres.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {detail.genres.map((g) => (
                          <span
                            key={g}
                            className="h-6 px-2 bg-[#0B101B] border border-[#1D293D] text-[10px] font-mono text-[#CAD5E2] flex items-center uppercase"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* KOTAK SINOPSIS */}
                  <div className="bg-[#0B101B] border border-[#1D293D] p-3 text-xs leading-relaxed text-[#CAD5E2]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1 tracking-wider">
                      SINOPSIS
                    </div>
                    <p className={showFullSynopsis ? '' : 'line-clamp-3'}>
                      {detail?.synopsis || 'Tidak ada deskripsi tersedia.'}
                    </p>
                    {detail?.synopsis && detail.synopsis.length > 150 && (
                      <button
                        onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                        className="text-[11px] text-[#00B8DB] hover:underline mt-1 font-bold inline-block cursor-pointer"
                      >
                        {showFullSynopsis ? 'LEBIH SEDIKIT ▲' : 'SELENGKAPNYA ▼'}
                      </button>
                    )}
                  </div>

                  {/* AKSI UTAMA SIMETRIS (H-12) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {/* AKSI BACA */}
                    <button
                      onClick={() =>
                        onReadChapter(
                          lastReadChapterSlug || firstChapterSlug || latestChapterSlug,
                          title,
                          slug
                        )
                      }
                      className="h-12 px-4 bg-[#008B9E] hover:bg-[#009CB0] active:scale-[0.98] text-[#020618] font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>{lastReadChapterSlug ? 'LANJUT BACA' : 'BACA SEKARANG'}</span>
                    </button>

                    {/* UNDUH ZIP TERBARU */}
                    <button
                      onClick={() => handleDownloadZip(latestChapterSlug || firstChapterSlug)}
                      disabled={!latestChapterSlug || !!downloadingChapter}
                      className="h-12 px-4 bg-[#0B101B] border border-[#1D293D] hover:border-[#00B8DB] text-[#CAD5E2] hover:text-[#00B8DB] font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {downloadingChapter === (latestChapterSlug || firstChapterSlug) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#00B8DB]" />
                          <span className="text-[#00B8DB]">{downloadMsg || 'MENGUNDUH...'}</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-[#00B8DB]" />
                          <span>UNDUH ZIP TERBARU</span>
                        </>
                      )}
                    </button>

                    {/* SIMPAN BOOKMARK */}
                    <button
                      onClick={() => {
                        if (initialComic) {
                          onToggleBookmark(initialComic);
                        } else if (detail) {
                          onToggleBookmark({
                            title: detail.title,
                            slug: detail.slug,
                            url: '',
                            coverUrl: detail.coverUrl,
                            rating: detail.rating,
                            latestChapter: allChapters[0]?.chapterNumber || '',
                            type: detail.type.toLowerCase()
                          });
                        }
                      }}
                      className={`h-12 px-4 border font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                        isBookmarked
                          ? 'bg-[#FBBF24] border-[#FBBF24] text-[#020618]'
                          : 'bg-[#0B101B] border-[#1D293D] text-[#CAD5E2] hover:border-[#00B8DB] hover:text-[#00B8DB]'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                      <span>{isBookmarked ? 'TERSIMPAN' : 'BOOKMARK'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* BAGIAN DAFTAR CHAPTER */}
              <div className="space-y-3 pt-4 border-t border-[#1D293D]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#00B8DB]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
                      PILIH CHAPTER ({allChapters.length})
                    </h3>
                  </div>

                  {/* FILTER PENCARIAN CHAPTER (TEPAT H-8) */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      type="text"
                      value={chapterFilter}
                      onChange={(e) => setChapterFilter(e.target.value)}
                      placeholder="Cari chapter (misal: 10)..."
                      className="w-full h-8 pl-8 pr-3 bg-[#0B101B] border border-[#1D293D] focus:border-[#00B8DB] text-xs text-[#F1F5F9] outline-none font-mono"
                    />
                  </div>
                </div>

                {/* TABEL BARIS CHAPTER SIMETRIS */}
                <div className="bg-[#0B101B] border border-[#1D293D] max-h-80 overflow-y-auto divide-y divide-[#1D293D]">
                  {filteredChapters.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#64748B] font-mono">
                      Tidak ada chapter yang cocok.
                    </div>
                  ) : (
                    filteredChapters.map((ch) => {
                      const isLastRead = lastReadChapterSlug === ch.slug;
                      const isDownloadingThis = downloadingChapter === ch.slug;

                      return (
                        <div
                          key={ch.slug}
                          className={`flex items-center justify-between px-3.5 py-2 hover:bg-[#172033] transition-colors group ${
                            isLastRead ? 'bg-[#00B8DB]/10 border-l-2 border-l-[#00B8DB]' : ''
                          }`}
                        >
                          <div
                            onClick={() => onReadChapter(ch.slug, title, slug)}
                            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                          >
                            <span className="text-xs font-medium text-[#F1F5F9] group-hover:text-[#00B8DB] transition-colors truncate">
                              {ch.title}
                            </span>
                            {isLastRead && (
                              <span className="h-4 px-1.5 bg-[#00B8DB] text-[#020618] text-[9px] font-bold uppercase shrink-0">
                                DIBACA
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* TOMBOL UNDUH ZIP */}
                            <button
                              onClick={() => handleDownloadZip(ch.slug)}
                              disabled={!!downloadingChapter}
                              title="Download Chapter ZIP"
                              className="h-7 px-2.5 bg-[#111928] border border-[#1D293D] hover:border-[#00B8DB] text-[10px] font-bold text-[#CAD5E2] hover:text-[#00B8DB] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {isDownloadingThis ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-[#00B8DB]" />
                                  <span className="text-[#00B8DB] text-[9px] font-mono">{downloadMsg || 'ZIP'}</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3 h-3" />
                                  <span className="hidden sm:inline">ZIP</span>
                                </>
                              )}
                            </button>

                            {/* TOMBOL BACA */}
                            <button
                              onClick={() => onReadChapter(ch.slug, title, slug)}
                              className="h-7 px-3 bg-[#008B9E] hover:bg-[#009CB0] text-[10px] font-bold text-[#020618] uppercase flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>BACA</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
