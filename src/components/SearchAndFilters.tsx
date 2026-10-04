import React from 'react';
import { Search, X, ArrowUpDown } from 'lucide-react';

interface SearchAndFiltersProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  onSearchSubmit
}) => {
  return (
    <div className="bg-[#111928] border border-[#1D293D] p-3 sm:p-4">
      {/* HANYA SEARCH BAR DAN KONTROL SORTING RATING TERTINGGI (KETINGGIAN TEPAT H-11 SIMETRIS) */}
      <form onSubmit={onSearchSubmit} className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
        {/* KOTAK INPUT PENCARIAN */}
        <div className="relative flex-1 w-full">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748B]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="CARI JUDUL KOMIK..."
            className="w-full h-11 pl-10 pr-10 bg-[#0B101B] border border-[#1D293D] focus:border-[#00B8DB] text-xs text-[#F1F5F9] placeholder-[#64748B] outline-none font-mono tracking-wide transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-[#CAD5E2] hover:text-[#F1F5F9] hover:bg-[#172033] flex items-center justify-center transition-colors cursor-pointer"
              title="Hapus kata kunci"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* TOMBOL AKSI CARI (TEPAT H-11) */}
        <button
          type="submit"
          className="w-full sm:w-auto h-11 px-6 bg-[#008B9E] hover:bg-[#009CB0] active:scale-[0.98] text-[#020618] text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          CARI
        </button>

        {/* SELECTOR URUTAN RATING TERTINGGI (TEPAT H-11, SIMETRIS) */}
        <div className="relative w-full sm:w-auto shrink-0 flex items-center">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#00B8DB]">
            <ArrowUpDown className="w-3.5 h-3.5" />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-auto h-11 pl-8 pr-8 bg-[#0B101B] border border-[#1D293D] focus:border-[#00B8DB] text-xs font-bold text-[#CAD5E2] outline-none font-mono cursor-pointer uppercase tracking-wider"
          >
            <option value="rating">RATING TERTINGGI</option>
            <option value="latest">CHAPTER TERBARU</option>
            <option value="title">JUDUL (A - Z)</option>
          </select>
        </div>
      </form>
    </div>
  );
};
