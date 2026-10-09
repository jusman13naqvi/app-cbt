import React from 'react';
import { User } from '../../types/cbt';
import { SpanjuBadge } from './SpanjuBadge';
import { LogOut, Wifi, BatteryCharging, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  activeRoleTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-[#0a142f]/95 backdrop-blur-md border-b border-blue-900/60 shadow-lg">
      {/* Zone 1: Single text element wordmark with official emblem */}
      <div className="flex items-center gap-3">
        <SpanjuBadge size="md" />
      </div>

      {/* Zone 2: System / Chromebook Status indicator */}
      <div className="hidden md:flex items-center gap-4 text-xs text-blue-200 font-medium">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-950 border border-blue-800 rounded-lg text-blue-300">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Chromebook Kiosk Mode Ready</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>SPANJU-Net (5GHz)</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
          <span>100%</span>
        </div>
      </div>

      {/* Zone 3: User Details & Logout Action */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-white truncate max-w-[180px]">
                {user.name}
              </span>
              <span className="text-[10px] text-blue-300 uppercase tracking-wider font-mono">
                {user.role === 'admin'
                  ? 'Administrator'
                  : user.role === 'guru'
                  ? 'Guru Pengampu'
                  : `${user.kelasName || 'Siswa'}`}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-blue-900 border border-blue-600 flex items-center justify-center text-sm font-semibold text-white">
              {user.avatar || user.name.charAt(0)}
            </div>

            <button
              onClick={onLogout}
              title="Keluar / Ganti Akun"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-red-400 hover:bg-red-950/40 border border-blue-900 hover:border-red-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        ) : (
          <span className="text-xs text-blue-300 font-medium">
            Tahun Ajaran 2025/2026
          </span>
        )}
      </div>
    </header>
  );
};
