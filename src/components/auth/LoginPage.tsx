import React, { useState } from 'react';
import { UserRole, User } from '../../types/cbt';
import { store } from '../../services/store';
import { supabaseService } from '../../services/supabase';
import { cloudSync } from '../../services/cloudSync';
import { SpanjuBadge } from '../common/SpanjuBadge';
import {
  ShieldAlert,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Lock,
  User as UserIcon,
  Laptop,
  Database,
  Cloud,
  CheckCircle2,
  Settings,
  X,
  Check,
  Share2,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('siswa');
  const [username, setUsername] = useState('siswa7a.01');
  const [password, setPassword] = useState('123');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cloud Config Modal state
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [cloudUrl, setCloudUrl] = useState(supabaseService.getConfig()?.url || '');
  const [cloudKey, setCloudKey] = useState(supabaseService.getConfig()?.anonKey || '');
  const [cloudTestStatus, setCloudTestStatus] = useState<string | null>(null);
  const [cloudTesting, setCloudTesting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg('');
    if (role === 'admin') {
      setUsername('admin');
      setPassword('');
    } else {
      setUsername('');
      setPassword('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const authUser = await store.authenticateAsync(selectedRole, username, password);
      setIsLoading(false);

      if (authUser) {
        onLoginSuccess(authUser);
      } else {
        if (selectedRole === 'admin') {
          setErrorMsg('Username atau Password Admin salah! (Default: admin / 123456)');
        } else if (selectedRole === 'guru') {
          setErrorMsg('Username atau Password Guru salah atau belum terdaftar.');
        } else {
          setErrorMsg('NIS atau Username Siswa salah atau belum didaftarkan.');
        }
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('Terjadi kesalahan saat menghubungi database.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1128] via-[#0b1a3d] to-[#070d1e] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner with Google Education Identity */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 relative z-10">
        <SpanjuBadge size="lg" />
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-blue-950/80 border border-blue-800/60 rounded-full text-xs font-semibold text-blue-300 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Chromebook Certified Examination Environment</span>
        </div>
      </div>

      {/* Main Login Card Stage */}
      <div className="w-full max-w-md mx-auto my-auto pt-4 pb-8 relative z-10">
        <div className="bg-[#0e172e]/90 backdrop-blur-xl border border-blue-900/60 rounded-3xl shadow-2xl shadow-black/60 p-6 sm:p-8 transition-all">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 mb-3 border border-blue-400/40">
              <Laptop className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold font-display text-white tracking-tight">
              Portal Ujian <span className="text-cyan-400 font-extrabold drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]">CBT</span> SPANJU
            </h1>
            <p className="text-xs text-blue-300/80 mt-1 max-w-xs mx-auto">
              SMP Negeri 7 Muara Badak · Kandidat Sekolah Rujukan Google
            </p>
          </div>

          {/* Role Selector Tabs */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-blue-200 mb-2">
              Pilihan Pengguna (Hak Akses)
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#091024] rounded-2xl border border-blue-950">
              <button
                type="button"
                onClick={() => handleRoleChange('siswa')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === 'siswa'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 border border-blue-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Siswa</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('guru')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === 'guru'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 border border-blue-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Guru</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === 'admin'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 border border-blue-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/70 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-1">
                {selectedRole === 'siswa'
                  ? 'Username / NIS Siswa'
                  : selectedRole === 'guru'
                  ? 'Username Guru'
                  : 'Username Administrator'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={
                    selectedRole === 'siswa'
                      ? 'Contoh: siswa7a.01 atau 202407001'
                      : selectedRole === 'guru'
                      ? 'Contoh: guru.ahmad'
                      : 'admin'
                  }
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#091024] text-white border border-blue-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                />
                <UserIcon className="w-4 h-4 text-blue-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#091024] text-white border border-blue-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono transition-all"
                />
                <Lock className="w-4 h-4 text-blue-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Sistem CBT</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Database Cloud & Realtime Status Indicator */}
          <div className="mt-5 pt-4 border-t border-blue-900/40 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Status Database:</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCloudUrl(supabaseService.getConfig()?.url || '');
                setCloudKey(supabaseService.getConfig()?.anonKey || '');
                setShowCloudModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer transition-all hover:scale-105"
            >
              {cloudSync.isAvailable() || supabaseService.isConfigured() ? (
                <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/80 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Cloud Online Active (Multi-Device)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/80 font-medium hover:border-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Mode Penyimpanan Lokal
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ================= MODAL PENGATURAN CLOUD ONLINE DARI LOGIN ================= */}
        {showCloudModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
            <div className="bg-[#0e172e] border border-blue-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-blue-900/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Pengaturan Cloud Database</h3>
                    <p className="text-[11px] text-blue-300/80">Sinkronisasi Online Multi-Perangkat (Vercel)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCloudModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-blue-950 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-blue-950/50 rounded-2xl border border-blue-900/60 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <p className="font-semibold text-blue-200">
                  💡 Akses dari HP, Laptop, atau Komputer Lain:
                </p>
                <p className="text-[11px] text-slate-300">
                  Masukkan URL & Anon Key Supabase di bawah ini agar perangkat ini otomatis tersambung ke database online yang sama dengan akun Admin.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Supabase Project URL</label>
                  <input
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={cloudUrl}
                    onChange={(e) => setCloudUrl(e.target.value)}
                    className="w-full p-2.5 bg-[#081024] text-white border border-blue-900 rounded-xl font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Supabase Anon Key</label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={cloudKey}
                    onChange={(e) => setCloudKey(e.target.value)}
                    className="w-full p-2.5 bg-[#081024] text-white border border-blue-900 rounded-xl font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {cloudTestStatus && (
                  <div className="p-2.5 bg-[#081024] rounded-xl border border-blue-900 text-[11px] text-blue-200">
                    {cloudTestStatus}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={cloudTesting || !cloudUrl || !cloudKey}
                    onClick={async () => {
                      setCloudTesting(true);
                      setCloudTestStatus(null);
                      const res = await supabaseService.testConnection(cloudUrl, cloudKey);
                      setCloudTesting(false);
                      setCloudTestStatus(res.message);
                    }}
                    className="flex-1 py-2 bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {cloudTesting ? 'Menguji...' : 'Uji Koneksi'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      supabaseService.setConfig(cloudUrl, cloudKey);
                      await store.syncFromSupabase();
                      setShowCloudModal(false);
                    }}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/30"
                  >
                    Simpan & Hubungkan
                  </button>
                </div>

                {supabaseService.isConfigured() && (
                  <div className="pt-2 border-t border-blue-900/60">
                    <button
                      type="button"
                      onClick={() => {
                        const link = supabaseService.generateShareLink();
                        if (link) {
                          navigator.clipboard.writeText(link);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 3000);
                        }
                      }}
                      className="w-full py-2 px-3 bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-cyan-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Link Auto-Connect Berhasil Disalin!' : 'Salin Link Auto-Connect untuk Perangkat Lain'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer System Info */}
      <footer className="w-full max-w-5xl mx-auto py-3 text-center text-xs text-blue-300/60 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-blue-950/60 relative z-10">
        <div>
          © 2026 SMP Negeri 7 Muara Badak. Didukung Teknologi Google for Education.
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>Chromebook Kiosk Active</span>
          <span>·</span>
          <span>Cloudflare Edge Ready</span>
          <span>·</span>
          <span>Kutai Kartanegara, Kaltim</span>
        </div>
      </footer>
    </div>
  );
};
