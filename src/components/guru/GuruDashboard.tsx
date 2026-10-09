import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import {
  User,
  Kelas,
  MataPelajaran,
  ExamPackage,
  ClassExamSession,
  AttendanceRecord,
  ProctorViolation,
  ExamSubmission,
  Question,
  QuestionType,
  SchoolProfile,
} from '../../types/cbt';
import { SidebarLayout, NavItem } from '../layout/SidebarLayout';
import { ProctorCameraMonitoring } from '../common/ProctorCameraMonitoring';
import {
  LayoutDashboard,
  Layers,
  FileSpreadsheet,
  Video,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Key,
  RefreshCw,
  Image as ImageIcon,
  ArrowLeft,
  Award,
  Sparkles,
  X,
  CalendarCheck,
  Check,
  Bookmark,
  Lock,
  Camera,
  ShieldAlert,
  Eye,
  Search,
  School,
} from 'lucide-react';

interface GuruDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({ currentUser, onLogout }) => {
  const [activeNav, setActiveNav] = useState<string>('classes');
  const [selectedClass, setSelectedClass] = useState<Kelas | null>(null);
  const [classDetailTab, setClassDetailTab] = useState<'cbt' | 'hadir' | 'rekap' | 'proctor'>('cbt');

  // Live state from store
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [examPackages, setExamPackages] = useState<ExamPackage[]>([]);
  const [sessions, setSessions] = useState<ClassExamSession[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [violations, setViolations] = useState<ProctorViolation[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [profile, setProfile] = useState<SchoolProfile>(store.getProfile());

  // Live Proctoring state
  const [proctorClassFilter, setProctorClassFilter] = useState<string>('all');
  const [proctorSearch, setProctorSearch] = useState<string>('');
  const [proctorViolationOnly, setProctorViolationOnly] = useState<boolean>(false);
  const [simulatedProctorMode, setSimulatedProctorMode] = useState<boolean>(false);
  const [proctorClock, setProctorClock] = useState<string>(new Date().toLocaleTimeString('id-ID'));
  const [cameraFlashId, setCameraFlashId] = useState<string | null>(null);
  const [selectedEnlargedStudent, setSelectedEnlargedStudent] = useState<any | null>(null);

  // Package creation modal state (FIXED SCROLL & HEIGHT)
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [deletePackageModal, setDeletePackageModal] = useState<{
    isOpen: boolean;
    pkgId: string;
    pkgTitle: string;
  } | null>(null);
  const [packageForm, setPackageForm] = useState({
    title: '',
    subjectId: '',
    tingkat: 7 as 7 | 8 | 9,
    durationMinutes: 45,
    kkm: 75,
    totalPoints: 100,
  });

  // Dynamic Question creation inside Package
  const [packageQuestions, setPackageQuestions] = useState<Question[]>([]);
  const [currentQType, setCurrentQType] = useState<QuestionType>('pilihan_ganda');
  const [qText, setQText] = useState('');
  const [qImage, setQImage] = useState<string | undefined>(undefined);
  const [qPoints, setQPoints] = useState(20);

  // PG & PG Kompleks options state
  const [options, setOptions] = useState([
    { id: 'opt-a', label: 'A', text: '', image: undefined },
    { id: 'opt-b', label: 'B', text: '', image: undefined },
    { id: 'opt-c', label: 'C', text: '', image: undefined },
    { id: 'opt-d', label: 'D', text: '', image: undefined },
  ]);
  const [correctPgAnswer, setCorrectPgAnswer] = useState('opt-a');
  const [correctPgComplex, setCorrectPgComplex] = useState<string[]>(['opt-a']);

  // Benar/Salah state
  const [boolStatements, setBoolStatements] = useState([
    { id: 'bs-1', statement: '', correctAnswer: true },
    { id: 'bs-2', statement: '', correctAnswer: false },
  ]);

  // Menjodohkan state
  const [matchPairs, setMatchPairs] = useState([
    { id: 'm-1', premise: '', correctMatch: '' },
    { id: 'm-2', premise: '', correctMatch: '' },
  ]);

  // Isian Singkat state
  const [shortAnswerKey, setShortAnswerKey] = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    const sync = () => {
      setClasses(store.getClasses());
      setSubjects(store.getSubjects());
      setStudents(store.getStudents());
      setExamPackages(store.getExamPackages());
      setSessions(store.getSessions());
      setAttendance(store.getAttendance());
      setViolations(store.getViolations());
      setSubmissions(store.getSubmissions());
      setProfile(store.getProfile());
    };
    sync();
    return store.subscribe(sync);
  }, []);

  const teacherSubjects = subjects.filter((s) => s.guruId === currentUser.id);
  const primarySubject = teacherSubjects[0] || subjects[0] || {
    id: 'mapel-7-10',
    name: 'Informatika',
    kode: 'MP7-10',
    tingkat: 7,
    guruId: currentUser.id,
    guruName: currentUser.name,
  };

