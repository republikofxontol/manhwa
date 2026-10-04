import React, { useState } from 'react';
import { Star, BookOpen, Bookmark, Layers } from 'lucide-react';
import { ComicItem } from '../types';
import { getProxiedImageUrl } from '../utils/helpers';

interface MangaCardProps {
  comic: ComicItem;
  onSelect: (comic: ComicItem) => void;
  isBookmarked: boolean;
  onToggleBookmark: (comic: ComicItem) => void;
}

export const MangaCard: React.FC<MangaCardProps> = ({
  comic,
  onSelect,
  isBookmarked,
  onToggleBookmark
}) => {
  const [imgError, setImgError] = useState(false);
  const imageUrl = getProxiedImageUrl(comic.coverUrl);
  const typeKey = (comic.type || 'manhwa').toLowerCase();
  const typeLabel =
    typeKey === 'manga' ? 'MANGA · JP' : typeKey === 'manhua' ? 'MANHUA · CN' : 'MANHWA · KR';

  return (
    <div className="bg-[#111928] border border-[#1D293D] hover:border-[#00B8DB] transition-colors flex flex-col group select-none overflow-hidden">
      {/* KONTAINER GAMBAR COVER */}
      <div
        onClick={() => onSelect(comic)}
        className="relative aspect-[3/4] w-full overflow-hidden bg-[#0B101B] cursor-pointer"
      >
        {!imgError && imageUrl ? (
          <img
            src={imageUrl}
            alt={comic.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-b from-[#111928] to-[#0B101B] text-[#64748B] text-center">
            <BookOpen className="w-6 h-6 text-[#00B8DB] mb-2 opacity-50" />
            <span className="text-[10px] font-bold line-clamp-2 text-[#CAD5E2]">
              {comic.title}
            </span>
          </div>
        )}

        {/* GRADASI BAYANGAN LATAR */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B101B] via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity pointer-events-none" />

        {/* LENCANA ATAS: TIPE & BOOKMARK */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
          <span className="h-5 px-1.5 bg-[#0B101B]/90 border border-[#1D293D] text-[#00B8DB] text-[9px] font-bold uppercase tracking-wider flex items-center">
            {typeLabel}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(comic);
            }}
            title={isBookmarked ? 'Hapus bookmark' : 'Bookmark komik'}
            className={`pointer-events-auto h-6 w-6 flex items-center justify-center border transition-colors cursor-pointer ${
              isBookmarked
                ? 'bg-[#FBBF24] border-[#FBBF24] text-[#020618]'
                : 'bg-[#0B101B]/90 border-[#1D293D] text-[#CAD5E2] hover:text-[#00B8DB] hover:border-[#00B8DB]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* LENCANA BAWAH: RATING */}
        {comic.rating && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-[#0B101B]/90 border border-[#1D293D] px-1.5 py-0.5 text-[10px] font-bold text-[#F1F5F9] z-10 tabular-nums">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>{comic.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* BAGIAN INFORMASI KARTU (KETINGGIAN TEPAT SERAGAM) */}
      <div className="p-3 flex flex-col justify-between flex-1 gap-2 bg-[#111928]">
        <div onClick={() => onSelect(comic)} className="cursor-pointer">
          <h3
            title={comic.title}
            className="text-xs font-semibold text-[#F1F5F9] group-hover:text-[#00B8DB] line-clamp-2 h-8 leading-snug transition-colors"
          >
            {comic.title}
          </h3>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#CAD5E2] pt-2 border-t border-[#1D293D]">
          <div className="flex items-center gap-1 text-[#00B8DB] font-medium truncate">
            <Layers className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {comic.latestChapter ? `Ch. ${comic.latestChapter}` : 'Detail'}
            </span>
          </div>

          <button
            onClick={() => onSelect(comic)}
            className="h-6 px-2.5 bg-[#0B101B] border border-[#1D293D] group-hover:border-[#00B8DB] text-[10px] font-bold uppercase text-[#CAD5E2] group-hover:text-[#00B8DB] transition-colors cursor-pointer"
          >
            BACA
          </button>
        </div>
      </div>
    </div>
  );
};
