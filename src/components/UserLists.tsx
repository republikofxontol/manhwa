import React from 'react';
import { Bookmark, History, Trash2, BookOpen, ExternalLink, Clock } from 'lucide-react';
import { BookmarkItem, HistoryItem, ComicItem } from '../types';
import { formatTimeAgo, getProxiedImageUrl } from '../utils/helpers';

interface UserListsProps {
  type: 'bookmarks' | 'history';
  bookmarks: BookmarkItem[];
  history: HistoryItem[];
  onSelectComic: (comic: ComicItem) => void;
  onReadChapter: (chapterSlug: string, mangaTitle: string, mangaSlug: string) => void;
  onRemoveBookmark: (slug: string) => void;
  onClearHistory: () => void;
}

export const UserLists: React.FC<UserListsProps> = ({
  type,
  bookmarks,
  history,
  onSelectComic,
  onReadChapter,
  onRemoveBookmark,
  onClearHistory
}) => {
  if (type === 'bookmarks') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1D293D]">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#FBBF24]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
              KOMIK FAVORIT ({bookmarks.length})
            </h2>
          </div>
          <span className="text-[11px] text-[#64748B] font-mono">
            Tersimpan di perangkat lokal
          </span>
        </div>

        {bookmarks.length === 0 ? (
          <div className="bg-[#111928] border border-[#1D293D] p-12 text-center space-y-3">
            <Bookmark className="w-8 h-8 text-[#64748B] mx-auto opacity-40" />
            <p className="text-xs text-[#CAD5E2] font-mono">
              Belum ada komik favorit yang ditandai.
            </p>
            <p className="text-[11px] text-[#64748B]">
              Klik tombol bookmark pada komik mana saja untuk menyimpannya di sini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
            {bookmarks.map((b) => (
              <div
                key={b.slug}
                className="bg-[#111928] border border-[#1D293D] hover:border-[#00B8DB] transition-colors flex flex-col group select-none overflow-hidden"
              >
                <div
                  onClick={() =>
                    onSelectComic({
                      title: b.title,
                      slug: b.slug,
                      url: '',
                      coverUrl: b.coverUrl,
                      rating: b.rating,
                      latestChapter: b.latestChapter,
                      type: b.type
                    })
                  }
                  className="aspect-[3/4] bg-[#0B101B] overflow-hidden relative cursor-pointer"
                >
                  {b.coverUrl ? (
                    <img
                      src={getProxiedImageUrl(b.coverUrl)}
                      alt={b.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#64748B]">
                      <BookOpen className="w-6 h-6 opacity-40" />
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBookmark(b.slug);
                    }}
                    title="Hapus bookmark"
                    className="absolute top-2 right-2 h-6 w-6 bg-[#0B101B]/95 border border-[#1D293D] hover:border-rose-400 text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 flex flex-col justify-between flex-1 gap-2 bg-[#111928]">
                  <h3
                    onClick={() =>
                      onSelectComic({
                        title: b.title,
                        slug: b.slug,
                        url: '',
                        coverUrl: b.coverUrl,
                        rating: b.rating,
                        latestChapter: b.latestChapter,
                        type: b.type
                      })
                    }
                    className="text-xs font-semibold text-[#F1F5F9] group-hover:text-[#00B8DB] line-clamp-2 h-8 leading-snug cursor-pointer transition-colors"
                  >
                    {b.title}
                  </h3>

                  <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-2 border-t border-[#1D293D]">
                    <span className="uppercase text-[#00B8DB] font-bold">{b.type}</span>
                    <span>{b.latestChapter ? `Ch. ${b.latestChapter}` : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#1D293D]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#00B8DB]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
            RIWAYAT MEMBACA ({history.length})
          </h2>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="h-8 px-3 bg-[#0B101B] border border-[#1D293D] hover:border-rose-400 text-rose-400 text-[11px] font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>HAPUS RIWAYAT</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-[#111928] border border-[#1D293D] p-12 text-center space-y-3">
          <History className="w-8 h-8 text-[#64748B] mx-auto opacity-40" />
          <p className="text-xs text-[#CAD5E2] font-mono">
            Belum ada riwayat membaca.
          </p>
          <p className="text-[11px] text-[#64748B]">
            Buka komik dan baca chapter, progress akan tersimpan di sini secara otomatis.
          </p>
        </div>
      ) : (
        <div className="bg-[#111928] border border-[#1D293D] divide-y divide-[#1D293D]">
          {history.map((h, idx) => (
            <div
              key={`${h.mangaSlug}-${idx}`}
              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#172033] transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#0B101B] border border-[#1D293D] flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-[#00B8DB]" />
                </div>
                <div>
                  <h3
                    onClick={() =>
                      onSelectComic({
                        title: h.mangaTitle,
                        slug: h.mangaSlug,
                        url: '',
                        coverUrl: h.coverUrl,
                        rating: null,
                        latestChapter: '',
                        type: 'manhwa'
                      })
                    }
                    className="text-xs font-bold text-[#F1F5F9] hover:text-[#00B8DB] cursor-pointer transition-colors"
                  >
                    {h.mangaTitle}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64748B] font-mono">
                    <span className="text-[#00B8DB] font-semibold">{h.chapterTitle}</span>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(h.readAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => onReadChapter(h.chapterSlug, h.mangaTitle, h.mangaSlug)}
                  className="h-8 px-4 bg-[#008B9E] hover:bg-[#009CB0] active:scale-[0.98] text-[#020618] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>LANJUT BACA</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
