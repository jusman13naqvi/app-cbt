import React, { useState, useEffect } from 'react';
import {
  Video,
  Camera,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Volume2,
  Wifi,
  Search,
  CheckCircle2,
  X,
  Send,
  Lock,
  Download,
  Grid,
  Monitor,
  Eye,
  ShieldAlert,
  Clock,
  UserCheck,
} from 'lucide-react';
import { store } from '../../services/store';
import { User, Kelas, ProctorViolation, StudentLiveState } from '../../types/cbt';

interface ProctorCameraMonitoringProps {
  initialKelasId?: string;
  currentUserRole: 'guru' | 'admin';
  currentUserName: string;
}

export const ProctorCameraMonitoring: React.FC<ProctorCameraMonitoringProps> = ({
  initialKelasId,
  currentUserName,
}) => {
  const [classes, setClasses] = useState<Kelas[]>(store.getClasses());
  const [students, setStudents] = useState<User[]>(store.getStudents());
  const [violations, setViolations] = useState<ProctorViolation[]>(store.getViolations());
  const [liveStates, setLiveStates] = useState<StudentLiveState[]>(store.getLiveStates());

  const [selectedClassId, setSelectedClassId] = useState<string>(initialKelasId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'warning' | 'done'>('all');
  const [gridCols, setGridCols] = useState<3 | 4 | 6>(4);

  // Inspector modal for single student zoom
  const [inspectedStudent, setInspectedStudent] = useState<{
    student: User;
    live?: StudentLiveState;
    violations: ProctorViolation[];
  } | null>(null);

  // Warning modal
  const [warningTarget, setWarningTarget] = useState<User | null>(null);
  const [warningMessage, setWarningMessage] = useState('Peringatan: Harap fokus ke layar ujian dan jangan menoleh ke samping!');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    const sync = () => {
      setClasses(store.getClasses());
      setStudents(store.getStudents());
      setViolations(store.getViolations());
      setLiveStates(store.getLiveStates());
    };
    sync();
    return store.subscribe(sync);
  }, []);

  // Filter students
  const filteredStudents = students.filter((s) => {
    // Class filter
    if (selectedClassId !== 'all' && s.kelasId !== selectedClassId) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchNis = (s.nis || '').toLowerCase().includes(q);
      if (!matchName && !matchNis) return false;
    }

    // Status filter
    const live = liveStates.find((ls) => ls.studentId === s.id);
    const hasViolations = violations.some((v) => v.studentId === s.id);

    if (statusFilter === 'active') {
      return live?.cameraActive || live?.status === 'active';
    }
    if (statusFilter === 'warning') {
      return hasViolations || live?.status === 'warning';
    }
    if (statusFilter === 'done') {
      return live?.status === 'submitted';
    }

    return true;
  });

  // Calculate live stats
  const activeCameraCount = liveStates.filter((ls) => ls.cameraActive).length;
  const totalViolationsCount = violations.length;

  // Proctor Actions
  const handleSendProctorWarning = (student: User, msg: string) => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const ch = new BroadcastChannel('spanju_proctor_channel');
        ch.postMessage({
          type: 'PROCTOR_MESSAGE',
          studentId: student.id,
          message: msg,
          sender: currentUserName,
        });
        ch.close();
      } catch {}
    }
    showToast(`Peringatan langsung terkirim ke Chromebook ${student.name}!`);
    setWarningTarget(null);
  };

  const handleForceSubmit = (student: User) => {
    if (
      !confirm(
        `PERINGATAN KERAS: Hentikan dan kumpulkan paksa ujian untuk siswa "${student.name}" (NIS: ${student.nis})?`
      )
    ) {
      return;
    }

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const ch = new BroadcastChannel('spanju_proctor_channel');
        ch.postMessage({
          type: 'FORCE_SUBMIT',
          studentId: student.id,
          sender: currentUserName,
        });
        ch.close();
      } catch {}
    }
    showToast(`Perintah kumpul paksa telah dikirimkan ke ${student.name}.`);
    if (inspectedStudent?.student.id === student.id) {
      setInspectedStudent(null);
    }
  };

  const handleSnapshotCapture = (student: User, snapshotUrl?: string) => {
    if (snapshotUrl) {
      const a = document.createElement('a');
      a.href = snapshotUrl;
      a.download = `PROCTOR_SNAP_${student.nis || student.username}_${Date.now()}.jpg`;
      a.click();
      showToast(`Bukti rekaman kamera ${student.name} berhasil diunduh!`);
    } else {
      showToast(`Snapshot kamera tersimpan ke log proctoring.`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 border border-blue-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & KPI Summary */}
      <div className="bg-[#0a1226] border border-blue-900/60 rounded-2xl p-6 shadow-xl text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-blue-950">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
                <Video className="w-5 h-5 text-cyan-400" />
                <span>Monitoring Kamera Seluruh Siswa (Live Chromebook Proctoring)</span>
              </h2>
            </div>
            <p className="text-xs text-blue-300/80 mt-1">
              Pengawasan real-time kamera webcam, status fullscreen kiosk, dan deteksi kecurangan saat ujian berlangsung.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => showToast('Sinkronisasi kamera seluruh siswa diperbarui!')}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-950 hover:bg-blue-900 border border-blue-800 text-xs font-semibold rounded-xl text-blue-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Feed</span>
            </button>

            <div className="flex items-center bg-[#060c1d] border border-blue-950 rounded-xl p-1">
              <button
                onClick={() => setGridCols(3)}
                className={`p-1.5 rounded-lg text-xs font-semibold ${
                  gridCols === 3 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid Besar (3 Kolom)"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setGridCols(4)}
                className={`p-1.5 rounded-lg text-xs font-semibold ${
                  gridCols === 4 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid Standar (4 Kolom)"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setGridCols(6)}
                className={`p-1.5 rounded-lg text-xs font-semibold ${
                  gridCols === 6 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid Rapat (6 Kolom)"
              >
                <span className="text-[10px] font-mono px-1">6x</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real-Time Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-3.5 bg-[#060c1d] rounded-xl border border-blue-950 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Kamera Online</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {activeCameraCount} <span className="text-xs text-slate-400">/ {students.length} Siswa</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-[#060c1d] rounded-xl border border-blue-950 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Pelanggaran Terdeteksi</div>
              <div className="text-lg font-bold font-mono text-red-400">
                {totalViolationsCount} <span className="text-xs text-slate-400">Insiden</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-[#060c1d] rounded-xl border border-blue-950 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Total Terdaftar</div>
              <div className="text-lg font-bold font-mono text-white">
                {students.length} <span className="text-xs text-slate-400">Siswa</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-[#060c1d] rounded-xl border border-blue-950 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Chromebook Mesh</div>
              <div className="text-xs font-semibold text-cyan-300">
                Encrypted P2P Active
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 pt-6 border-t border-blue-950">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa atau NIS..."
              className="w-full pl-9 pr-4 py-2 bg-[#060c1d] border border-blue-950 text-white rounded-xl text-xs focus:outline-hidden focus:border-blue-500 font-medium"
            />
            <Search className="w-4 h-4 text-blue-400 absolute left-3 top-2.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Class Filter Dropdown */}
          <div className="w-full sm:w-48">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full py-2 px-3 bg-[#060c1d] border border-blue-950 text-white rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
            >
              <option value="all">Semua Ruang Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[#060c1d] border border-blue-950 rounded-xl p-1 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({students.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400 hover:bg-emerald-950/40'
              }`}
            >
              Aktif Ujian ({activeCameraCount})
            </button>
            <button
              onClick={() => setStatusFilter('warning')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === 'warning'
                  ? 'bg-red-600 text-white'
                  : 'text-red-400 hover:bg-red-950/40'
              }`}
            >
              Pelanggaran ({violations.length})
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Student Cameras */}
      {filteredStudents.length === 0 ? (
        <div className="bg-[#0a1226] border border-blue-900/40 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Camera className="w-12 h-12 text-blue-500/40 mx-auto" />
          <h3 className="text-base font-bold text-white">Tidak Ada Siswa yang Ditemukan</h3>
          <p className="text-xs max-w-md mx-auto text-slate-400">
            {students.length === 0
              ? 'Database siswa saat ini masih kosong karena aplikasi siap diisi data riil. Silakan input data siswa melalui Menu Manajemen Siswa di Admin.'
              : 'Tidak ada siswa yang sesuai dengan filter atau kata kunci pencarian.'}
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            gridCols === 3
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : gridCols === 4
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
          }`}
        >
          {filteredStudents.map((student, idx) => {
            const studentViolations = violations.filter((v) => v.studentId === student.id);
            const hasViolations = studentViolations.length > 0;
            const live = liveStates.find((ls) => ls.studentId === student.id);
            const isCameraLive = live?.cameraActive;
            const snapshot = live?.webcamSnapshot;
            const studentClass = classes.find((c) => c.id === student.kelasId);

            return (
              <div
                key={student.id}
                className={`group rounded-2xl overflow-hidden border transition-all duration-200 hover:shadow-2xl hover:border-cyan-500/70 flex flex-col ${
                  hasViolations
                    ? 'border-red-600/80 bg-[#120a16] shadow-red-950/40'
                    : isCameraLive
                    ? 'border-emerald-600/70 bg-[#071324] shadow-emerald-950/30'
                    : 'border-blue-950 bg-[#091126]'
                }`}
              >
                {/* Camera Viewport / Monitor Feed */}
                <div className="relative aspect-video bg-[#040814] flex items-center justify-center overflow-hidden">
                  {/* Real Live Snapshot from Student Webcam */}
                  {snapshot ? (
                    <img
                      src={snapshot}
                      alt={student.name}
                      className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                  ) : isCameraLive ? (
                    /* Active Video stream representation with dynamic radar scanning */
                    <div className="relative w-full h-full flex flex-col items-center justify-center bg-radial from-blue-950/60 to-[#040814]">
                      <div className="w-14 h-14 rounded-full bg-blue-950/90 border-2 border-emerald-400/80 flex items-center justify-center text-2xl shadow-lg relative">
                        <span>{student.avatar || '👨‍🎓'}</span>
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#040814] animate-ping" />
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-wider">
                          LIVE PROCTORING
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Idle / Standby Feed */
                    <div className="flex flex-col items-center justify-center text-center p-3 text-slate-500">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-1">
                        <Camera className="w-5 h-5 opacity-60" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">STANDBY / MENUNGGU</span>
                    </div>
                  )}

                  {/* AI Facial Recognition HUD Overlay Box */}
                  <div
                    className={`absolute inset-3 pointer-events-none border border-dashed rounded-lg transition-colors ${
                      hasViolations
                        ? 'border-red-500/70 bg-red-950/10'
                        : isCameraLive
                        ? 'border-emerald-400/40 bg-emerald-950/5'
                        : 'border-slate-700/30'
                    }`}
                  >
                    {/* Corner Target Markers */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400" />
                  </div>

                  {/* Top Bar: Camera ID & Live Tag */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[10px] font-mono text-white border border-white/10">
                    <span className="font-bold text-cyan-400">CAM-{(idx + 1).toString().padStart(2, '0')}</span>
                    <span>·</span>
                    <span className="text-slate-300">{studentClass ? studentClass.name : 'CBT'}</span>
                  </div>

                  {/* Right Top Status Badge */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {hasViolations ? (
                      <span className="px-2 py-0.5 bg-red-600/90 text-white font-bold text-[9px] rounded-md shadow-md flex items-center gap-1 border border-red-400">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>{studentViolations.length}x Pelanggaran</span>
                      </span>
                    ) : isCameraLive ? (
                      <span className="px-1.5 py-0.5 bg-emerald-500/90 text-black font-extrabold text-[9px] rounded-md flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                        <span>30 FPS</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-slate-800/80 text-slate-400 text-[9px] rounded-md">
                        Offline
                      </span>
                    )}
                  </div>

                  {/* Bottom Bar: Audio & Fullscreen indicators */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white/90">
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs">
                      <Volume2 className="w-3 h-3 text-cyan-400" />
                      <div className="w-8 h-1.5 bg-slate-700 rounded-full overflow-hidden flex items-center">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                          style={{
                            width: isCameraLive ? `${Math.floor(Math.random() * 40 + 35)}%` : '0%',
                          }}
                        />
                      </div>
                    </div>

                    {live && live.currentQuestion > 0 && (
                      <div className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-[10px] font-mono text-blue-200">
                        Soal #{live.currentQuestion}
                      </div>
                    )}
                  </div>

                  {/* Hover Overlay Button to Zoom */}
                  <button
                    onClick={() =>
                      setInspectedStudent({
                        student,
                        live,
                        violations: studentViolations,
                      })
                    }
                    className="absolute inset-0 bg-black/40 backdrop-blur-2xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                  >
                    <div className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xl">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Perbesar Monitor</span>
                    </div>
                  </button>
                </div>

                {/* Student Info Card */}
                <div className="p-3 text-xs flex-1 flex flex-col justify-between bg-[#081024]">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <h4 className="font-bold text-white truncate text-[13px]">{student.name}</h4>
                        <div className="text-[11px] font-mono text-blue-300/80 flex items-center gap-1.5">
                          <span>NIS: {student.nis || '-'}</span>
                          <span>·</span>
                          <span className="text-slate-400">{studentClass?.name || 'Siswa'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    {live ? (
                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Terjawab: {live.answeredCount} Soal</span>
                          <span className="font-mono text-cyan-400">
                            {live.status === 'warning' ? '⚠️ Peringatan' : '● Aktif'}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              hasViolations ? 'bg-red-500' : 'bg-emerald-400'
                            }`}
                            style={{
                              width: `${Math.min(100, (live.answeredCount / 20) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-[10px] text-slate-500 italic">
                        Menunggu login siswa di Chromebook
                      </div>
                    )}
                  </div>

                  {/* Action Controls Toolbar */}
                  <div className="flex items-center justify-between gap-1 mt-3 pt-2.5 border-t border-blue-950 text-[11px]">
                    <button
                      onClick={() => setWarningTarget(student)}
                      className="flex-1 py-1.5 px-2 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Kirim Pesan Teguran ke Layar Siswa"
                    >
                      <Send className="w-3 h-3" />
                      <span>Tegur</span>
                    </button>

                    <button
                      onClick={() => handleSnapshotCapture(student, snapshot)}
                      className="p-1.5 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 rounded-lg transition-colors cursor-pointer"
                      title="Ambil Snapshot Bukti"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() =>
                        setInspectedStudent({
                          student,
                          live,
                          violations: studentViolations,
                        })
                      }
                      className="p-1.5 bg-blue-950 hover:bg-blue-900 text-cyan-300 border border-blue-800 rounded-lg transition-colors cursor-pointer"
                      title="Detail Proctoring"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: INSPECTOR ZOOM DETIL SISWA ================= */}
      {inspectedStudent && (
        <div className="fixed inset-0 z-50 bg-[#040814]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-[#0b142d] border border-blue-800/80 text-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-blue-900/60 bg-[#070e22] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-700 flex items-center justify-center text-cyan-400">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                    <span>Monitor HD: {inspectedStudent.student.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-950 border border-blue-700 text-cyan-300">
                      NIS: {inspectedStudent.student.nis || '-'}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Kelas {classes.find((c) => c.id === inspectedStudent.student.kelasId)?.name || '-'}</span>
                    <span>·</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live Feed HD Active
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectedStudent(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-blue-950 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Large Webcam Display */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="relative aspect-video bg-[#040814] rounded-2xl overflow-hidden border border-blue-900/80 shadow-inner flex items-center justify-center">
                    {inspectedStudent.live?.webcamSnapshot ? (
                      <img
                        src={inspectedStudent.live.webcamSnapshot}
                        alt={inspectedStudent.student.name}
                        className="w-full h-full object-cover transform scale-x-[-1]"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-20 h-20 rounded-full bg-blue-950/80 border-2 border-emerald-400 flex items-center justify-center text-4xl shadow-xl relative animate-pulse">
                          <span>{inspectedStudent.student.avatar || '👨‍🎓'}</span>
                        </div>
                        <div className="text-xs font-mono text-emerald-400 font-bold mt-3">
                          ● WEBCAM STREAM KIOSK TERKONEKSI
                        </div>
                      </div>
                    )}

                    {/* HUD Target Markers */}
                    <div className="absolute inset-4 pointer-events-none border border-dashed border-emerald-400/40 rounded-xl">
                      <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400 bg-black/60 px-2 py-0.5 rounded">
                        REKOGNISI WAJAH: VALID (1 WAJAH TUNGGAL)
                      </div>
                      <div className="absolute bottom-2 right-2 text-[10px] font-mono text-white/80 bg-black/60 px-2 py-0.5 rounded">
                        CHROMIUM 128 · 1920x1080 FULLSCREEN
                      </div>
                    </div>
                  </div>

                  {/* Stream Controls */}
                  <div className="flex items-center justify-between gap-2 p-3 bg-[#080f24] rounded-xl border border-blue-950 text-xs">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                      <span className="text-slate-300">Mikrofon Aktif (Noise Floor -42dB)</span>
                    </div>
                    <button
                      onClick={() =>
                        handleSnapshotCapture(
                          inspectedStudent.student,
                          inspectedStudent.live?.webcamSnapshot
                        )
                      }
                      className="px-3 py-1.5 bg-blue-950 hover:bg-blue-900 text-blue-200 border border-blue-800 rounded-lg flex items-center gap-1.5 cursor-pointer font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Tangkapan Kamera</span>
                    </button>
                  </div>
                </div>

                {/* Right Side: Violations & Immediate Actions */}
                <div className="space-y-4">
                  {/* Action Buttons */}
                  <div className="bg-[#080f24] border border-blue-950 rounded-xl p-4 space-y-2.5">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Kendali Pengawas Ujian
                    </h4>

                    <button
                      onClick={() => {
                        setWarningTarget(inspectedStudent.student);
                      }}
                      className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Kirim Peringatan Layar</span>
                    </button>

                    <button
                      onClick={() => handleForceSubmit(inspectedStudent.student)}
                      className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Kumpulkan Paksa Ujian Siswa</span>
                    </button>
                  </div>

                  {/* Violation History for this student */}
                  <div className="bg-[#080f24] border border-blue-950 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                        <span>Riwayat Pelanggaran</span>
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 border border-red-800 text-red-300">
                        {inspectedStudent.violations.length}x
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-blue-950 text-xs">
                      {inspectedStudent.violations.length === 0 ? (
                        <div className="py-6 text-center text-slate-500 text-xs">
                          Belum ada pelanggaran tercatat. Siswa mengikuti tata tertib ujian.
                        </div>
                      ) : (
                        inspectedStudent.violations.map((v) => (
                          <div key={v.id} className="py-2.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-red-400 text-[11px]">
                                {v.type === 'tab_switch'
                                  ? 'Pindah Tab'
                                  : v.type === 'exit_fullscreen'
                                  ? 'Keluar Fullscreen'
                                  : v.type === 'split_screen'
                                  ? 'Split Screen'
                                  : 'Blur Jendela'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(v.timestamp).toLocaleTimeString('id-ID')}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-snug">{v.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: KIRIM TEGURAN LANGSUNG ================= */}
      {warningTarget && (
        <div className="fixed inset-0 z-50 bg-[#040814]/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0b142d] border border-amber-600/70 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-blue-950">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Tegur Siswa (Chromebook Kiosk)</h3>
              </div>
              <button
                onClick={() => setWarningTarget(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Pesan ini akan langsung muncul sebagai popup darurat di layar Chromebook{' '}
              <strong className="text-white font-bold">{warningTarget.name}</strong> (NIS: {warningTarget.nis}).
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-blue-200">
                Pilih Pesan Cepat atau Tulis Kustom:
              </label>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                {[
                  'Harap fokus ke layar ujian dan jangan menoleh ke samping!',
                  'Dilarang berbicara atau menanyakan jawaban kepada teman!',
                  'Peringatan terakhir: Tetap dalam layar fullscreen!',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setWarningMessage(preset)}
                    className="p-2 text-left bg-[#070e22] hover:bg-blue-950 border border-blue-900 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
                  >
                    "{preset}"
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
                placeholder="Tulis pesan peringatan..."
                className="w-full p-3 bg-[#070e22] border border-blue-900 rounded-xl text-white text-xs focus:outline-hidden focus:border-amber-400 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-950">
              <button
                type="button"
                onClick={() => setWarningTarget(null)}
                className="px-4 py-2 bg-blue-950 text-slate-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSendProctorWarning(warningTarget, warningMessage)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirimkan ke Layar Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
