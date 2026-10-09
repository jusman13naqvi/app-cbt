import React from 'react';

export const SpanjuBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <div className="flex items-center gap-2.5">
      {/* Google Emblem / Academic Shield */}
      <div
        className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0e1f47] to-[#0a142f] border-2 border-blue-500/70 shadow-lg shadow-blue-950/80 shrink-0 overflow-hidden ${
          isSm ? 'w-8 h-8' : isLg ? 'w-12 h-12' : 'w-10 h-10'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/25 via-blue-500/20 to-indigo-500/20 pointer-events-none" />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={isSm ? 'w-4 h-4' : isLg ? 'w-7 h-7' : 'w-6 h-6'}
        >
          <path
            d="M12 2L3 7V12C3 17.52 6.84 22.74 12 24C17.16 22.74 21 17.52 21 12V7L12 2Z"
            fill="#38bdf8"
            fillOpacity="0.25"
            stroke="#60a5fa"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 12.5L11 15L15.5 10.5"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-display font-black tracking-tight text-white drop-shadow-md ${
              isSm ? 'text-xs' : isLg ? 'text-xl' : 'text-base'
            }`}
          >
            <span className="text-cyan-400 font-black drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]">CBT</span>{' '}
            <span className="text-white">SPANJU</span>
          </span>
          <span className="text-[10px] font-extrabold text-cyan-200 bg-blue-900/90 border border-cyan-500/60 px-1.5 py-0.5 rounded font-mono shadow-xs">
            SMPN 7
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC04]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
          </div>
          <span
            className={`text-blue-100 font-semibold tracking-wide ${
              isSm ? 'text-[9px]' : isLg ? 'text-xs' : 'text-[11px]'
            }`}
          >
            Kandidat Sekolah Rujukan Google
          </span>
        </div>
      </div>
    </div>
  );
};