  const currentSession = selectedClass
    ? sessions.find((s) => s.kelasId === selectedClass.id && s.subjectId === primarySubject.id) ||
      sessions.find((s) => s.kelasId === selectedClass.id)
    : null;

  // Toggle Exam Session Active / Inactive
  const handleToggleSession = (pkgId: string) => {
    if (!selectedClass) return;
    const token = currentSession?.token || `SPANJU${selectedClass.tingkat}`;
    const willBeActive = !currentSession?.isActive;

    store.setExamSession({
      kelasId: selectedClass.id,
      packageId: pkgId,
      subjectId: primarySubject.id,
      token,
      isActive: willBeActive,
      releaseScores: currentSession?.releaseScores || false,
      attendanceRequired: true,
    });

    showToast(
      willBeActive
        ? `Sesi Ujian dibuka! Token: ${token}`
        : 'Sesi Ujian berhasil ditutup.'
    );
  };

  const handleUpdateToken = (newToken: string) => {
    if (!selectedClass || !currentSession) return;
    store.setExamSession({
      ...currentSession,
      token: newToken.toUpperCase(),
    });
    showToast(`Token ujian diperbarui: ${newToken.toUpperCase()}`);
  };

  const handleToggleReleaseScore = () => {
    if (!currentSession) return;
    store.toggleReleaseScore(currentSession.id, !currentSession.releaseScores);
    showToast(
      !currentSession.releaseScores
        ? 'Nilai siswa resmi dirilis ke akun siswa!'
        : 'Pengumuman nilai disembunyikan.'
    );
  };

  // Add Question to Package Form
  const handleAddQuestionToPackage = () => {
    if (!qText.trim()) {
      showToast('Teks soal tidak boleh kosong!', 'error');
      return;
    }

    const nextNumber = packageQuestions.length + 1;
    let newQuestion: Question;

    if (currentQType === 'pilihan_ganda') {
      newQuestion = {
        id: `q-${Date.now()}`,
        number: nextNumber,
        type: 'pilihan_ganda',
        text: qText,
        image: qImage,
        points: qPoints,
        options: [...options],
        correctAnswers: [correctPgAnswer],
      };
    } else if (currentQType === 'pilihan_ganda_kompleks') {
      newQuestion = {
        id: `q-${Date.now()}`,
        number: nextNumber,
        type: 'pilihan_ganda_kompleks',
        text: qText,
        image: qImage,
        points: qPoints,
        options: [...options],
        correctAnswers: [...correctPgComplex],
      };
    } else if (currentQType === 'benar_salah') {
      newQuestion = {
        id: `q-${Date.now()}`,
        number: nextNumber,
        type: 'benar_salah',
        text: qText,
        image: qImage,
        points: qPoints,
        boolStatements: [...boolStatements],
      };
    } else if (currentQType === 'menjodohkan') {
      newQuestion = {
        id: `q-${Date.now()}`,
        number: nextNumber,
        type: 'menjodohkan',
        text: qText,
        image: qImage,
        points: qPoints,
        matchPairs: [...matchPairs],
      };
    } else {
      newQuestion = {
        id: `q-${Date.now()}`,
        number: nextNumber,
        type: 'isian_singkat',
        text: qText,
        image: qImage,
        points: qPoints,
        shortAnswerKeys: shortAnswerKey
          .split(',')
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean),
      };
    }

    setPackageQuestions([...packageQuestions, newQuestion]);
    showToast(`Soal nomor ${nextNumber} berhasil ditambahkan!`);

