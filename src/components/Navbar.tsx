import React from 'react';
import { BookOpen, Bookmark, History, RefreshCw } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  bookmarksCount: number;
  historyCount: number;
  totalComics: number;
  isBuilding: boolean;
  onRefreshCache: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  bookmarksCount,
  historyCount,
  totalComics,
  isBuilding,
  onRefreshCache
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0B101B] border-b border-[#1D293D] select-none">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* BRAND DANSKOMIK - KIRI */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab('catalog')}
              className="flex items-center gap-2 text-left group cursor-pointer"
            >
              <div className="w-8 h-8 bg-[#111928] border border-[#1D293D] group-hover:border-[#00B8DB] flex items-center justify-center transition-colors">
                <BookOpen className="w-4 h-4 text-[#00B8DB]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-[#F1F5F9] group-hover:text-[#00B8DB] transition-colors leading-none">
                  DANSKOMIK
                </span>
                <span className="hidden sm:inline-block h-5 px-1.5 bg-[#111928] border border-[#1D293D] text-[#00B8DB] text-[10px] font-bold uppercase tracking-wider">
                  READER
                </span>
              </div>
            </button>
          </div>

          {/* NAVIGASI UTAMA - TENGAH (MANGA JEPANG, MANHWA KOREA, MANHUA CHINA TERPISAH AKURAT) */}
          <nav className="hidden md:flex items-center gap-1.5">
            {[
              { id: 'catalog', label: 'SEMUA' },
              { id: 'manga', label: 'MANGA (JEPANG)' },
              { id: 'manhwa', label: 'MANHWA (KOREA)' },
              { id: 'manhua', label: 'MANHUA (CHINA)' }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-8 px-3 text-xs font-bold uppercase tracking-wider transition-colors border cursor-pointer ${
                    isActive
                      ? 'bg-[#00B8DB] border-[#00B8DB] text-[#020618]'
                      : 'bg-[#111928] border-[#1D293D] text-[#CAD5E2] hover:text-[#F1F5F9] hover:border-[#CAD5E2]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}

            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`h-8 px-3.5 text-xs font-bold uppercase tracking-wider transition-colors border flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'bookmarks'
                  ? 'bg-[#FBBF24] border-[#FBBF24] text-[#020618]'
                  : 'bg-[#111928] border-[#1D293D] text-[#CAD5E2] hover:text-[#F1F5F9] hover:border-[#CAD5E2]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>FAVORIT</span>
              <span className="text-[10px] tabular-nums font-semibold">({bookmarksCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`h-8 px-3.5 text-xs font-bold uppercase tracking-wider transition-colors border flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#00B8DB] border-[#00B8DB] text-[#020618]'
                  : 'bg-[#111928] border-[#1D293D] text-[#CAD5E2] hover:text-[#F1F5F9] hover:border-[#CAD5E2]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>RIWAYAT</span>
              <span className="text-[10px] tabular-nums font-semibold">({historyCount})</span>
            </button>
          </nav>

          {/* KONTROL AKSI KANAN */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 h-8 px-2.5 bg-[#111928] border border-[#1D293D] text-[11px] text-[#CAD5E2]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="tabular-nums font-semibold text-[#F1F5F9] hidden sm:inline">
                {totalComics > 0 ? `${totalComics} JUDUL` : 'SIAP'}
              </span>
            </div>

            <button
              onClick={onRefreshCache}
              disabled={isBuilding}
              title="Perbarui daftar komik"
              className="h-8 px-3 bg-[#008B9E] hover:bg-[#009CB0] active:scale-[0.98] disabled:opacity-50 text-[#020618] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBuilding ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">SINKRON</span>
            </button>
          </div>
        </div>

        {/* BARIS NAVIGASI MOBILE (HORIZONTAL SCROLL, SIMETRIS, LENGKAP DENGAN MANGA) */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-[#1D293D] gap-1 overflow-x-auto text-xs">
          {[
            { id: 'catalog', label: 'SEMUA' },
            { id: 'manga', label: 'MANGA' },
            { id: 'manhwa', label: 'MANHWA' },
            { id: 'manhua', label: 'MANHUA' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-7 px-2.5 text-[11px] font-bold uppercase whitespace-nowrap border cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#00B8DB] border-[#00B8DB] text-[#020618]'
                  : 'bg-[#111928] border-[#1D293D] text-[#CAD5E2]'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`h-7 px-2.5 text-[11px] font-bold uppercase whitespace-nowrap border flex items-center gap-1 cursor-pointer ${
              activeTab === 'bookmarks'
                ? 'bg-[#FBBF24] border-[#FBBF24] text-[#020618]'
                : 'bg-[#111928] border-[#1D293D] text-[#CAD5E2]'
            }`}
          >
            <Bookmark className="w-3 h-3" />
            <span>FAVORIT ({bookmarksCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`h-7 px-2.5 text-[11px] font-bold uppercase whitespace-nowrap border flex items-center gap-1 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#00B8DB] border-[#00B8DB] text-[#020618]'
                : 'bg-[#111928] border-[#1D293D] text-[#CAD5E2]'
            }`}
          >
            <History className="w-3 h-3" />
            <span>RIWAYAT ({historyCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
