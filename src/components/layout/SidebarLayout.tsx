import React, { useState } from 'react';
import { User } from '../../types/cbt';
import { SpanjuBadge } from '../common/SpanjuBadge';
import {
  School,
  Users,
  BookOpen,
  GraduationCap,
  Settings,
  Cloud,
  LayoutDashboard,
  Layers,
  Video,
  FileSpreadsheet,
  CalendarCheck,
  Award,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Wifi,
  BatteryCharging,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface SidebarLayoutProps {
  user: User;
  onLogout: () => void;
  activeNav: string;
  onSelectNav: (id: string) => void;
  navItems: NavItem[];
  children: React.ReactNode;
  pageTitle: string;
  pageSubtitle?: string;
  headerAction?: React.ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  user,
  onLogout,
  activeNav,
  onSelectNav,
  navItems,
  children,
  pageTitle,
  pageSubtitle,
  headerAction,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col lg:flex-row font-sans">
      {/* ================= MOBILE TOPBAR ================= */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0a142f] border-b border-blue-950/80 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <SpanjuBadge size="sm" />
        </div>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-300 hover:text-white transition-colors"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ================= MOBILE BACKDROP ================= */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
        />
      )}

      {/* ================= SIDEBAR (DESKTOP & MOBILE DRAWER) ================= */}
      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 z-50 w-72 bg-gradient-to-b from-[#0a1128] via-[#0b1a3d] to-[#080f24] border-r border-blue-900/40 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Branding Section */}
        <div className="p-5 border-b border-blue-900/30">
          <div className="flex items-center justify-between mb-3">
            <SpanjuBadge size="md" />
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 px-3 py-2 rounded-xl bg-blue-950/80 border border-blue-800/50 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-blue-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Chromebook CBT v2.4</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-200">
              Kiosk OK
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5">
          <div className="px-3 pb-1.5 text-[10px] font-bold text-blue-400/80 uppercase tracking-widest">
            {user.role === 'admin'
              ? 'Menu Administrator'
              : user.role === 'guru'
              ? 'Menu Guru Pengampu'
              : 'Menu Ruang Siswa'}
          </div>

          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectNav(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40 translate-x-1'
                    : 'text-slate-300 hover:text-white hover:bg-blue-950/60 hover:translate-x-0.5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`transition-colors ${
                      isActive ? 'text-white' : 'text-blue-400 group-hover:text-blue-300'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-950 border border-blue-800/40 text-blue-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Card & System Status Footer */}
        <div className="p-4 border-t border-blue-900/30 bg-[#060b1c]/80 space-y-3">
          {/* Chromebook Hardware Telemetry Simulation */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-blue-950/50 rounded-lg text-[10px] text-blue-300 font-mono">
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>SPANJU-5G</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BatteryCharging className="w-3 h-3 text-emerald-400" />
              <span>100%</span>
            </div>
          </div>

          {/* User Profile Mini Bar */}
          <div className="flex items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-blue-900/80 border border-blue-700/60 flex items-center justify-center text-sm font-bold text-blue-200 shrink-0 shadow-inner">
                {user.avatar || user.name.charAt(0)}
              </div>
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-xs font-bold text-slate-100 truncate">
                  {user.name}
                </span>
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wide">
                  {user.role === 'admin'
                    ? 'Admin Pusat'
                    : user.role === 'guru'
                    ? 'Guru CBT'
                    : user.kelasName || 'Siswa'}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Keluar dari Akun"
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-900/50 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT CANVAS ================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a1128] overflow-hidden">
        {/* Top Header Bar inside Main Canvas */}
        <header className="sticky top-0 z-30 px-6 py-4 bg-[#0a142f]/90 backdrop-blur-md border-b border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>SMP Negeri 7 Muara Badak · Kandidat Sekolah Rujukan Google</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
              {pageTitle}
            </h1>
            {pageSubtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{pageSubtitle}</p>
            )}
          </div>

          {headerAction && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              {headerAction}
            </div>
          )}
        </header>

        {/* Main Body Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
