import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  ExamPackage,
  ClassExamSession,
  Question,
  ExamSubmission,
} from '../../types/cbt';
import { store } from '../../services/store';
import { supabaseService } from '../../services/supabase';
import confetti from 'canvas-confetti';
import {
  Clock,
  ShieldAlert,
  CheckCircle,
  Video,
  ArrowRight,
  ArrowLeft,
  Bookmark,
  Check,
  Award,
  AlertOctagon,
  Maximize2,
  Lock,
  X,
} from 'lucide-react';

interface CbtExamRunnerProps {
  currentUser: User;
  session: ClassExamSession;
  examPackage: ExamPackage;
  onFinishExam: () => void;
}

export const CbtExamRunner: React.FC<CbtExamRunnerProps> = ({
  currentUser,
  session,
  examPackage,
  onFinishExam,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({}); // Ragu-ragu
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(
    examPackage.durationMinutes * 60
  );
  const [violationsCount, setViolationsCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScoreData, setFinalScoreData] = useState<ExamSubmission | null>(null);

  // Webcam stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // Track if fullscreen is locked
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Initialize camera and fullscreen
  useEffect(() => {
    // 1. Enter Fullscreen
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch (err) {
        console.warn('Fullscreen request blocked or canceled:', err);
      }
    };
    enterFullscreen();

    // 2. Start Webcam
    let localStream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 320, height: 240 } })
      .then((stream) => {
        localStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      })
      .catch((err) => {
        console.warn('Webcam permission denied or not found:', err);
        setCameraError(true);
      });

    // 3. Security Event Handlers (Anti-Menyontek Strict Mode)
    const handleTriggerViolation = (
      type: 'tab_switch' | 'exit_fullscreen' | 'split_screen' | 'screenshot_blocked' | 'blur_window',
      msg: string
    ) => {
      if (isFinished) return;

      setViolationsCount((prev) => {
        const next = prev + 1;
        store.recordViolation({
          examSessionId: session.id,
          studentId: currentUser.id,
          studentName: currentUser.name,
          studentNis: currentUser.nis || 'NIS',
          kelasId: currentUser.kelasId || session.kelasId,
          type,
          message: `${msg} (Pelanggaran ke-${next})`,
        });

        setWarningMessage(`PERINGATAN CBT: ${msg}. Percobaan pelanggaran telah dicatat oleh pengawas!`);
        setShowWarningModal(true);

        if (next >= 4) {
          // Auto submit if exceeded limit
          alert('Ujian dihentikan otomatis karena telah melebihi batas toleransi pelanggaran!');
          handleFinish(true);
        }

        return next;
      });
    };

    // Fullscreen exit detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isFinished) {
        setIsFullscreen(false);
        handleTriggerViolation('exit_fullscreen', 'Siswa keluar dari mode Fullscreen Chromebook');
      } else {
        setIsFullscreen(true);
      }
    };

    // Tab switch & visibility change detection
    const handleVisibilityChange = () => {
      if (document.hidden && !isFinished) {
        handleTriggerViolation('tab_switch', 'Siswa berpindah tab browser atau meminimalkan layar');
      }
    };

    const handleWindowBlur = () => {
      if (!isFinished) {
        handleTriggerViolation('blur_window', 'Jendela ujian kehilangan fokus');
      }
    };

    // Split screen detection (Chromebook resize event)
    const handleResize = () => {
      if (window.innerWidth < screen.width * 0.75 && !isFinished) {
        handleTriggerViolation('split_screen', 'Terdeteksi upaya pembelahan layar (Split-Screen)');
      }
    };

    // Prevent key shortcuts (Screenshot, devtools, print, refresh)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'p' || e.key === 'r')) ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        handleTriggerViolation('screenshot_blocked', `Percobaan shortcut keyboard (${e.key}) diblokir`);
      }
    };

    // Prevent right click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isFinished]);

  // Proctor Live Stream heartbeat: Broadcast webcam snapshots & status to proctor dashboard
  useEffect(() => {
    if (isFinished) {
      store.removeLiveState(currentUser.id);
      return;
    }

    const broadcastHeartbeat = () => {
      let snapshot: string | undefined = undefined;
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 120;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, 160, 120);
            snapshot = canvas.toDataURL('image/jpeg', 0.45);
          }
        } catch {}
      }

      store.updateLiveState({
        studentId: currentUser.id,
        studentName: currentUser.name,
        nis: currentUser.nis || 'NIS',
        kelasId: currentUser.kelasId || session.kelasId,
        examSessionId: session.id,
        currentQuestion: currentIdx + 1,
        answeredCount: Object.keys(answers).length,
        violationsCount: violationsCount,
        status: violationsCount >= 3 ? 'warning' : 'active',
        lastPing: new Date().toISOString(),
        cameraActive: cameraActive,
        webcamSnapshot: snapshot,
      });
    };

    broadcastHeartbeat();
    const interval = setInterval(broadcastHeartbeat, 2500);

    return () => {
      clearInterval(interval);
      store.removeLiveState(currentUser.id);
    };
  }, [isFinished, cameraActive, currentIdx, answers, violationsCount]);

  // Listen for warnings or messages from teacher/proctor
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      const ch = new BroadcastChannel('spanju_proctor_channel');
      ch.onmessage = (e) => {
        if (e.data?.type === 'PROCTOR_MESSAGE' && e.data?.studentId === currentUser.id) {
          setWarningMessage(e.data.message || 'Peringatan dari Pengawas Ujian!');
          setShowWarningModal(true);
        } else if (e.data?.type === 'FORCE_SUBMIT' && e.data?.studentId === currentUser.id) {
          alert('Ujian Anda telah dihentikan dan dikumpulkan paksa oleh Pengawas Ujian.');
          handleFinish(true);
        }
      };
      return () => ch.close();
    } catch {}
  }, []);

  // Countdown Timer
  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      handleFinish(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeftSeconds]);

  const [questions, setQuestions] = useState<Question[]>(examPackage.questions || []);

  // Ambil butir soal dari tabel 'soal' (Supabase / Cloud SQL)
  useEffect(() => {
    let isMounted = true;
    const loadQuestions = async () => {
      try {
        const remoteQuestions = await supabaseService.getSoal(examPackage.id);
        if (isMounted && remoteQuestions && remoteQuestions.length > 0) {
          setQuestions(remoteQuestions);
        }
      } catch (err) {
        console.warn('Menggunakan soal bawaan paket:', err);
      }
    };
    loadQuestions();
    return () => {
      isMounted = false;
    };
  }, [examPackage.id]);

  const currentQ = questions[currentIdx] || questions[0];

  // Helper to update answers
  const handleSelectAnswer = (qId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  // Toggle Ragu-ragu
  const toggleFlag = (qId: string) => {
    setFlagged((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Calculate final score
  const handleFinish = (force = false) => {
    if (!force && !showConfirmModal) {
      setShowConfirmModal(true);
      return;
    }

    let calculatedScore = 0;
    let maxPossibleScore = 0;

    questions.forEach((q) => {
      maxPossibleScore += q.points;
      const userAns = answers[q.id];
      if (!userAns) return;

      if (q.type === 'pilihan_ganda') {
        if (q.correctAnswers && q.correctAnswers[0] === userAns) {
          calculatedScore += q.points;
        }
      } else if (q.type === 'pilihan_ganda_kompleks') {
        const correctSet = new Set(q.correctAnswers || []);
        const userSet = new Set(Array.isArray(userAns) ? userAns : []);
        if (
          correctSet.size === userSet.size &&
          [...correctSet].every((x) => userSet.has(x))
        ) {
          calculatedScore += q.points;
        } else if ([...userSet].some((x) => correctSet.has(x))) {
          // Partial points for complex questions
          calculatedScore += Math.floor(q.points / 2);
        }
      } else if (q.type === 'benar_salah') {
        let allCorrect = true;
        (q.boolStatements || []).forEach((bs) => {
          if (userAns[bs.id] !== bs.correctAnswer) {
            allCorrect = false;
          }
        });
        if (allCorrect) calculatedScore += q.points;
      } else if (q.type === 'menjodohkan') {
        let allMatched = true;
        (q.matchPairs || []).forEach((mp) => {
          if (userAns[mp.id] !== mp.correctMatch) {
            allMatched = false;
          }
        });
        if (allMatched) calculatedScore += q.points;
      } else if (q.type === 'isian_singkat') {
        const normalized = String(userAns || '').trim().toLowerCase();
        if (q.shortAnswerKeys?.includes(normalized)) {
          calculatedScore += q.points;
        }
      }
    });

    const percentage = Math.round((calculatedScore / (maxPossibleScore || 100)) * 100);
    const passed = percentage >= examPackage.kkm;

    const submission: Omit<ExamSubmission, 'id' | 'submittedAt'> = {
      examSessionId: session.id,
      packageId: examPackage.id,
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentNis: currentUser.nis || 'NIS',
      kelasId: currentUser.kelasId || session.kelasId,
      answers,
      score: calculatedScore,
      maxScore: maxPossibleScore,
      percentage,
      passed,
      violationsCount,
      startedAt: new Date().toISOString(),
    };

    const saved = store.submitExam(submission);
    setFinalScoreData(saved);
    setIsFinished(true);
    setShowConfirmModal(false);

    // Score is hidden until teacher releases - do not reveal score via confetti

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // If Finished: Show Completion Summary Page without revealing scores
  if (isFinished && finalScoreData) {
    return (
      <div className="min-h-screen bg-[#070d1e] text-white flex items-center justify-center p-4">
        <div className="bg-[#0e172e] border-2 border-blue-600/70 text-slate-100 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-950/90 border-2 border-emerald-400 text-emerald-400 mb-1 shadow-lg shadow-emerald-950">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 bg-blue-950 border border-cyan-500/60 px-3 py-1 rounded-full font-mono shadow-xs">
              Ujian CBT Telah Selesai
            </span>
            <h2 className="text-2xl font-bold font-display text-white mt-2">
              Jawaban Berhasil Dikumpulkan!
            </h2>
            <p className="text-xs text-blue-200 mt-1 leading-relaxed">
              Terima kasih, <strong>{currentUser.name}</strong>. Seluruh lembar jawaban Anda telah tersimpan secara permanen dan terenkripsi di server CBT SPANJU.
            </p>
          </div>

          {/* Score Hidden Notice - Strictly Protected */}
          <div className="p-5 bg-[#091024] border-2 border-blue-900 rounded-2xl text-xs text-left space-y-3">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wide">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Pengumuman Poin & Nilai Dirahasiakan</span>
            </div>
            <p className="text-slate-200 leading-relaxed text-xs">
              Sesuai standar operasional ujian CBT SPANJU, <span className="text-amber-300 font-semibold">poin hasil ujian tidak langsung ditampilkan di layar siswa</span>. Nilai resmi akan diumumkan oleh Guru Pengampu di menu <strong>Pengumuman Nilai</strong> setelah seluruh sesi ujian berakhir dan proses rilis nilai diaktifkan oleh guru.
            </p>
            <div className="pt-2.5 border-t border-blue-950 space-y-1.5 text-xs text-blue-300 font-mono">
              <div className="flex items-center justify-between">
                <span>Soal Terjawab:</span>
                <span className="text-white font-bold">{answeredCount} dari {questions.length} Butir Soal</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Waktu Pengumpulan:</span>
                <span className="text-white font-bold">
                  {new Date(finalScoreData.submittedAt).toLocaleTimeString('id-ID')} WITA
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 px-3 py-2 bg-[#080e22] rounded-xl border border-blue-950 font-mono">
            <span>Pelanggaran Terdeteksi:</span>
            <span className={violationsCount > 0 ? "font-bold text-red-400" : "font-bold text-emerald-400"}>
              {violationsCount}x Catatan Proctor
            </span>
          </div>

          <button
            onClick={onFinishExam}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-blue-600/40"
          >
            Kembali ke Ruang Siswa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 cbt-secure-mode select-none flex flex-col justify-between">
      {/* ================= STICKY CBT HEADER ================= */}
      <header className="sticky top-0 z-40 bg-[#0a142f]/95 backdrop-blur-md border-b border-blue-900/80 px-6 py-3 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-display font-black text-white text-base tracking-tight">
              <span className="text-cyan-400 font-black drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]">CBT</span>{' '}
              <span className="text-white">SPANJU</span> · {examPackage.subjectName}
            </span>
          </div>
          <span className="hidden sm:inline text-xs text-blue-700">|</span>
          <span className="hidden sm:inline text-xs font-semibold text-blue-200">
            {currentUser.name} ({currentUser.nis})
          </span>
        </div>

        {/* Security & Timer Widgets */}
        <div className="flex items-center gap-4">
          {/* Violation warning badge */}
          {violationsCount > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-red-950 border border-red-700 text-red-300 rounded-lg text-xs font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>{violationsCount} Pelanggaran</span>
            </div>
          )}

          {/* Countdown Clock */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-xs ${
              timeLeftSeconds < 300
                ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse'
                : 'bg-blue-950 text-blue-300 border border-blue-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(timeLeftSeconds)}</span>
          </div>

          {/* Re-enter Fullscreen Button if lost */}
          {!isFullscreen && (
            <button
              onClick={() => document.documentElement.requestFullscreen().catch(() => {})}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Kunci Layar</span>
            </button>
          )}
        </div>
      </header>

      {/* ================= MAIN EXAM STAGE ================= */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Question Content (3 cols) */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-6">
          <div className="bg-[#0d1733] border-2 border-blue-900/80 rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-100">
            {/* Question Header & Points */}
            <div className="flex items-center justify-between pb-4 border-b border-blue-900/80 mb-6">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black font-display flex items-center justify-center text-base shadow-lg shadow-blue-600/30">
                  {currentIdx + 1}
                </span>
                <div>
                  <span className="text-xs font-extrabold text-cyan-300 uppercase tracking-wide">
                    Soal No. {currentIdx + 1} dari {questions.length}
                  </span>
                  <span className="block text-xs text-blue-200 font-semibold">
                    {currentQ.type.replace('_', ' ').toUpperCase()} · Bobot {currentQ.points} Poin
                  </span>
                </div>
              </div>

              {/* Tombol Ragu-ragu */}
              <button
                onClick={() => toggleFlag(currentQ.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  flagged[currentQ.id]
                    ? 'bg-amber-400 text-amber-950 font-black shadow-md'
                    : 'bg-blue-950 hover:bg-amber-950 hover:text-amber-300 text-slate-200 border border-blue-800'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{flagged[currentQ.id] ? 'Ragu-ragu (Ditandai)' : 'Ragu-ragu'}</span>
              </button>
            </div>

            {/* Question Text - Maximum contrast & clarity */}
            <div className="text-base sm:text-lg font-bold text-white leading-relaxed space-y-4 mb-8">
              <p>{currentQ.text}</p>
              {currentQ.image && (
                <div className="rounded-xl overflow-hidden border border-blue-800 max-w-md bg-[#091024] p-1">
                  <img
                    src={currentQ.image}
                    alt="Ilustrasi Soal"
                    className="w-full h-auto object-contain rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* ================= DYNAMIC QUESTION ANSWER CONTROLS ================= */}

            {/* 1. Pilihan Ganda (Single Choice) */}
            {currentQ.type === 'pilihan_ganda' && (
              <div className="space-y-3">
                {currentQ.options?.map((opt) => {
                  const isSelected = answers[currentQ.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectAnswer(currentQ.id, opt.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left flex items-start gap-4 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/35 border-cyan-400 ring-2 ring-cyan-400/40 text-white shadow-xl translate-x-1'
                          : 'bg-[#0e1b3d] border-blue-900/80 hover:bg-[#12244f] hover:border-blue-600 text-white'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-blue-950 border border-blue-700 text-cyan-300'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <div className="flex-1 text-sm sm:text-base font-semibold text-white pt-1 leading-relaxed">
                        {opt.text}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Pilihan Ganda Kompleks (Multi Select) */}
            {currentQ.type === 'pilihan_ganda_kompleks' && (
              <div className="space-y-3">
                <span className="block text-xs font-bold text-cyan-200 bg-blue-950 border border-blue-700/80 p-3 rounded-xl mb-2">
                  ⓘ Pilihan Ganda Kompleks: Klik semua opsi yang menurut Anda benar (bisa memilih lebih dari satu opsi).
                </span>
                {currentQ.options?.map((opt) => {
                  const selectedArr: string[] = answers[currentQ.id] || [];
                  const isChecked = selectedArr.includes(opt.id);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          handleSelectAnswer(
                            currentQ.id,
                            selectedArr.filter((x) => x !== opt.id)
                          );
                        } else {
                          handleSelectAnswer(currentQ.id, [...selectedArr, opt.id]);
                        }
                      }}
                      className={`w-full p-4 rounded-xl border-2 text-left flex items-start gap-4 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-blue-600/35 border-cyan-400 ring-2 ring-cyan-400/40 text-white shadow-xl translate-x-1'
                          : 'bg-[#0e1b3d] border-blue-900/80 hover:bg-[#12244f] hover:border-blue-600 text-white'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center border-2 mt-0.5 shrink-0 ${
                          isChecked
                            ? 'bg-blue-500 border-cyan-300 text-white shadow-xs'
                            : 'border-blue-600 bg-blue-950'
                        }`}
                      >
                        {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <span className="font-extrabold text-sm text-cyan-300 pt-0.5">{opt.label}.</span>
                      <div className="flex-1 text-sm sm:text-base font-semibold text-white pt-0.5 leading-relaxed">
                        {opt.text}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. Benar / Salah (Interactive High-Contrast Button Controls) */}
            {currentQ.type === 'benar_salah' && (
              <div className="space-y-3.5">
                <span className="block text-xs font-bold text-cyan-200 bg-blue-950 border border-blue-700/80 p-3 rounded-xl mb-1">
                  ⓘ Tentukan status kebenaran (BENAR atau SALAH) pada setiap butir pernyataan di bawah ini:
                </span>
                {currentQ.boolStatements?.map((bs, bsIdx) => {
                  const userVals = answers[currentQ.id] || {};
                  const currentVal = userVals[bs.id];

                  return (
                    <div
                      key={bs.id}
                      className="p-4 bg-[#0e1b3d] border-2 border-blue-900/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className="w-6 h-6 rounded-md bg-blue-900 border border-blue-600 text-cyan-200 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {bsIdx + 1}
                        </span>
                        <p className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                          {bs.statement}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectAnswer(currentQ.id, {
                              ...userVals,
                              [bs.id]: true,
                            })
                          }
                          className={`px-4 py-2 rounded-xl text-xs font-extrabold border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                            currentVal === true
                              ? 'bg-emerald-600 border-emerald-300 text-white shadow-lg shadow-emerald-950 scale-105'
                              : 'bg-[#091024] border-blue-900 text-slate-300 hover:border-emerald-500 hover:text-emerald-300'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>BENAR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleSelectAnswer(currentQ.id, {
                              ...userVals,
                              [bs.id]: false,
                            })
                          }
                          className={`px-4 py-2 rounded-xl text-xs font-extrabold border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                            currentVal === false
                              ? 'bg-rose-600 border-rose-300 text-white shadow-lg shadow-rose-950 scale-105'
                              : 'bg-[#091024] border-blue-900 text-slate-300 hover:border-rose-500 hover:text-rose-300'
                          }`}
                        >
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                          <span>SALAH</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Menjodohkan (Matching Pair Select) */}
            {currentQ.type === 'menjodohkan' && (
              <div className="space-y-3.5">
                <span className="block text-xs font-bold text-cyan-200 bg-blue-950 border border-blue-700/80 p-3 rounded-xl mb-1">
                  Pasangkanlah setiap item pada kolom kiri dengan pilihan yang tepat di dropdown:
                </span>
                {currentQ.matchPairs?.map((mp, mpIdx) => {
                  const matchAnswers = answers[currentQ.id] || {};
                  const currentSelection = matchAnswers[mp.id] || '';

                  return (
                    <div
                      key={mp.id}
                      className="p-4 bg-[#0e1b3d] border-2 border-blue-900/80 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-blue-900 border border-blue-600 text-cyan-200 font-bold text-xs flex items-center justify-center shrink-0">
                          {mpIdx + 1}
                        </span>
                        <div className="font-bold text-white text-sm sm:text-base leading-snug">{mp.premise}</div>
                      </div>
                      <div>
                        <select
                          value={currentSelection}
                          onChange={(e) =>
                            handleSelectAnswer(currentQ.id, {
                              ...matchAnswers,
                              [mp.id]: e.target.value,
                            })
                          }
                          className="w-full p-3 bg-[#081026] border-2 border-blue-600 focus:border-cyan-400 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs sm:text-sm"
                        >
                          <option value="" style={{ backgroundColor: '#081026', color: '#94a3b8' }}>
                            -- Pilih Pasangan Jawaban --
                          </option>
                          {currentQ.matchPairs?.map((p) => (
                            <option
                              key={p.id}
                              value={p.correctMatch}
                              style={{ backgroundColor: '#081026', color: '#ffffff' }}
                            >
                              {p.correctMatch}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5. Isian Singkat */}
            {currentQ.type === 'isian_singkat' && (
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-cyan-300">
                  Ketik jawaban singkat Anda pada kotak di bawah ini:
                </label>
                <input
                  type="text"
                  placeholder="Ketik jawaban di sini secara jelas..."
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleSelectAnswer(currentQ.id, e.target.value)}
                  className="w-full p-4 bg-[#0e1b3d] border-2 border-blue-600 focus:border-cyan-400 rounded-xl text-base font-bold text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden shadow-inner"
                />
              </div>
            )}
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between bg-[#0d1733] border border-blue-900/60 rounded-2xl p-4 shadow-xl">
            <button
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-200 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-colors cursor-pointer"
              >
                <span>Selanjutnya</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950 transition-colors cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Selesai & Kumpulkan</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Question Grid & Live Proctoring Camera (1 col) */}
        <div className="space-y-6">
          {/* Live Chromebook Webcam Frame */}
          <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-md border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                <Video className="w-3.5 h-3.5" />
                <span>Proctoring Kamera</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-700 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />

              {(!cameraActive || cameraError) && (
                <div className="flex flex-col items-center p-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg mb-1">
                    {currentUser.avatar || '👨‍🎓'}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Kamera Terhubung
                  </span>
                </div>
              )}

              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs rounded text-[9px] text-slate-300 font-mono">
                SMPN7-AI-MONITOR
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-2 leading-tight">
              Kamera aktif merekam gerakan wajah. Setiap pergerakan keluar tab dipantau langsung oleh guru pengawas.
            </p>
          </div>

          {/* Question Navigation Drawer */}
          <div className="bg-[#0d1733] border border-blue-900/60 rounded-2xl p-5 shadow-xl text-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Nomor Soal ({questions.length})
              </h4>
              <span className="text-[11px] font-mono text-blue-300">
                Terjawab: {answeredCount}/{questions.length}
              </span>
            </div>

            {/* Grid of question numbers */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isDoubt = !!flagged[q.id];
                const isCurrent = currentIdx === idx;

                let bgClass = 'bg-[#091024] text-slate-300 hover:bg-blue-950 border border-blue-950';
                if (isDoubt) {
                  bgClass = 'bg-amber-400 text-amber-950 font-bold border border-amber-300';
                } else if (isAnswered) {
                  bgClass = 'bg-blue-600 text-white font-bold border border-blue-500 shadow-md';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`aspect-square rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer ${bgClass} ${
                      isCurrent ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-[#0d1733] scale-105' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-4 mt-4 border-t border-blue-950 space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-600" />
                <span>Sudah Dijawab ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span>Ragu-ragu ({flaggedCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#091024] border border-blue-950" />
                <span>Belum Dijawab ({questions.length - answeredCount})</span>
              </div>
            </div>

            {/* Finish Exam Button */}
            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full mt-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
            >
              Kumpulkan Ujian
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODAL: PERINGATAN PELANGGARAN ================= */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-[#060b1c]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e172e] border-2 border-red-500 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-center space-y-4 animate-bounce">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-500 text-red-400 mb-1 shadow-inner">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold font-display text-red-400">
              PERINGATAN KEAMANAN CBT!
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed font-semibold">
              {warningMessage}
            </p>
            <p className="text-[11px] text-amber-300 bg-amber-950/60 p-2.5 rounded-xl border border-amber-800">
              Maksimal 3 kali toleransi pelanggaran sebelum lembar tes terkunci otomatis dan didiskualifikasi!
            </p>
            <button
              onClick={() => {
                setShowWarningModal(false);
                document.documentElement.requestFullscreen().catch(() => {});
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-600/40 cursor-pointer"
            >
              Saya Mengerti & Lanjutkan Ujian
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: KONFIRMASI PENGUMPULAN ================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#060b1c]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e172e] border-2 border-blue-600/80 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-slate-100 space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-900/80 border border-blue-600 flex items-center justify-center text-cyan-300 shadow-md">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-white">
                  Konfirmasi Selesai Ujian
                </h3>
                <span className="text-[11px] text-cyan-300 font-semibold font-mono">
                  SMPN 7 Muara Badak CBT
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              Apakah Anda yakin ingin mengakhiri dan mengumpulkan lembar jawaban ujian CBT ini? Setelah dikumpulkan, lembar ujian akan dikunci dan dinilai oleh sistem.
            </p>

            <div className="p-4 bg-[#091024] rounded-xl border border-blue-950 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Butir Soal:</span>
                <span className="font-bold text-white">{questions.length} Soal</span>
              </div>
              <div className="flex items-center justify-between text-cyan-300 font-semibold">
                <span>Soal Sudah Dijawab:</span>
                <span className="font-bold">{answeredCount} Soal</span>
              </div>
              <div className="flex items-center justify-between text-amber-300 font-semibold">
                <span>Soal Ragu-ragu:</span>
                <span className="font-bold">{flaggedCount} Soal</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Soal Belum Dijawab:</span>
                <span className="font-bold text-white">{questions.length - answeredCount} Soal</span>
              </div>
            </div>

            <div className="p-3 bg-blue-950/60 border border-blue-800/80 rounded-xl text-[11px] text-blue-200 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Nilai resmi dirahasiakan & akan dirilis oleh Guru Mata Pelajaran.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 bg-[#091024] hover:bg-[#0e172e] border border-blue-900 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Periksa Kembali
              </button>
              <button
                type="button"
                onClick={() => handleFinish(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950 cursor-pointer"
              >
                Ya, Kumpulkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
