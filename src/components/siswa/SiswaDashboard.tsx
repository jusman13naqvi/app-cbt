import React, { useState, useEffect } from 'react';
import {
  User,
  Kelas,
  MataPelajaran,
  ClassExamSession,
  ExamPackage,
  AttendanceRecord,
  ExamSubmission,
  SchoolProfile,
} from '../../types/cbt';
import { store } from '../../services/store';
import { CbtExamRunner } from './CbtExamRunner';
import { SidebarLayout, NavItem } from '../layout/SidebarLayout';
import {
  BookOpen,
  CalendarCheck,
  Award,
  Key,
  Lock,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
  Laptop,
  CheckCircle,
  Clock,
  Sparkles,
  Info,
  ArrowLeft,
} from 'lucide-react';

interface SiswaDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export const SiswaDashboard: React.FC<SiswaDashboardProps> = ({ currentUser, onLogout }) => {
  // State from store
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  const [sessions, setSessions] = useState<ClassExamSession[]>([]);
  const [examPackages, setExamPackages] = useState<ExamPackage[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [profile, setProfile] = useState<SchoolProfile>(store.getProfile());

  // Navigation states
  const [selectedSubject, setSelectedSubject] = useState<MataPelajaran | null>(null);
  const [activeNav, setActiveNav] = useState<string>('mapel');

  // Exam Run State
  const [runningSession, setRunningSession] = useState<{
    session: ClassExamSession;
    pkg: ExamPackage;
  } | null>(null);

  // Token input state
  const [inputToken, setInputToken] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    const sync = () => {
      setClasses(store.getClasses());
      setSubjects(store.getSubjects());
      setSessions(store.getSessions());
      setExamPackages(store.getExamPackages());
      setAttendance(store.getAttendance());
      setSubmissions(store.getSubmissions());
      setProfile(store.getProfile());
    };
    sync();
    return store.subscribe(sync);
  }, []);

  const studentKelas =
    classes.find((c) => c.id === currentUser.kelasId) ||
    classes[0] || {
      id: 'k-7a',
      name: 'Kelas VII-A',
      tingkat: 7,
      waliKelas: 'Siti Rahmawati, S.Pd.',
      themeColor: {
        bg: 'bg-blue-600',
        border: 'border-blue-500',
        text: 'text-blue-700',
        lightBg: 'bg-blue-50',
        accent: '#1a73e8',
      },
    };

  const classSubjects = subjects.filter((s) => s.tingkat === studentKelas.tingkat);

  const handleMarkAttendance = (subjId: string) => {
    store.submitAttendance({
      kelasId: studentKelas.id,
      subjectId: subjId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      nis: currentUser.nis || 'NIS',
      status: 'Hadir',
      deviceInfo: 'Chromebook Educational Device (ChromeOS)',
    });
    showToast('Presensi kehadiran ujian berhasil dicatat: HADIR!');
  };

  const handleStartExam = (session: ClassExamSession, pkg: ExamPackage) => {
    setTokenError('');
    const cleanToken = inputToken.trim().toUpperCase();

    if (!cleanToken) {
      setTokenError('Masukkan Token Ujian yang diberikan oleh pengawas!');
      return;
    }

    if (cleanToken !== session.token.toUpperCase()) {
      setTokenError('Token Ujian tidak sesuai! Silakan tanyakan kepada pengawas.');
      return;
    }

    const isAttended = attendance.some(
      (a) =>
        a.studentId === currentUser.id &&
        a.kelasId === studentKelas.id &&
        a.subjectId === session.subjectId
    );

    if (session.attendanceRequired && !isAttended) {
      handleMarkAttendance(session.subjectId);
    }

    setRunningSession({ session, pkg });
  };

  if (runningSession) {
    return (
      <CbtExamRunner
        currentUser={currentUser}
        session={runningSession.session}
        examPackage={runningSession.pkg}
        onFinishExam={() => {
          setRunningSession(null);
          setInputToken('');
        }}
      />
    );
  }

  const siswaNavItems: NavItem[] = [
    {
      id: 'mapel',
      label: 'Ruang Ujian & Mapel',
      icon: <BookOpen className="w-4 h-4" />,
      badge: 11,
    },
    {
      id: 'presensi',
      label: 'Jadwal & Presensi',
      icon: <CalendarCheck className="w-4 h-4" />,
      badge: attendance.filter((a) => a.studentId === currentUser.id).length,
    },
    {
      id: 'nilai',
      label: 'Pengumuman Nilai',
      icon: <Award className="w-4 h-4" />,
      badge: submissions.filter((s) => s.studentId === currentUser.id).length,
    },
    {
      id: 'profil',
      label: 'Profil Siswa',
      icon: <UserIcon className="w-4 h-4" />,
    },
  ];

  return (
    <SidebarLayout
      user={currentUser}
      onLogout={onLogout}
      activeNav={activeNav}
      onSelectNav={(id) => {
        setActiveNav(id);
        setSelectedSubject(null);
      }}
      navItems={siswaNavItems}
      pageTitle={
        activeNav === 'mapel' && selectedSubject
          ? `${selectedSubject.name} (${studentKelas.name})`
          : activeNav === 'presensi'
          ? 'Jadwal & Presensi Kehadiran CBT'
          : activeNav === 'nilai'
          ? 'Pengumuman Hasil & Rekap Nilai'
          : activeNav === 'profil'
          ? 'Profil Siswa Chromebook'
          : 'Ruang Belajar & Ujian CBT'
      }
      pageSubtitle={`Siswa: ${currentUser.name} (NIS: ${currentUser.nis}) · ${studentKelas.name} · TP ${profile.academicYear}`}
    >
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#0f172a] border border-blue-800 text-white text-xs font-semibold rounded-xl shadow-2xl animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ================= VIEW 1: 11 KOTAK MATA PELAJARAN ================= */}
      {activeNav === 'mapel' && !selectedSubject && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-display text-white">
                Mata Pelajaran Kurikulum {studentKelas.name} (11 Mapel)
              </h2>
              <p className="text-xs text-slate-400">
                Pilih mata pelajaran yang diujikan untuk memasukkan Token Ujian CBT atau melihat nilai.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classSubjects.map((sub, idx) => {
              const session = sessions.find(
                (s) => s.kelasId === studentKelas.id && s.subjectId === sub.id
              );
              const isExamActive = session?.isActive;
              const hasAttended = attendance.some(
                (a) =>
                  a.studentId === currentUser.id &&
                  a.kelasId === studentKelas.id &&
                  a.subjectId === sub.id
              );

              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubject(sub);
                    setInputToken('');
                    setTokenError('');
                  }}
                  className={`relative bg-[#0d1733] border rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all cursor-pointer group flex flex-col justify-between overflow-hidden ${
                    isExamActive
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-blue-950 hover:border-blue-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300">
                        {sub.kode || `MP-${idx + 1}`}
                      </span>

                      {isExamActive ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-600/30 border border-blue-400 text-blue-300 font-bold text-[10px] rounded-full">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                          <span>UJIAN AKTIF</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium">
                          Belum Ada Ujian
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold font-display text-white group-hover:text-blue-400 transition-colors">
                      {sub.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Guru: <span className="text-slate-200">{sub.guruName}</span>
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-blue-950 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {hasAttended ? (
                        <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Hadir</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Belum Presensi</span>
                      )}
                    </div>

                    <span className="text-blue-400 font-semibold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Buka</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= VIEW 2: DETAIL MATA PELAJARAN ================= */}
      {activeNav === 'mapel' && selectedSubject && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#0d1733] border border-blue-900/40 rounded-2xl p-4">
            <button
              onClick={() => setSelectedSubject(null)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-200 text-xs font-semibold rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke 11 Mata Pelajaran</span>
            </button>
            <span className="text-xs font-mono text-blue-300">
              Guru: {selectedSubject.guruName}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Presensi Card */}
            <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  {attendance.some(
                    (a) =>
                      a.studentId === currentUser.id &&
                      a.kelasId === studentKelas.id &&
                      a.subjectId === selectedSubject.id
                  ) ? (
                    <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold text-xs rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Presensi Terisi</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-amber-950 border border-amber-800 text-amber-300 font-bold text-xs rounded-full">
                      Wajib Diisi
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold font-display text-white mb-1">
                  Daftar Hadir Ujian
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tandai kehadiran Anda sebelum mengerjakan ujian CBT ini. Data kehadiran akan tersinkronisasi otomatis ke buku kehadiran guru.
                </p>
              </div>

              <div className="pt-4 border-t border-blue-950">
                {attendance.some(
                  (a) =>
                    a.studentId === currentUser.id &&
                    a.kelasId === studentKelas.id &&
                    a.subjectId === selectedSubject.id
                ) ? (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
                    <span>Status: <strong>Hadir di Ruang Ujian</strong></span>
                    <span className="font-mono text-[11px]">
                      {new Date().toLocaleDateString('id-ID')}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleMarkAttendance(selectedSubject.id)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Konfirmasi Hadir Ujian Sekarang
                  </button>
                )}
              </div>
            </div>

            {/* CBT Ujian Card */}
            {(() => {
              const session =
                sessions.find(
                  (s) => s.kelasId === studentKelas.id && s.subjectId === selectedSubject.id
                ) ||
                sessions.find((s) => s.kelasId === studentKelas.id && s.isActive);

              const pkg = session
                ? examPackages.find((p) => p.id === session.packageId)
                : examPackages.find((p) => p.tingkat === studentKelas.tingkat);

              const isExamOpen = session?.isActive;
              const submission = submissions.find(
                (subm) =>
                  subm.studentId === currentUser.id && subm.kelasId === studentKelas.id
              );

              return (
                <div
                  className={`rounded-2xl p-6 shadow-xl flex flex-col justify-between border transition-all space-y-4 ${
                    isExamOpen
                      ? 'bg-[#0d1733] border-blue-500 ring-2 ring-blue-500/20'
                      : 'bg-[#080e22] border-blue-950 opacity-90'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isExamOpen
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-blue-950 text-slate-500'
                        }`}
                      >
                        <Laptop className="w-5 h-5" />
                      </div>

                      {isExamOpen ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-950 border border-blue-400 text-blue-200 font-bold text-xs rounded-full shadow-xs">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          <span>UJIAN <strong className="text-white">CBT</strong> DIBUKA</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 text-slate-400 font-semibold text-xs rounded-full">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Belum Diaktifkan Guru</span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-base font-bold font-display text-white mb-1">
                      {pkg?.title || 'Penilaian Ujian CBT Digital'}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isExamOpen
                        ? `Durasi: ${pkg?.durationMinutes || 45} Menit · KKM: ${pkg?.kkm || 75} · ${pkg?.questions.length || 5} Butir Soal`
                        : 'Kotak ujian akan berubah menjadi warna biru aktif ketika guru pengampu membuka sesi ujian.'}
                    </p>

                    {submission && (
                      <div className="mt-3.5 p-3.5 bg-[#091024] border-2 border-blue-900/80 rounded-xl text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                          <span className="text-slate-300">Status: <strong className="text-white">Sudah Mengikuti Ujian</strong></span>
                        </div>
                        <span className="font-mono font-bold">
                          {session?.releaseScores ? (
                            <span className="text-emerald-400 text-sm font-black font-mono">Nilai: {submission.percentage}</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-950/80 border border-amber-600/70 text-amber-300 rounded-lg text-[11px] font-bold">
                              🔒 Nilai Menunggu Rilis
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-blue-950">
                    {submission ? (
                      <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-blue-200">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Anda telah menyelesaikan ujian untuk mata pelajaran ini.</span>
                        </div>
                        {session?.releaseScores ? (
                          <span className="font-mono font-black text-emerald-400 text-xs">{submission.passed ? 'TUNTAS' : 'REMEDIAL'}</span>
                        ) : (
                          <span className="text-amber-400 font-semibold text-[11px] font-mono whitespace-nowrap">Nilai Belum Dirilis</span>
                        )}
                      </div>
                    ) : isExamOpen ? (
                      <div className="space-y-3">
                        {tokenError && (
                          <div className="text-xs text-red-400 font-semibold">
                            {tokenError}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Key className="w-4 h-4 text-cyan-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={inputToken}
                              onChange={(e) => setInputToken(e.target.value)}
                              placeholder="Ketik Token Ujian (SPANJU7)"
                              className="w-full pl-9 pr-3 py-2 bg-[#091024] border border-blue-700/80 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <button
                            onClick={() => {
                              if (session && pkg) {
                                handleStartExam(session, pkg);
                              }
                            }}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <span>Mulai Ujian</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-blue-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                          <span>Layar otomatis terkunci Fullscreen & Kamera aktif</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">
                        Menunggu guru pengawas membagikan Token Ujian...
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================= VIEW 3: PRESENSI & JADWAL ================= */}
      {activeNav === 'presensi' && (
        <div className="space-y-6">
          <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold font-display text-white">
              Riwayat Presensi Kehadiran Ujian ({currentUser.name})
            </h3>
            <div className="overflow-x-auto rounded-xl border border-blue-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#091024] border-b border-blue-950 text-blue-300 uppercase">
                  <tr>
                    <th className="py-3 px-4">Mata Pelajaran</th>
                    <th className="py-3 px-4">Waktu Presensi</th>
                    <th className="py-3 px-4">Perangkat</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-950 text-slate-300">
                  {classSubjects.map((sub) => {
                    const record = attendance.find(
                      (a) => a.studentId === currentUser.id && a.subjectId === sub.id
                    );
                    return (
                      <tr key={sub.id} className="hover:bg-blue-950/30">
                        <td className="py-3 px-4 font-semibold text-white">{sub.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {record?.timestamp
                            ? new Date(record.timestamp).toLocaleString('id-ID')
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {record?.deviceInfo || 'Chromebook Official Client'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {record ? (
                            <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold rounded-md text-[11px]">
                              Hadir
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-900 text-slate-500 font-semibold rounded-md text-[11px]">
                              Belum Hadir
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 4: NILAI SISWA ================= */}
      {activeNav === 'nilai' && (
        <div className="space-y-6">
          <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold font-display text-white">
              Rekap Hasil & Pengumuman Nilai Ujian
            </h3>
            <p className="text-xs text-slate-400">
              Nilai resmi yang telah dirilis oleh guru pengampu mata pelajaran.
            </p>

            <div className="overflow-x-auto rounded-xl border border-blue-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#091024] border-b border-blue-950 text-blue-300 uppercase">
                  <tr>
                    <th className="py-3 px-4">Mata Pelajaran</th>
                    <th className="py-3 px-4">Tanggal Ujian</th>
                    <th className="py-3 px-4 text-center">Skor</th>
                    <th className="py-3 px-4 text-center">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-950 text-slate-300">
                  {submissions
                    .filter((s) => s.studentId === currentUser.id)
                    .map((sub) => {
                      const session = sessions.find((ses) => ses.id === sub.examSessionId);
                      const pkg = examPackages.find((p) => p.id === sub.packageId);
                      const mapelName = pkg?.subjectName || pkg?.title || 'Ujian Digital CBT';

                      return (
                        <tr key={sub.id} className="hover:bg-blue-950/40">
                          <td className="py-3 px-4 font-semibold text-white">
                            <div className="flex flex-col">
                              <span>{mapelName}</span>
                              <span className="text-[10px] text-blue-300/80 font-mono">
                                KKM: {pkg?.kkm || 75} · {pkg?.questions.length || 5} Butir Soal
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {new Date(sub.submittedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {session?.releaseScores ? (
                              <span className="font-mono font-black text-emerald-400 text-lg">
                                {sub.percentage}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-950/80 border border-amber-600/70 text-amber-300 font-bold text-xs rounded-lg inline-flex items-center gap-1 font-mono">
                                🔒 Belum Dirilis
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {session?.releaseScores ? (
                              <span
                                className={`px-2.5 py-1 rounded-md text-[11px] font-black ${
                                  sub.passed
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                    : 'bg-rose-950 text-rose-300 border border-rose-700'
                                }`}
                              >
                                {sub.passed ? 'TUNTAS KKM' : 'REMEDIAL'}
                              </span>
                            ) : (
                              <span className="text-blue-300 font-semibold text-xs bg-blue-950 px-2 py-0.5 rounded border border-blue-900">
                                Menunggu Rilis Guru
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 5: PROFIL SISWA ================= */}
      {activeNav === 'profil' && (
        <div className="max-w-2xl mx-auto bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-blue-950">
            <div className="w-16 h-16 rounded-2xl bg-blue-950 border border-blue-700 flex items-center justify-center text-3xl shadow-inner">
              {currentUser.avatar || '👨‍🎓'}
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-white">
                {currentUser.name}
              </h2>
              <p className="text-xs text-blue-300 font-mono mt-0.5">
                NIS: {currentUser.nis} · NISN: {currentUser.nisn || '-'}
              </p>
              <span className="inline-block mt-1 text-[11px] font-bold text-blue-300 bg-blue-950 border border-blue-800 px-2 py-0.5 rounded font-mono">
                {studentKelas.name}
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 bg-[#091024] rounded-xl border border-blue-950">
              <div>
                <span className="text-slate-400 font-medium">Asal Sekolah:</span>
                <div className="font-bold text-white mt-0.5">{profile.schoolName}</div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Status Akreditasi:</span>
                <div className="font-bold text-blue-400 mt-0.5">{profile.subtitle}</div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Wali Kelas:</span>
                <div className="font-bold text-white mt-0.5">{studentKelas.waliKelas}</div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Tahun Pelajaran:</span>
                <div className="font-bold text-white mt-0.5">
                  {profile.academicYear} ({profile.semester})
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-xl text-blue-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Akun ini terdaftar resmi pada perangkat Chromebook sekolah dan terafiliasi dengan akun Google for Education SMP Negeri 7 Muara Badak.
              </p>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
};