    // Reset single question form
    setQText('');
    setQImage(undefined);
    setOptions([
      { id: 'opt-a', label: 'A', text: '', image: undefined },
      { id: 'opt-b', label: 'B', text: '', image: undefined },
      { id: 'opt-c', label: 'C', text: '', image: undefined },
      { id: 'opt-d', label: 'D', text: '', image: undefined },
    ]);
    setShortAnswerKey('');
  };

  // Save complete package
  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageForm.title) {
      showToast('Nama paket ujian harus diisi!', 'error');
      return;
    }
    if (packageQuestions.length === 0) {
      showToast('Tambahkan minimal 1 butir soal ke dalam paket!', 'error');
      return;
    }

    const calculatedPoints = packageQuestions.reduce((acc, q) => acc + q.points, 0);

    store.addExamPackage({
      title: packageForm.title,
      subjectId: packageForm.subjectId || primarySubject.id,
      subjectName: primarySubject.name,
      tingkat: packageForm.tingkat,
      durationMinutes: Number(packageForm.durationMinutes),
      totalPoints: calculatedPoints || packageForm.totalPoints,
      kkm: Number(packageForm.kkm),
      questions: packageQuestions,
      createdByGuruId: currentUser.id,
      createdByName: currentUser.name,
    });

    showToast('Paket Soal CBT baru berhasil disimpan ke Bank Soal!');
    setShowCreatePackageModal(false);
    setPackageQuestions([]);
    setPackageForm({
      title: '',
      subjectId: '',
      tingkat: 7,
      durationMinutes: 45,
      kkm: 75,
      totalPoints: 100,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setQImage(String(event.target?.result));
    };
    reader.readAsDataURL(file);
  };

  // Sidebar Nav Items
  const guruNavItems: NavItem[] = [
    {
      id: 'classes',
      label: 'Ruang Kelas Diampu',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: classes.length,
    },
    {
      id: 'bank_soal',
      label: 'Bank Soal CBT',
      icon: <Layers className="w-4 h-4" />,
      badge: examPackages.length,
    },
    {
      id: 'proctor_all',
      label: 'Monitoring & Proctoring',
      icon: <Video className="w-4 h-4" />,
      badge: violations.length > 0 ? `${violations.length} Alert` : undefined,
    },
    {
      id: 'rekap_all',
      label: 'Rekap Nilai & Hadir',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      badge: submissions.length,
    },
  ];

  return (
    <SidebarLayout
      user={currentUser}
      onLogout={onLogout}
      activeNav={activeNav}
      onSelectNav={(id) => {
        setActiveNav(id);
        setSelectedClass(null);
      }}
      navItems={guruNavItems}
      pageTitle={
        activeNav === 'classes' && selectedClass
          ? `Kelas ${selectedClass.name} - ${primarySubject.name}`
          : activeNav === 'bank_soal'
          ? 'Bank Soal & Paket Ujian'
          : activeNav === 'proctor_all'
          ? 'Pusat Pengawasan Kamera & Pelanggaran CBT'
          : activeNav === 'rekap_all'
          ? 'Rekapitulasi Nilai & Presensi'
          : 'Dashboard Guru Pengampu'
      }
      pageSubtitle={`Guru: ${currentUser.name} (NIP: ${currentUser.nip || '-'}) · TP ${profile.academicYear}`}
      headerAction={
        activeNav === 'bank_soal' ? (
          <button
            onClick={() => {
              setShowCreatePackageModal(true);
              setPackageQuestions([]);
              setPackageForm({
                title: '',
                subjectId: primarySubject.id,
                tingkat: 7,
                durationMinutes: 45,
                kkm: 75,
                totalPoints: 100,
              });
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Paket Soal Baru</span>
          </button>
        ) : undefined
      }
    >
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#0f172a] border border-blue-800 text-white text-xs font-semibold rounded-xl shadow-2xl animate-fade-in">
          {toastMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ================= VIEW 1: KOTAK KELAS YANG DIAMPU ================= */}
      {activeNav === 'classes' && !selectedClass && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-display text-white">
                Ruang Kelas yang Diampu ({classes.length} Kelas)
              </h2>
              <p className="text-xs text-slate-400">
                Pilih ruang kelas untuk mengaktifkan sesi ujian, presensi kehadiran, atau memantau live proctoring.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((cls) => {
              const countSiswa = students.filter((s) => s.kelasId === cls.id).length;
              const activeSess = sessions.find((s) => s.kelasId === cls.id && s.isActive);
              const classViolations = violations.filter((v) => v.kelasId === cls.id);

              return (
                <div
                  key={cls.id}
                  onClick={() => {
                    setSelectedClass(cls);
                    setClassDetailTab('cbt');
                  }}
                  className="relative bg-[#0d1733] border border-blue-900/50 hover:border-blue-500 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:shadow-blue-950 transition-all cursor-pointer group flex flex-col justify-between overflow-hidden"
                >
                  {/* Visual Top Colored Accent */}
                  <div
                    className="absolute top-0 left-0 right-0 h-2"
                    style={{ backgroundColor: cls.themeColor?.accent || '#1a73e8' }}
                  />

                  <div>
                    <div className="flex items-center justify-between mb-3 mt-1">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-950 border border-blue-800/60 text-blue-300 font-mono">
                        Tingkat {cls.tingkat}
                      </span>

                      {activeSess ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-semibold text-[10px] rounded-full">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>CBT Aktif: {activeSess.token}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Belum Ada Sesi</span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold font-display text-white group-hover:text-blue-400 transition-colors">
                      {cls.name}
                    </h3>
                    <p className="text-xs font-semibold text-blue-300 mt-1">
                      {primarySubject.name}
                    </p>

                    <div className="space-y-1 mt-4 text-xs text-slate-400">
                      <div>Wali Kelas: <span className="text-slate-200">{cls.waliKelas}</span></div>
                      <div>Tahun Pelajaran: <span className="font-mono text-slate-200">{profile.academicYear}</span> ({profile.semester})</div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-blue-950 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span>{countSiswa} Siswa</span>
                      {classViolations.length > 0 && (
                        <span className="text-[10px] font-bold text-red-400 bg-red-950/80 border border-red-800 px-1.5 py-0.5 rounded">
                          {classViolations.length} Pelanggaran
                        </span>
                      )}
                    </div>
                    <span className="text-blue-400 font-bold group-hover:translate-x-1 transition-transform">
                      Buka Ruang &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= VIEW 2: DETAIL RUANG KELAS TERPILIH ================= */}
      {activeNav === 'classes' && selectedClass && (
        <div className="space-y-6">
          {/* Header Action & Sub Tabs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0d1733] border border-blue-900/40 rounded-2xl p-4">
            <button
              onClick={() => setSelectedClass(null)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-950 hover:bg-blue-900 border border-blue-800/60 rounded-xl text-xs font-semibold text-blue-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Semua Kelas</span>
            </button>

            <div className="flex items-center gap-1.5 p-1 bg-[#091024] rounded-xl border border-blue-900/60 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setClassDetailTab('cbt')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  classDetailTab === 'cbt'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Sesi & Paket CBT
              </button>
              <button
                onClick={() => setClassDetailTab('hadir')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  classDetailTab === 'hadir'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Daftar Hadir
              </button>
              <button
                onClick={() => setClassDetailTab('rekap')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  classDetailTab === 'rekap'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3. Rekap Nilai
              </button>
              <button
                onClick={() => setClassDetailTab('proctor')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  classDetailTab === 'proctor'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-red-400 hover:bg-red-950/40'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>4. Monitoring (Live)</span>
              </button>
            </div>
          </div>

          {/* TAB 1: SESI CBT & AKTIVASI */}
          {classDetailTab === 'cbt' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sesi Status Card */}
              <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 shadow-xl lg:col-span-1 space-y-4">
                <h3 className="text-base font-bold font-display text-white">
                  Status Sesi CBT {selectedClass.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Kendalikan pembukaan gerbang ujian dan token akses Chromebook siswa.
                </p>

                <div className="p-4 bg-[#080e22] rounded-xl border border-blue-950 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Status Ujian:</span>
                    {currentSession?.isActive ? (
                      <span className="px-2.5 py-0.5 bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold rounded-full">
                        ● AKTIF DIBUKA
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 font-bold rounded-full">
                        TUTUP (NONAKTIF)
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-blue-950">
                    <label className="block text-[11px] font-semibold text-blue-300 mb-1.5">
                      Token Ujian Siswa (Wajib diisi siswa)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Key className="w-3.5 h-3.5 text-blue-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          defaultValue={currentSession?.token || 'SPANJU7'}
                          id="tokenInput"
                          className="w-full pl-8 pr-2 py-1.5 bg-[#0e1b3d] border border-blue-700/60 rounded-lg font-mono font-bold text-blue-300 uppercase tracking-widest text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const val = (document.getElementById('tokenInput') as HTMLInputElement)
                            ?.value;
                          if (val) handleUpdateToken(val);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                </div>

                {/* Release Scores Toggle */}
                <div className="p-4 bg-blue-950/40 rounded-xl border border-blue-800/40 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-200">Rilis Nilai ke Siswa</span>
                    <button
                      onClick={handleToggleReleaseScore}
                      className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                        currentSession?.releaseScores
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {currentSession?.releaseScores ? 'Nilai Dirilis' : 'Disembunyikan'}
                    </button>
                  </div>
                  <p className="text-[11px] text-blue-400">
                    Bila aktif, siswa dapat langsung melihat rincian skor di akunnya setelah menuntaskan ujian.
                  </p>
                </div>
              </div>

              {/* List of Compatible Packages */}
              <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 shadow-xl lg:col-span-2 space-y-4">
                <h3 className="text-base font-bold font-display text-white">
                  Pilih Paket Soal CBT Tingkat {selectedClass.tingkat}
                </h3>
                <p className="text-xs text-slate-400">
                  Dapat digunakan langsung lintas kelas pada tingkat yang sama.
                </p>

                <div className="space-y-3.5">
                  {examPackages
                    .filter((p) => p.tingkat === selectedClass.tingkat)
                    .map((pkg) => {
                      const isCurrentActive =
                        currentSession?.packageId === pkg.id && currentSession.isActive;

                      return (
                        <div
                          key={pkg.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isCurrentActive
                              ? 'bg-blue-950/70 border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                              : 'bg-[#091024] border-blue-950 hover:border-blue-900'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-blue-900/60 border border-blue-700/60 text-blue-300 text-[10px] font-bold rounded font-mono">
                                  Tingkat {pkg.tingkat}
                                </span>
                                <span className="text-xs font-semibold text-slate-300">
                                  {pkg.questions.length} Butir Soal
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white">{pkg.title}</h4>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                <span>Durasi: {pkg.durationMinutes} Menit</span>
                                <span>·</span>
                                <span>KKM: {pkg.kkm}</span>
                                <span>·</span>
                                <span>Total: {pkg.totalPoints} Poin</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleToggleSession(pkg.id)}
                              className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                                isCurrentActive
                                  ? 'bg-red-600 hover:bg-red-500 text-white'
                                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                              }`}
                            >
                              {isCurrentActive ? 'Tutup Sesi Ujian' : 'Aktifkan Paket Ini'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DAFTAR HADIR */}
          {classDetailTab === 'hadir' && (
            <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-display text-white">
                    Presensi Kehadiran Siswa Ujian CBT ({selectedClass.name})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Siswa menandai presensi kehadiran dari akun Chromebook masing-masing.
                  </p>
                </div>
                <button
                  onClick={() => showToast('Presensi kehadiran dibuka untuk siswa kelas ini!')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Buka Sesi Presensi
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-blue-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#091024] border-b border-blue-950 text-blue-300 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">NIS</th>
                      <th className="py-3 px-4">Waktu Presensi</th>
                      <th className="py-3 px-4">Perangkat</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-950 text-slate-300">
                    {students
                      .filter((s) => s.kelasId === selectedClass.id)
                      .map((s) => {
                        const record = attendance.find(
                          (a) => a.studentId === s.id && a.kelasId === selectedClass.id
                        );
                        return (
                          <tr key={s.id} className="hover:bg-blue-950/30">
                            <td className="py-3 px-4 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <span>{s.avatar || '👦'}</span>
                                <span>{s.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">{s.nis}</td>
                            <td className="py-3 px-4 font-mono text-slate-400">
                              {record?.timestamp
                                ? new Date(record.timestamp).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-400">{record?.deviceInfo || 'Chromebook Client'}</td>
                            <td className="py-3 px-4 text-center">
                              {record ? (
                                <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-700/60 text-emerald-300 font-bold rounded-md text-[11px]">
                                  Hadir
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-amber-950 border border-amber-800/60 text-amber-300 font-bold rounded-md text-[11px]">
                                  Belum Presensi
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
          )}

          {/* TAB 3: REKAP NILAI */}
          {classDetailTab === 'rekap' && (
            <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-900/60">
                <div>
                  <h3 className="text-base font-bold font-display text-white">
                    Rekapitulasi Nilai Siswa ({selectedClass.name})
                  </h3>
                  <p className="text-xs text-slate-300">
                    Nilai dihitung otomatis berdasarkan kunci jawaban 5 tipe soal.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Status Rilis Nilai Button for Teacher */}
                  <button
                    onClick={handleToggleReleaseScore}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                      currentSession?.releaseScores
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 ring-2 ring-emerald-500/30'
                        : 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-400 shadow-amber-900/30'
                    }`}
                  >
                    {currentSession?.releaseScores ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Nilai Telah Dirilis ke Siswa (Klik untuk Kunci)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Rilis Nilai Sekarang ke Siswa</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => showToast('Data rekap nilai siap dicetak / diekspor!')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-200 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ekspor Excel</span>
                  </button>
                </div>
              </div>

              {/* Informative Banner regarding score release status */}
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                  currentSession?.releaseScores
                    ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
                    : 'bg-amber-950/50 border-amber-700/60 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {currentSession?.releaseScores ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>
                    {currentSession?.releaseScores
                      ? 'Nilai resmi aktif diumumkan: Siswa yang telah selesai ujian dapat melihat skor akhir dan status kelulusan di akun Chromebook mereka.'
                      : 'Perolehan nilai saat ini dirahasiakan dari siswa. Siswa yang telah selesai mengerjakan hanya melihat bukti pengumpulan tanpa rincian skor sampai Anda menekan tombol "Rilis Nilai Sekarang ke Siswa".'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-blue-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#091024] border-b border-blue-950 text-blue-300 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">NIS</th>
                      <th className="py-3 px-4">Waktu Selesai</th>
                      <th className="py-3 px-4 text-center">Pelanggaran</th>
                      <th className="py-3 px-4 text-center">Skor</th>
                      <th className="py-3 px-4 text-center">Nilai Akhir</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-950 text-slate-300">
                    {students
                      .filter((s) => s.kelasId === selectedClass.id)
                      .map((s) => {
                        const sub = submissions.find(
                          (subm) => subm.studentId === s.id && subm.kelasId === selectedClass.id
                        );
                        const kkm = 75;
                        const isPassed = sub ? sub.percentage >= kkm : false;

                        return (
                          <tr key={s.id} className="hover:bg-blue-950/30">
                            <td className="py-3 px-4 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <span>{s.avatar || '👦'}</span>
                                <span>{s.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">{s.nis}</td>
                            <td className="py-3 px-4 font-mono text-slate-400">
                              {sub?.submittedAt
                                ? new Date(sub.submittedAt).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Belum Selesai'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {sub && sub.violationsCount > 0 ? (
                                <span className="px-2 py-0.5 bg-red-950 border border-red-800 text-red-300 font-bold rounded">
                                  {sub.violationsCount}x
                                </span>
                              ) : (
                                <span className="text-slate-500">0</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-semibold">
                              {sub ? `${sub.score}/${sub.maxScore}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-sm">
                              {sub ? (
                                <span className={isPassed ? 'text-emerald-400' : 'text-rose-400'}>
                                  {sub.percentage}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {sub ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    isPassed
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                                  }`}
                                >
                                  {isPassed ? 'TUNTAS KKM' : 'REMEDIAL'}
                                </span>
                              ) : (
                                <span className="text-slate-500">Belum Ikut</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE PROCTORING KELAS */}
          {classDetailTab === 'proctor' && (
            <ProctorCameraMonitoring
              initialKelasId={selectedClass.id}
              currentUserRole="guru"
              currentUserName={currentUser.name}
            />
          )}
        </div>
      )}

      {/* ================= VIEW 3: BANK SOAL ================= */}
      {activeNav === 'bank_soal' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {examPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-[#0d1733] border border-blue-900/50 hover:border-blue-600/70 rounded-2xl p-6 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 bg-blue-950 border border-blue-800/60 text-blue-300 font-bold text-[11px] rounded-md font-mono">
                      Tingkat {pkg.tingkat}
                    </span>
                    <span className="text-xs text-blue-300 font-mono">
                      KKM: {pkg.kkm}
                    </span>
                  </div>

                  <h3 className="text-base font-bold font-display text-white mb-1">
                    {pkg.title}
                  </h3>
                  <p className="text-xs text-blue-400 font-medium mb-3">{pkg.subjectName}</p>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Durasi: {pkg.durationMinutes} Menit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>Jumlah: {pkg.questions.length} Butir Soal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-blue-400" />
                      <span>Total Poin: {pkg.totalPoints}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-blue-950 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Oleh: {pkg.createdByName}</span>
                  <button
                    onClick={() => {
                      setDeletePackageModal({
                        isOpen: true,
                        pkgId: pkg.id,
                        pkgTitle: pkg.title,
                      });
                    }}
                    className="text-red-400 hover:text-red-300 cursor-pointer p-1 rounded"
                    title="Hapus Paket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= VIEW 4: MONITORING PROCTORING ALL ================= */}
      {activeNav === 'proctor_all' && (
        <div className="space-y-6">
          <ProctorCameraMonitoring
            currentUserRole="guru"
            currentUserName={currentUser.name}
          />

          <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold font-display text-white mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Log Deteksi Pelanggaran Real-Time (Chromebook Client)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Terdeteksi otomatis saat siswa mencoba keluar fullscreen, membuka tab baru, atau membelah layar (split-screen).
            </p>

            <div className="overflow-x-auto rounded-xl border border-blue-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#091024] border-b border-blue-950 text-red-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Jenis Pelanggaran</th>
                    <th className="py-3 px-4">Detail Peringatan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-950 text-slate-300">
                  {violations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Belum ada pelanggaran yang terdeteksi. Ruang ujian aman terkendali.
                      </td>
                    </tr>
                  ) : (
                    violations.map((v) => (
                      <tr key={v.id} className="hover:bg-red-950/20">
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {new Date(v.timestamp).toLocaleTimeString('id-ID')}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{v.studentName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-red-950 border border-red-700 text-red-300 font-bold rounded text-[10px]">
                            {v.type === 'tab_switch'
                              ? 'Pindah Tab'
                              : v.type === 'exit_fullscreen'
                              ? 'Keluar Fullscreen'
                              : v.type === 'split_screen'
                              ? 'Split Screen'
                              : 'Blur Jendela'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{v.message}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-red-400 font-semibold text-[11px]">
                            Tercatat Proctor
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 5: REKAP ALL ================= */}
      {activeNav === 'rekap_all' && (
        <div className="space-y-6">
          <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold font-display text-white mb-2">
              Daftar Seluruh Pengumpulan Ujian Siswa
            </h3>
            <div className="overflow-x-auto rounded-xl border border-blue-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#091024] border-b border-blue-950 text-blue-300 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">Waktu Kumpul</th>
                    <th className="py-3 px-4 text-center">Nilai</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-950 text-slate-300">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-blue-950/30">
                      <td className="py-3 px-4 font-semibold text-white">{sub.studentName}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{sub.studentNis}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {new Date(sub.submittedAt).toLocaleTimeString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-400 font-mono text-sm">
                        {sub.percentage}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            sub.passed
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {sub.passed ? 'TUNTAS' : 'REMEDIAL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: BUAT PAKET SOAL (PERFECT FIXED HEIGHT & SCROLL) ================= */}
      {showCreatePackageModal && (
        <div className="fixed inset-0 z-50 bg-[#060b1c]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[#0e172e] border border-blue-800/60 text-slate-100 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* STICKY MODAL HEADER - ALWAYS VISIBLE AT TOP */}
            <div className="px-6 py-4 border-b border-blue-900/40 bg-[#0a1226] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold font-display text-white">
                  Buat Paket Soal CBT Baru
                </h3>
                <p className="text-xs text-blue-300/80 mt-0.5">
                  Lengkapi data paket ujian & tambahkan butir soal 5 tipe
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePackageModal(false)}
                className="p-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SCROLLABLE MODAL BODY - INTERNAL SCROLLING PREVENTS CUT OFF */}
            <form onSubmit={handleSavePackage} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Basic Package Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#091024] rounded-xl border border-blue-950">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-blue-300 mb-1">
                    Nama / Judul Paket Ujian
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Penilaian Akhir Semester Ganjil Informatika"
                    value={packageForm.title}
                    onChange={(e) => setPackageForm({ ...packageForm, title: e.target.value })}
                    className="w-full p-2.5 bg-[#0f1b38] border border-blue-800/60 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-blue-300 mb-1">
                    Tingkat Kelas (Lintas Kelas)
                  </label>
                  <select
                    value={packageForm.tingkat}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        tingkat: Number(e.target.value) as 7 | 8 | 9,
                      })
                    }
                    className="w-full p-2.5 bg-[#0f1b38] border border-blue-800/60 rounded-xl text-white font-semibold focus:outline-hidden"
                  >
                    <option value={7}>Tingkat 7 (Kelas VII)</option>
                    <option value={8}>Tingkat 8 (Kelas VIII)</option>
                    <option value={9}>Tingkat 9 (Kelas IX)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={packageForm.durationMinutes}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-[#0f1b38] border border-blue-800/60 rounded-xl text-white font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Nilai KKM</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={packageForm.kkm}
                    onChange={(e) => setPackageForm({ ...packageForm, kkm: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#0f1b38] border border-blue-800/60 rounded-xl text-white font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Total Poin Standar</label>
                  <input
                    type="number"
                    value={packageForm.totalPoints}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, totalPoints: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-[#0f1b38] border border-blue-800/60 rounded-xl text-white font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Soal yang sudah ditambahkan */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white">
                    Daftar Butir Soal Terbuat ({packageQuestions.length} Soal)
                  </span>
                  <span className="text-[11px] text-blue-400 font-mono">
                    Total Poin: {packageQuestions.reduce((a, b) => a + b.points, 0)}
                  </span>
                </div>

                {packageQuestions.length === 0 ? (
                  <div className="p-4 bg-[#091024] border border-dashed border-blue-900 rounded-xl text-center text-slate-400 text-xs">
                    Belum ada butir soal. Lengkapi isian di bawah lalu klik tombol &quot;Tambahkan Soal Ini ke Paket&quot;.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {packageQuestions.map((q, i) => (
                      <div
                        key={q.id}
                        className="p-3 bg-[#091024] border border-blue-900/60 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-semibold text-slate-200 truncate max-w-md">
                            [{q.type.replace('_', ' ').toUpperCase()}] {q.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-blue-300">{q.points} Poin</span>
                          <button
                            type="button"
                            onClick={() =>
                              setPackageQuestions(packageQuestions.filter((item) => item.id !== q.id))
                            }
                            className="text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sub-Form: Tambah 1 Butir Soal dengan 5 Tipe */}
              <div className="p-5 bg-[#091024] border border-blue-900/80 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="font-bold text-blue-300 text-sm">
                    Tambah Butir Soal Baru:
                  </span>
                  <select
                    value={currentQType}
                    onChange={(e) => setCurrentQType(e.target.value as QuestionType)}
                    className="p-2 bg-[#0e172e] border border-blue-700/60 rounded-xl text-xs font-semibold text-blue-200 focus:outline-hidden"
                  >
                    <option value="pilihan_ganda">1. Pilihan Ganda (Single Choice)</option>
                    <option value="pilihan_ganda_kompleks">2. Pilihan Ganda Kompleks (Multi Select)</option>
                    <option value="benar_salah">3. Benar / Salah (Tabel Pernyataan)</option>
                    <option value="menjodohkan">4. Menjodohkan (Pasangan Kolom)</option>
                    <option value="isian_singkat">5. Isian Singkat</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Pertanyaan / Teks Soal
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan pertanyaan soal secara jelas..."
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    className="w-full p-2.5 bg-[#0f1b38] border border-blue-800/60 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Optional Image Upload for Question */}
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f1b38] hover:bg-[#132349] border border-blue-800/60 rounded-lg text-xs font-semibold text-blue-300 cursor-pointer">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>{qImage ? 'Ganti Gambar Soal' : 'Unggah Gambar Soal (Opsional)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                  {qImage && (
                    <div className="flex items-center gap-2">
                      <img
                        src={qImage}
                        alt="Preview"
                        className="w-10 h-10 object-cover rounded border border-blue-800"
                      />
                      <button
                        type="button"
                        onClick={() => setQImage(undefined)}
                        className="text-red-400 text-xs font-semibold"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="font-semibold text-slate-300">Poin Soal:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={qPoints}
                      onChange={(e) => setQPoints(Number(e.target.value))}
                      className="w-16 p-1.5 bg-[#0f1b38] border border-blue-800/60 rounded-lg text-center font-mono text-white"
                    />
                  </div>
                </div>

                {/* DYNAMIC ANSWER INPUTS ACCORDING TO QUESTION TYPE */}
                {(currentQType === 'pilihan_ganda' || currentQType === 'pilihan_ganda_kompleks') && (
                  <div className="space-y-2 pt-2 border-t border-blue-900/60">
                    <span className="block font-semibold text-blue-300">
                      Opsi Jawaban & Kunci Jawaban:
                    </span>
                    {options.map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        {currentQType === 'pilihan_ganda' ? (
                          <input
                            type="radio"
                            name="correctPg"
                            checked={correctPgAnswer === opt.id}
                            onChange={() => setCorrectPgAnswer(opt.id)}
                            className="w-4 h-4 text-blue-600 cursor-pointer"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={correctPgComplex.includes(opt.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCorrectPgComplex([...correctPgComplex, opt.id]);
                              } else {
                                setCorrectPgComplex(correctPgComplex.filter((x) => x !== opt.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                          />
                        )}
                        <span className="font-bold w-6 text-slate-300">{opt.label}.</span>
                        <input
                          type="text"
                          placeholder={`Teks Opsi ${opt.label}`}
                          value={opt.text}
                          onChange={(e) => {
                            const updated = [...options];
                            updated[idx].text = e.target.value;
                            setOptions(updated);
                          }}
                          className="flex-1 p-2 bg-[#0f1b38] border border-blue-800/60 rounded-lg text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {currentQType === 'benar_salah' && (
                  <div className="space-y-2 pt-2 border-t border-blue-900/60">
                    <span className="block font-semibold text-blue-300">
                      Pernyataan dan Status Kebenarannya:
                    </span>
                    {boolStatements.map((bs, idx) => (
                      <div key={bs.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Pernyataan ${idx + 1}`}
                          value={bs.statement}
                          onChange={(e) => {
                            const updated = [...boolStatements];
                            updated[idx].statement = e.target.value;
                            setBoolStatements(updated);
                          }}
                          className="flex-1 p-2 bg-[#0f1b38] border border-blue-800/60 rounded-lg text-xs text-white"
                        />
                        <select
                          value={bs.correctAnswer ? 'true' : 'false'}
                          onChange={(e) => {
                            const updated = [...boolStatements];
                            updated[idx].correctAnswer = e.target.value === 'true';
                            setBoolStatements(updated);
                          }}
                          className="p-2 bg-[#0f1b38] border border-blue-800/60 rounded-lg text-xs font-bold text-white"
                        >
                          <option value="true">BENAR</option>
                          <option value="false">SALAH</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {currentQType === 'menjodohkan' && (
                  <div className="space-y-2 pt-2 border-t border-blue-900/60">
                    <span className="block font-semibold text-blue-300">
                      Pasangan Kolom Kiri (Premis) dan Kolom Kanan (Jawaban Pasangan):
                    </span>
                    {matchPairs.map((mp, idx) => (
                      <div key={mp.id} className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder={`Premis Kiri ${idx + 1}`}
                          value={mp.premise}
                          onChange={(e) => {
                            const updated = [...matchPairs];
                            updated[idx].premise = e.target.value;
                            setMatchPairs(updated);
                          }}
                          className="p-2 bg-[#0f1b38] border border-blue-800/60 rounded-lg text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder={`Pasangan Kanan ${idx + 1}`}
                          value={mp.correctMatch}
                          onChange={(e) => {
                            const updated = [...matchPairs];
                            updated[idx].correctMatch = e.target.value;
                            setMatchPairs(updated);
                          }}
                          className="p-2 bg-[#0f1b38] border border-blue-800/60 rounded-lg text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {currentQType === 'isian_singkat' && (
                  <div className="space-y-2 pt-2 border-t border-blue-900/60">
                    <label className="block font-semibold text-blue-300">
                      Kunci Jawaban Singkat (Pisahkan dengan koma):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: chrome os, chromeos, google chrome"
                      value={shortAnswerKey}
                      onChange={(e) => setShortAnswerKey(e.target.value)}
                      className="w-full p-2.5 bg-[#0f1b38] border border-blue-800/60 rounded-xl text-xs font-mono text-white"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddQuestionToPackage}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                >
                  + Tambahkan Soal Ini ke Paket
                </button>
              </div>

              {/* STICKY MODAL FOOTER */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-blue-900/60">
                <button
                  type="button"
                  onClick={() => setShowCreatePackageModal(false)}
                  className="px-4 py-2.5 bg-[#091024] hover:bg-[#0f1b38] text-slate-300 font-semibold rounded-xl cursor-pointer border border-blue-950"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
                >
                  Simpan Paket Soal ke Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL KONFIRMASI HAPUS PAKET SOAL ================= */}
      {deletePackageModal && deletePackageModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0e172e] border border-red-900/60 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400 shrink-0 shadow-lg shadow-red-950/50">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-white">Hapus Paket Soal</h3>
                <p className="text-xs text-red-400/90 font-medium">Konfirmasi Penghapusan</p>
              </div>
            </div>

            <div className="bg-[#081024] p-4 rounded-2xl border border-blue-950/80 space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                Apakah Anda yakin ingin menghapus paket soal ini dari Bank Soal?
              </p>
              <div className="px-3 py-1.5 bg-red-950/40 border border-red-900/40 rounded-xl text-xs font-semibold text-red-300 font-mono truncate">
                Judul: {deletePackageModal.pkgTitle}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletePackageModal(null)}
                className="px-4 py-2.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  store.deleteExamPackage(deletePackageModal.pkgId);
                  showToast('Paket soal berhasil dihapus.');
                  setDeletePackageModal(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-red-600/30 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Paket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
};
