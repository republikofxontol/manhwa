import React from 'react';

interface FooterProps {
  totalComics: number;
}

export const Footer: React.FC<FooterProps> = ({ totalComics }) => {
  return (
    <footer className="w-full bg-[#0B101B] border-t border-[#1D293D] mt-12 py-5 text-[11px] text-[#CAD5E2] font-mono select-none">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#F1F5F9] uppercase tracking-wider">
            DANSKOMIK
          </span>
          <span className="text-[#64748B]">·</span>
          <span className="text-[#64748B] uppercase">
            BACA & UNDUH KOMIK TANPA JEDA
          </span>
        </div>

        {/* STATUS SERVER ONLINE */}
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            ONLINE · {totalComics} JUDUL SIAP
          </span>
        </div>
      </div>
    </footer>
  );
};
