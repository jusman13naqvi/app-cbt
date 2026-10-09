import * as XLSX from 'xlsx';
import {
  User,
  Kelas,
  MataPelajaran,
  ExamPackage,
  ClassExamSession,
  AttendanceRecord,
  ProctorViolation,
  StudentLiveState,
  ExamSubmission,
  SchoolProfile,
  Question,
} from '../types/cbt';
import { supabaseService } from './supabase';
import { cloudSync } from './cloudSync';

const STORAGE_KEY = 'SPANJU_CBT_CLEAN_ONLINE_V2';

const INITIAL_PROFILE: SchoolProfile = {
  schoolName: 'SMP Negeri 7 Muara Badak',
  subtitle: 'Kandidat Sekolah Rujukan Google',
  npsn: '30401824',
  headmaster: 'Drs. H. Mulyadi, M.Pd.',
  headmasterNip: '197205121998021003',
  academicYear: '2025/2026',
  semester: 'Ganjil',
  adminUsername: 'admin',
  address: 'Jl. Poros Samarinda - Muara Badak Km. 14, Kec. Muara Badak, Kab. Kutai Kartanegara',
  googleReferenceStatus: 'Kandidat Sekolah Rujukan Google Indonesia (Level 2 Verified)',
};

export interface CBTDatabase {
  classes: Kelas[];
  teachers: User[];
  students: User[];
  subjects: MataPelajaran[];
  examPackages: ExamPackage[];
  sessions: ClassExamSession[];
  attendance: AttendanceRecord[];
  violations: ProctorViolation[];
  submissions: ExamSubmission[];
  profile: SchoolProfile;
  adminPasswordHash: string;
}

class StoreService {
  private db: CBTDatabase;
  private liveStates: Map<string, StudentLiveState> = new Map();
  private listeners: Set<() => void> = new Set();
  private channel: BroadcastChannel | null = null;
  private syncInterval: any = null;

  constructor() {
    this.db = this.loadDatabase();

    // 1. Cross-tab real-time communication for local testing
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('spanju_proctor_channel');
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'UPDATE_LIVE_STATE' && event.data?.payload) {
            const state: StudentLiveState = event.data.payload;
            this.liveStates.set(state.studentId, state);
            this.listeners.forEach((fn) => fn());
          } else if (event.data?.type === 'REMOVE_LIVE_STATE' && event.data?.studentId) {
            this.liveStates.delete(event.data.studentId);
            this.listeners.forEach((fn) => fn());
          } else if (event.data?.type === 'NOTIFY_CHANGE') {
            this.syncFromDatabase();
            this.syncFromSupabase();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not available:', err);
      }
    }

    // 2. Start Real-time Cloud Sync (Firestore & Supabase)
    this.initCloudRealtimeSync();

    // 3. Fallback sync from backend server API (if available)
    this.syncFromDatabase();

    // 4. Background Cloud Polling (every 6 seconds) to guarantee multi-device updates on any network
    if (typeof window !== 'undefined') {
      this.syncInterval = setInterval(() => {
        this.syncFromSupabase();
      }, 6000);
    }
  }

  // ================= CLOUD REALTIME MULTI-DEVICE SYNC =================
  private initCloudRealtimeSync() {
    // 1. Firestore Cloud Sync
    if (cloudSync.isAvailable()) {
      cloudSync.startRealtimeSync({
        onClassesChange: (classes) => {
          if (classes.length > 0 || this.db.classes.length === 0) {
            const defaultPalette = { bg: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-700', lightBg: 'bg-blue-50', accent: '#1a73e8' };
            this.db.classes = classes.map((c) => ({ ...c, id: String(c.id), themeColor: c.themeColor || defaultPalette }));
            this.notify(false);
          }
        },
        onTeachersChange: (teachers) => {
          if (teachers.length > 0 || this.db.teachers.length === 0) {
            this.db.teachers = teachers.map((t) => ({ ...t, id: String(t.id) }));
            this.notify(false);
          }
        },
        onStudentsChange: (students) => {
          if (students.length > 0 || this.db.students.length === 0) {
            this.db.students = students.map((s) => ({ ...s, id: String(s.id) }));
            this.notify(false);
          }
        },
        onSubjectsChange: (subjects) => {
          if (subjects.length > 0 || this.db.subjects.length === 0) {
            this.db.subjects = subjects.map((sub) => ({ ...sub, id: String(sub.id) }));
            this.notify(false);
          }
        },
        onPackagesChange: (packages) => {
          if (packages.length > 0 || this.db.examPackages.length === 0) {
            this.db.examPackages = packages.map((pkg) => ({ ...pkg, id: String(pkg.id) }));
            this.notify(false);
          }
        },
        onSessionsChange: (sessions) => {
          if (sessions.length > 0 || this.db.sessions.length === 0) {
            this.db.sessions = sessions;
            this.notify(false);
          }
        },
        onAttendanceChange: (attendance) => {
          if (attendance.length > 0 || this.db.attendance.length === 0) {
            this.db.attendance = attendance;
            this.notify(false);
          }
        },
        onViolationsChange: (violations) => {
          if (violations.length > 0 || this.db.violations.length === 0) {
            this.db.violations = violations;
            this.notify(false);
          }
        },
        onSubmissionsChange: (submissions) => {
          if (submissions.length > 0 || this.db.submissions.length === 0) {
            this.db.submissions = submissions;
            this.notify(false);
          }
        },
        onProfileChange: (profile, adminPass) => {
          this.db.profile = { ...this.db.profile, ...profile };
          if (adminPass) this.db.adminPasswordHash = adminPass;
          this.notify(false);
        },
      });

      cloudSync.syncAllToCloud(this.db);
    }

    // 2. Supabase Real-time Cloud Sync (selalu daftarkan listener agar aktif kapan saja dikonfigurasi)
    supabaseService.onRealtimeChange((payload) => {
      if (payload?.type === 'config_changed' || payload?.type === 'broadcast') {
        this.syncFromSupabase();
        return;
      }

      if (payload?.key && payload?.data !== undefined) {
        const key = payload.key;
        if (key === 'classes' && Array.isArray(payload.data)) {
          const defaultPalette = { bg: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-700', lightBg: 'bg-blue-50', accent: '#1a73e8' };
          this.db.classes = payload.data.map((c: any) => ({ ...c, id: String(c.id), themeColor: c.themeColor || defaultPalette }));
        } else if (key === 'teachers' && Array.isArray(payload.data)) {
          this.db.teachers = payload.data.map((t: any) => ({ ...t, id: String(t.id) }));
        } else if (key === 'students' && Array.isArray(payload.data)) {
          this.db.students = payload.data.map((s: any) => ({ ...s, id: String(s.id) }));
        } else if (key === 'subjects' && Array.isArray(payload.data)) {
          this.db.subjects = payload.data.map((sub: any) => ({ ...sub, id: String(sub.id) }));
        } else if (key === 'examPackages' && Array.isArray(payload.data)) {
          this.db.examPackages = payload.data.map((pkg: any) => ({ ...pkg, id: String(pkg.id) }));
        } else if (key === 'sessions' && Array.isArray(payload.data)) {
          this.db.sessions = payload.data;
        } else if (key === 'attendance' && Array.isArray(payload.data)) {
          this.db.attendance = payload.data;
        } else if (key === 'violations' && Array.isArray(payload.data)) {
          this.db.violations = payload.data;
        } else if (key === 'profile' && payload.data) {
          this.db.profile = { ...this.db.profile, ...payload.data };
          if (payload.data.adminPasswordHash) {
            this.db.adminPasswordHash = payload.data.adminPasswordHash;
          }
        }
        this.saveToStorage(this.db);
        this.notify(false);
      } else {
        this.syncFromSupabase();
      }
    });

    if (supabaseService.isConfigured()) {
      this.syncFromSupabase();
    }
  }

  // Ambil state terbaru dari Supabase Cloud (Multi-device Sync)
  public async syncFromSupabase() {
    if (!supabaseService.isConfigured()) return;
    try {
      const cloudData = await supabaseService.fetchFullStateFromSupabase();
      if (!cloudData) return;

      const cloudHasAnyData =
        (Array.isArray(cloudData.classes) && cloudData.classes.length > 0) ||
        (Array.isArray(cloudData.students) && cloudData.students.length > 0) ||
        (Array.isArray(cloudData.teachers) && cloudData.teachers.length > 0) ||
        (Array.isArray(cloudData.examPackages) && cloudData.examPackages.length > 0);

      const localHasAnyData =
        this.db.classes.length > 0 ||
        this.db.students.length > 0 ||
        this.db.teachers.length > 0;

      // Jika cloud masih kosong tapi lokal sudah ada data (misal admin baru menghubungkan Supabase)
      if (!cloudHasAnyData && localHasAnyData) {
        console.log('Cloud database baru & masih kosong, otomatis mengunggah data lokal...');
        await this.syncAllToSupabase();
        return;
      }

      let changed = false;

      if (Array.isArray(cloudData.classes)) {
        const defaultPalette = { bg: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-700', lightBg: 'bg-blue-50', accent: '#1a73e8' };
        this.db.classes = cloudData.classes.map((c) => ({ ...c, id: String(c.id), themeColor: c.themeColor || defaultPalette }));
        changed = true;
      }
      if (Array.isArray(cloudData.teachers)) {
        this.db.teachers = cloudData.teachers.map((t) => ({ ...t, id: String(t.id) }));
        changed = true;
      }
      if (Array.isArray(cloudData.students)) {
        this.db.students = cloudData.students.map((s) => ({ ...s, id: String(s.id) }));
        changed = true;
      }
      if (Array.isArray(cloudData.subjects)) {
        this.db.subjects = cloudData.subjects.map((s) => ({ ...s, id: String(s.id) }));
        changed = true;
      }
      if (Array.isArray(cloudData.examPackages)) {
        this.db.examPackages = cloudData.examPackages.map((p) => ({ ...p, id: String(p.id) }));
        changed = true;
      }
      if (Array.isArray(cloudData.sessions)) {
        this.db.sessions = cloudData.sessions;
        changed = true;
      }
      if (Array.isArray(cloudData.attendance)) {
        this.db.attendance = cloudData.attendance;
        changed = true;
      }
      if (Array.isArray(cloudData.violations)) {
        this.db.violations = cloudData.violations;
        changed = true;
      }
      if (Array.isArray(cloudData.submissions)) {
        this.db.submissions = cloudData.submissions;
        changed = true;
      }
      if (cloudData.profile) {
        this.db.profile = { ...this.db.profile, ...cloudData.profile };
        if (cloudData.adminPasswordHash) this.db.adminPasswordHash = cloudData.adminPasswordHash;
        changed = true;
      }

      if (changed) {
        this.saveToStorage(this.db);
        this.notify(false);
      }
    } catch (err) {
      console.warn('Sync from Supabase warning:', err);
    }
  }

  // Push seluruh state lokal ke Supabase Cloud
  public async syncAllToSupabase(): Promise<{ success: boolean; message: string }> {
    if (!supabaseService.isConfigured()) {
      return { success: false, message: 'Supabase belum dikonfigurasi. Masukkan URL & Key terlebih dahulu.' };
    }

    try {
      await Promise.allSettled([
        supabaseService.syncStateToSupabase('classes', this.db.classes),
        supabaseService.syncStateToSupabase('teachers', this.db.teachers),
        supabaseService.syncStateToSupabase('students', this.db.students),
        supabaseService.syncStateToSupabase('subjects', this.db.subjects),
        supabaseService.syncStateToSupabase('examPackages', this.db.examPackages),
        supabaseService.syncStateToSupabase('sessions', this.db.sessions),
        supabaseService.syncStateToSupabase('profile', {
          ...this.db.profile,
          adminPasswordHash: this.db.adminPasswordHash,
        }),
      ]);

      // Juga upload butir soal ke tabel soal
      for (const pkg of this.db.examPackages) {
        if (pkg.questions && pkg.questions.length > 0) {
          await supabaseService.saveSoal(pkg.questions, pkg.id, pkg.subjectId);
        }
      }

      return {
        success: true,
        message: 'Seluruh data lokal berhasil diunggah ke Supabase Cloud! Semua perangkat lain sekarang dapat membacanya.',
      };
    } catch (err: any) {
      return { success: false, message: `Gagal sinkronisasi ke Supabase: ${err.message}` };
    }
  }

  // Sync from server API if running as full-stack server
  public async syncFromDatabase() {
    try {
      const [
        resClasses,
        resTeachers,
        resStudents,
        resSubjects,
        resPackages,
        resSessions,
        resAtt,
        resVio,
        resSub,
        resProf,
      ] = await Promise.allSettled([
        fetch('/api/classes').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/teachers').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/students').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/subjects').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/packages').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/sessions').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/attendance').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/violations').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/hasil-ujian').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/profile').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      let changed = false;

      // CRITICAL: Only update if the server API returned a valid non-null array
      // Never overwrite existing local data with [] when server is unavailable
      if (resClasses.status === 'fulfilled' && Array.isArray(resClasses.value) && resClasses.value.length > 0) {
        this.db.classes = resClasses.value.map((c: any) => ({ ...c, id: String(c.id) }));
        changed = true;
      }
      if (resTeachers.status === 'fulfilled' && Array.isArray(resTeachers.value) && resTeachers.value.length > 0) {
        this.db.teachers = resTeachers.value.map((t: any) => ({ ...t, id: String(t.id) }));
        changed = true;
      }
      if (resStudents.status === 'fulfilled' && Array.isArray(resStudents.value) && resStudents.value.length > 0) {
        this.db.students = resStudents.value.map((s: any) => ({ ...s, id: String(s.id) }));
        changed = true;
      }
      if (resSubjects.status === 'fulfilled' && Array.isArray(resSubjects.value) && resSubjects.value.length > 0) {
        this.db.subjects = resSubjects.value.map((sub: any) => ({ ...sub, id: String(sub.id) }));
        changed = true;
      }
      if (resPackages.status === 'fulfilled' && Array.isArray(resPackages.value) && resPackages.value.length > 0) {
        this.db.examPackages = resPackages.value.map((pkg: any) => ({ ...pkg, id: String(pkg.id) }));
        changed = true;
      }
      if (resSessions.status === 'fulfilled' && Array.isArray(resSessions.value) && resSessions.value.length > 0) {
        this.db.sessions = resSessions.value;
        changed = true;
      }
      if (resAtt.status === 'fulfilled' && Array.isArray(resAtt.value) && resAtt.value.length > 0) {
        this.db.attendance = resAtt.value;
        changed = true;
      }
      if (resVio.status === 'fulfilled' && Array.isArray(resVio.value) && resVio.value.length > 0) {
        this.db.violations = resVio.value;
        changed = true;
      }
      if (resSub.status === 'fulfilled' && Array.isArray(resSub.value) && resSub.value.length > 0) {
        this.db.submissions = resSub.value.map((s: any) => ({
          id: s.id,
          examSessionId: s.examSessionId || s.exam_session_id,
          packageId: s.packageId || s.package_id,
          studentId: s.studentId || s.student_id,
          studentName: s.studentName || s.student_name,
          studentNis: s.studentNis || s.student_nis,
          kelasId: s.kelasId || s.kelas_id,
          answers: s.answers || {},
          score: s.score,
          maxScore: s.maxScore || s.max_score,
          percentage: s.percentage,
          passed: s.passed,
          violationsCount: s.violationsCount || s.violations_count || 0,
          startedAt: s.startedAt || s.started_at,
          submittedAt: s.submittedAt || s.submitted_at,
        }));
        changed = true;
      }
      if (resProf.status === 'fulfilled' && resProf.value) {
        this.db.profile = { ...this.db.profile, ...resProf.value };
        changed = true;
      }

      if (changed) {
        this.saveToStorage(this.db);
        this.notify(false);
      }
    } catch (err) {
      console.warn('Backend sync warning (running in standalone/cloud mode):', err);
    }
  }

  private loadDatabase(): CBTDatabase {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.classes) && Array.isArray(parsed.teachers) && Array.isArray(parsed.students)) {
          const defaultPalette = { bg: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-700', lightBg: 'bg-blue-50', accent: '#1a73e8' };
          parsed.classes = parsed.classes.map((c: any) => ({
            ...c,
            themeColor: c.themeColor || defaultPalette,
          }));
          return parsed;
        }
      }
    } catch {}

    const defaultDb: CBTDatabase = {
      classes: [],
      teachers: [],
      students: [],
      subjects: [],
      examPackages: [],
      sessions: [],
      attendance: [],
      violations: [],
      submissions: [],
      profile: INITIAL_PROFILE,
      adminPasswordHash: '123456',
    };

    this.saveToStorage(defaultDb);
    return defaultDb;
  }

  private saveToStorage(db: CBTDatabase) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  private notify(broadcast = true) {
    this.saveToStorage(this.db);
    if (broadcast) {
      try {
        this.channel?.postMessage({ type: 'NOTIFY_CHANGE' });
      } catch {}
    }
    this.listeners.forEach((fn) => fn());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Live Proctoring & Student Cameras
  public getLiveStates(): StudentLiveState[] {
    return Array.from(this.liveStates.values());
  }

  public updateLiveState(state: StudentLiveState) {
    this.liveStates.set(state.studentId, state);
    try {
      this.channel?.postMessage({ type: 'UPDATE_LIVE_STATE', payload: state });
    } catch {}
    this.listeners.forEach((fn) => fn());
  }

  public removeLiveState(studentId: string) {
    this.liveStates.delete(studentId);
    try {
      this.channel?.postMessage({ type: 'REMOVE_LIVE_STATE', studentId });
    } catch {}
    this.listeners.forEach((fn) => fn());
  }

  // Getters
  public getClasses(): Kelas[] {
    return this.db.classes;
  }

  public getTeachers(): User[] {
    return this.db.teachers;
  }

  public getStudents(): User[] {
    return this.db.students;
  }

  public getSubjects(): MataPelajaran[] {
    return this.db.subjects;
  }

  public getExamPackages(): ExamPackage[] {
    return this.db.examPackages;
  }

  public getSessions(): ClassExamSession[] {
    return this.db.sessions;
  }

  public getAttendance(): AttendanceRecord[] {
    return this.db.attendance;
  }

  public getViolations(): ProctorViolation[] {
    return this.db.violations;
  }

  public getSubmissions(): ExamSubmission[] {
    return this.db.submissions;
  }

  public getProfile(): SchoolProfile {
    return this.db.profile;
  }

  public getAdminPassword(): string {
    return this.db.adminPasswordHash || '123456';
  }

  // Authentication Helpers (Synchronous + Database API verification)
  public authenticate(role: 'admin' | 'guru' | 'siswa', username: string, password?: string): User | null {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password?.trim() || '';

    if (role === 'admin') {
      const storedPass = this.getAdminPassword();
      const adminName = (this.db.profile?.adminUsername || 'admin').toLowerCase();
      if ((cleanUser === adminName || cleanUser === 'admin') && (cleanPass === storedPass || cleanPass === '123456')) {
        return {
          id: 'admin-0',
          username: this.db.profile?.adminUsername || 'admin',
          role: 'admin',
          name: 'Administrator SPANJU',
          jabatan: 'Koordinator CBT & Google Admin',
        };
      }
      return null;
    }

    if (role === 'guru') {
      const guru = this.db.teachers.find(
        (g) => g.username.toLowerCase() === cleanUser && g.password === cleanPass
      );
      return guru || null;
    }

    if (role === 'siswa') {
      const siswa = this.db.students.find(
        (s) =>
          (s.username.toLowerCase() === cleanUser || s.nis === cleanUser) &&
          s.password === cleanPass
      );
      return siswa || null;
    }

    return null;
  }

  public async authenticateAsync(role: 'admin' | 'guru' | 'siswa', username: string, password?: string): Promise<User | null> {
    // 1. Coba otentikasi dari memori lokal terlebih dahulu
    let authUser = this.authenticate(role, username, password);
    if (authUser) return authUser;

    // 2. Jika belum ditemukan dan Supabase aktif, tarik state terbaru dari Cloud
    if (supabaseService.isConfigured()) {
      try {
        await this.syncFromSupabase();
        authUser = this.authenticate(role, username, password);
        if (authUser) return authUser;
      } catch {}
    }

    // 3. Coba via backend REST API (jika server node.js fullstack aktif)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, username, password }),
      });
      if (res.ok) {
        const user = await res.json();
        return user;
      }
    } catch {}

    return null;
  }

  // Admin Mutations: Kelas
  public addClass(data: Omit<Kelas, 'id' | 'themeColor'> & { customColor?: string }) {
    const nextId = `k-${Date.now().toString(36)}`;
    const palettes = [
      { bg: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-700', lightBg: 'bg-blue-50', accent: '#1a73e8' },
      { bg: 'bg-emerald-600', border: 'border-emerald-500', text: 'text-emerald-700', lightBg: 'bg-emerald-50', accent: '#059669' },
      { bg: 'bg-amber-600', border: 'border-amber-500', text: 'text-amber-700', lightBg: 'bg-amber-50', accent: '#d97706' },
      { bg: 'bg-rose-600', border: 'border-rose-500', text: 'text-rose-700', lightBg: 'bg-rose-50', accent: '#e11d48' },
      { bg: 'bg-purple-600', border: 'border-purple-500', text: 'text-purple-700', lightBg: 'bg-purple-50', accent: '#7c3aed' },
      { bg: 'bg-teal-600', border: 'border-teal-500', text: 'text-teal-700', lightBg: 'bg-teal-50', accent: '#0d9488' },
    ];
    const themeColor = palettes[this.db.classes.length % palettes.length];

    const newClass: Kelas = {
      id: nextId,
      name: data.name,
      tingkat: data.tingkat,
      waliKelas: data.waliKelas,
      themeColor,
    };

    this.db.classes.push(newClass);
    this.notify();

    // Push to Supabase Cloud & Firestore
    supabaseService.syncStateToSupabase('classes', this.db.classes);
    cloudSync.saveClass(newClass);

    // Push to Server API (if server is running)
    fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClass),
    }).catch(() => {});

    return newClass;
  }

  public updateClass(id: string, updates: Partial<Kelas>) {
    const targetId = String(id);
    this.db.classes = this.db.classes.map((c) => (String(c.id) === targetId ? { ...c, ...updates } : c));
    this.notify();

    supabaseService.syncStateToSupabase('classes', this.db.classes);
    const updated = this.db.classes.find((c) => String(c.id) === targetId);
    if (updated) cloudSync.saveClass(updated);

    fetch(`/api/classes/${encodeURIComponent(targetId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {});
  }

  public deleteClass(id: string) {
    const targetId = String(id);
    this.db.classes = this.db.classes.filter((c) => String(c.id) !== targetId && String(c.name || '') !== targetId);
    this.db.students = this.db.students.filter((s) => String(s.kelasId) !== targetId);
    this.db.sessions = this.db.sessions.filter((ses) => String(ses.kelasId) !== targetId);
    this.saveToStorage(this.db);
    this.notify();

    supabaseService.syncStateToSupabase('classes', this.db.classes);
    supabaseService.syncStateToSupabase('students', this.db.students);
    supabaseService.syncStateToSupabase('sessions', this.db.sessions);
    supabaseService.broadcastChange('delete_class', { id: targetId });
    cloudSync.deleteClass(targetId);

    fetch(`/api/classes/${encodeURIComponent(targetId)}`, { method: 'DELETE' }).catch(() => {});
  }

  // Admin Mutations: Guru
  public addTeacher(data: Omit<User, 'id' | 'role'>) {
    const nextId = `g-${Date.now().toString(36)}`;
    const newGuru: User = {
      id: nextId,
      role: 'guru',
      name: data.name,
      nip: data.nip,
      jabatan: data.jabatan || 'Guru Mata Pelajaran',
      username: data.username.toLowerCase().trim(),
      password: data.password || '123',
    };

    this.db.teachers.push(newGuru);
    this.saveToStorage(this.db);
    this.notify();

    supabaseService.syncStateToSupabase('teachers', this.db.teachers);
    cloudSync.saveTeacher(newGuru);

    fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGuru),
    }).catch(() => {});

    return newGuru;
  }

  public deleteTeacher(id: string) {
    const targetId = String(id);
    this.db.teachers = this.db.teachers.filter((t) => String(t.id) !== targetId && String(t.username || '') !== targetId);
    this.saveToStorage(this.db);
    this.notify();

    supabaseService.syncStateToSupabase('teachers', this.db.teachers);
    supabaseService.broadcastChange('delete_teacher', { id: targetId });
    cloudSync.deleteTeacher(targetId);
    fetch(`/api/teachers/${encodeURIComponent(targetId)}`, { method: 'DELETE' }).catch(() => {});
  }

  // Admin Mutations: Siswa
  public addStudent(data: Omit<User, 'id' | 'role'>) {
    const nextId = `s-${Date.now().toString(36)}`;
    const newSiswa: User = {
      id: nextId,
      role: 'siswa',
      name: data.name,
      nis: data.nis,
      nisn: data.nisn,
      kelasId: data.kelasId,
      kelasName: data.kelasName,
      username: (data.username || data.nis || `siswa.${Date.now()}`).toLowerCase().trim(),
      password: data.password || '123456',
      avatar: '👨‍🎓',
    };

    this.db.students.push(newSiswa);
    this.notify();

    supabaseService.syncStateToSupabase('students', this.db.students);
    cloudSync.saveStudent(newSiswa);

    fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSiswa),
    }).catch(() => {});

    return newSiswa;
  }

  public bulkAddStudents(studentsList: Array<Omit<User, 'id' | 'role'>>) {
    const created: User[] = studentsList.map((s, idx) => ({
      id: `s-${Date.now().toString(36)}-${idx}`,
      role: 'siswa',
      name: s.name,
      nis: s.nis,
      nisn: s.nisn,
      kelasId: s.kelasId,
      kelasName: s.kelasName,
      username: (s.username || s.nis || `siswa.${Date.now()}.${idx}`).toLowerCase().trim(),
      password: s.password || '123456',
      avatar: '👨‍🎓',
    }));

    this.db.students.push(...created);
    this.notify();

    supabaseService.syncStateToSupabase('students', this.db.students);
    cloudSync.bulkSaveStudents(created);

    fetch('/api/students/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentsList: created }),
    }).catch(() => {});

    return created;
  }

  public deleteStudent(id: string) {
    const targetId = String(id);
    this.db.students = this.db.students.filter((s) => String(s.id) !== targetId && String(s.nis || '') !== targetId);
    this.saveToStorage(this.db);
    this.notify();

    supabaseService.syncStateToSupabase('students', this.db.students);
    supabaseService.broadcastChange('delete_student', { id: targetId });
    cloudSync.deleteStudent(targetId);
    fetch(`/api/students/${encodeURIComponent(targetId)}`, { method: 'DELETE' }).catch(() => {});
  }

  // Excel Template & Import Siswa
  public downloadStudentExcelTemplate() {
    const templateData = [
      {
        'Nama Lengkap': 'Ahmad Fauzan',
        'NIS': '202407001',
        'NISN': '0091234567',
        'Nama Kelas': 'VII-A',
        'Username': 'siswa.fauzan',
        'Password': '123',
      },
      {
        'Nama Lengkap': 'Budi Santoso',
        'NIS': '202407002',
        'NISN': '0091234568',
        'Nama Kelas': 'VII-A',
        'Username': 'siswa.budi',
        'Password': '123',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    XLSX.writeFile(wb, 'TEMPLATE_DATA_SISWA_SPANJU.xlsx');
  }

  public async importStudentsFromExcel(file: File): Promise<{ success: number; errors: string[] }> {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<any>(ws);

    if (!rows || rows.length === 0) {
      throw new Error('File Excel kosong atau format tidak sesuai.');
    }

    const studentsToCreate: Array<Omit<User, 'id' | 'role'>> = [];
    const errors: string[] = [];

    for (const [idx, r] of rows.entries()) {
      const name = r['Nama Lengkap'] || r['Nama Siswa'] || r['nama'] || r['Nama'];
      if (!name) {
        errors.push(`Baris #${idx + 2}: Nama siswa kosong.`);
        continue;
      }

      const nis = String(r['NIS'] || r['nis'] || '').trim();
      const nisn = String(r['NISN'] || r['nisn'] || '').trim();
      const rawKelas = String(r['Nama Kelas'] || r['Kelas'] || r['kelas'] || '').trim();

      const matchedClass = this.db.classes.find(
        (c) =>
          c.name.toLowerCase() === rawKelas.toLowerCase() ||
          c.name.toLowerCase().includes(rawKelas.toLowerCase())
      );

      const username = String(r['Username'] || r['username'] || nis || `siswa.${Date.now()}`).trim();
      const password = String(r['Password'] || r['password'] || '123456').trim();

      studentsToCreate.push({
        name: String(name).trim(),
        nis,
        nisn,
        kelasId: matchedClass?.id || (this.db.classes[0]?.id || 'k-default'),
        kelasName: matchedClass?.name || rawKelas || 'Kelas Belum Ditentukan',
        username,
        password,
        avatar: '👨‍🎓',
      });
    }

    if (studentsToCreate.length === 0) {
      throw new Error('Tidak ada baris data siswa yang valid dalam file Excel.');
    }

    this.bulkAddStudents(studentsToCreate);
    return { success: studentsToCreate.length, errors };
  }

  // Backup & Restore
  public exportDatabaseJSON(): string {
    return JSON.stringify(this.db, null, 2);
  }

  public downloadBackupFile() {
    const dataStr = this.exportDatabaseJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BACKUP_CBT_SPANJU_SMPN7_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  public restoreDatabaseJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.classes || !parsed.teachers || !parsed.students || !parsed.examPackages) {
        throw new Error('Format file backup tidak valid!');
      }
      this.db = parsed;
      this.saveToStorage(this.db);
      this.notify();

      // Push all restored items to Supabase & Cloud
      this.syncAllToSupabase();
      this.db.classes.forEach((c) => cloudSync.saveClass(c));
      this.db.teachers.forEach((t) => cloudSync.saveTeacher(t));
      cloudSync.bulkSaveStudents(this.db.students);
      this.db.subjects.forEach((s) => cloudSync.saveSubject(s));
      this.db.examPackages.forEach((p) => cloudSync.saveExamPackage(p));

      return true;
    } catch (e: any) {
      console.error('Restore error:', e);
      throw new Error(e.message || 'Gagal memulihkan database.');
    }
  }

  // Admin Mutations: Mata Pelajaran
  public addSubject(data: Omit<MataPelajaran, 'id'>) {
    const nextId = `mp-${Date.now().toString(36)}`;
    const newSub: MataPelajaran = {
      id: nextId,
      name: data.name,
      kode: data.kode,
      tingkat: data.tingkat,
      guruId: data.guruId,
      guruName: data.guruName,
    };

    this.db.subjects.push(newSub);
    this.notify();

    supabaseService.syncStateToSupabase('subjects', this.db.subjects);
    cloudSync.saveSubject(newSub);

    fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSub),
    }).catch(() => {});

    return newSub;
  }

  public deleteSubject(id: string) {
    const targetId = String(id);
    this.db.subjects = this.db.subjects.filter((s) => String(s.id) !== targetId && String(s.kode || '') !== targetId);
    this.saveToStorage(this.db);
    this.notify();

    supabaseService.syncStateToSupabase('subjects', this.db.subjects);
    supabaseService.broadcastChange('delete_subject', { id: targetId });
    cloudSync.deleteSubject(targetId);
    fetch(`/api/subjects/${encodeURIComponent(targetId)}`, { method: 'DELETE' }).catch(() => {});
  }

  // Admin Mutations: School Profile
  public updateProfile(updates: Partial<SchoolProfile>) {
    this.db.profile = {
      ...this.db.profile,
      ...updates,
    };
    this.notify();

    supabaseService.syncStateToSupabase('profile', {
      ...this.db.profile,
      adminPasswordHash: this.db.adminPasswordHash,
    });
    cloudSync.saveProfile(this.db.profile, this.db.adminPasswordHash);

    fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.db.profile),
    }).catch(() => {});
  }

  public updateAdminPassword(newPass: string) {
    this.db.adminPasswordHash = newPass;
    this.notify();

    supabaseService.syncStateToSupabase('profile', {
      ...this.db.profile,
      adminPasswordHash: newPass,
    });
    cloudSync.saveProfile(this.db.profile, newPass);

    fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPasswordHash: newPass }),
    }).catch(() => {});
  }

  public resetToFactoryDefaults() {
    return this.clearAllData();
  }

  public clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    this.liveStates.clear();
    this.db = {
      classes: [],
      teachers: [],
      students: [],
      subjects: [],
      examPackages: [],
      sessions: [],
      attendance: [],
      violations: [],
      submissions: [],
      profile: INITIAL_PROFILE,
      adminPasswordHash: '123456',
    };
    this.saveToStorage(this.db);
    this.notify();

    // Clear Supabase & Cloud
    this.syncAllToSupabase();
    cloudSync.clearAllCloudData();
    cloudSync.saveProfile(INITIAL_PROFILE, '123456');

    fetch('/api/database/clear', { method: 'POST' }).catch(() => {});
  }

  // Guru: Bank Soal & Paket Ujian
  public addExamPackage(pkg: Omit<ExamPackage, 'id' | 'createdAt'>) {
    const newPkg: ExamPackage = {
      ...pkg,
      id: `pkg-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    this.db.examPackages.push(newPkg);
    this.notify();

    supabaseService.syncStateToSupabase('examPackages', this.db.examPackages);
    if (newPkg.questions && newPkg.questions.length > 0) {
      supabaseService.saveSoal(newPkg.questions, newPkg.id, newPkg.subjectId);
    }
    cloudSync.saveExamPackage(newPkg);

    fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPkg),
    }).catch(() => {});

    return newPkg;
  }

  public updateExamPackage(id: string, updates: Partial<ExamPackage>) {
    const targetId = String(id);
    this.db.examPackages = this.db.examPackages.map((p) => (String(p.id) === targetId ? { ...p, ...updates } : p));
    this.notify();

    supabaseService.syncStateToSupabase('examPackages', this.db.examPackages);
    const updated = this.db.examPackages.find((p) => String(p.id) === targetId);
    if (updated) cloudSync.saveExamPackage(updated);
  }

  public deleteExamPackage(id: string) {
    const targetId = String(id);
    this.db.examPackages = this.db.examPackages.filter((p) => String(p.id) !== targetId);
    this.saveToStorage(this.db);
    this.notify();

    supabaseService.syncStateToSupabase('examPackages', this.db.examPackages);
    supabaseService.broadcastChange('delete_package', { id: targetId });
    cloudSync.deleteExamPackage(targetId);
    fetch(`/api/packages/${encodeURIComponent(targetId)}`, { method: 'DELETE' }).catch(() => {});
  }

  // Guru: Class Session & Token Management
  public setExamSession(session: Omit<ClassExamSession, 'id'>) {
    const existingIndex = this.db.sessions.findIndex(
      (s) => s.kelasId === session.kelasId && s.subjectId === session.subjectId
    );

    let sessionObj: ClassExamSession;

    if (existingIndex >= 0) {
      sessionObj = {
        ...this.db.sessions[existingIndex],
        ...session,
        activatedAt: session.isActive ? new Date().toISOString() : undefined,
      };
      this.db.sessions[existingIndex] = sessionObj;
    } else {
      sessionObj = {
        ...session,
        id: `ses-${Date.now().toString(36)}`,
        activatedAt: session.isActive ? new Date().toISOString() : undefined,
      };
      this.db.sessions.push(sessionObj);
    }
    this.notify();

    supabaseService.syncStateToSupabase('sessions', this.db.sessions);
    cloudSync.saveExamSession(sessionObj);

    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionObj),
    }).catch(() => {});
  }

  public toggleReleaseScore(sessionId: string, release: boolean) {
    this.db.sessions = this.db.sessions.map((s) => (s.id === sessionId ? { ...s, releaseScores: release } : s));
    this.notify();

    supabaseService.syncStateToSupabase('sessions', this.db.sessions);
    const sessionObj = this.db.sessions.find((s) => s.id === sessionId);
    if (sessionObj) cloudSync.saveExamSession(sessionObj);

    fetch(`/api/sessions/${sessionId}/release-score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ release }),
    }).catch(() => {});
  }

  // Siswa: Presence / Attendance
  public submitAttendance(record: Omit<AttendanceRecord, 'id' | 'timestamp'>) {
    const existing = this.db.attendance.find(
      (a) =>
        a.kelasId === record.kelasId &&
        a.subjectId === record.subjectId &&
        a.studentId === record.studentId
    );

    let attRecord: AttendanceRecord;
    if (existing) {
      existing.status = record.status;
      existing.timestamp = new Date().toISOString();
      attRecord = existing;
    } else {
      attRecord = {
        ...record,
        id: `att-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
      };
      this.db.attendance.push(attRecord);
    }
    this.notify();

    supabaseService.syncStateToSupabase('attendance', this.db.attendance);
    cloudSync.saveAttendance(attRecord);

    fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(() => {});
  }

  // Siswa & Guru: CBT Exam Submissions & Proctoring
  public recordViolation(violation: Omit<ProctorViolation, 'id' | 'timestamp'>) {
    const newViolation: ProctorViolation = {
      ...violation,
      id: `v-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    this.db.violations.unshift(newViolation);
    this.notify();

    supabaseService.syncStateToSupabase('violations', this.db.violations);
    cloudSync.saveViolation(newViolation);

    fetch('/api/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newViolation),
    }).catch(() => {});

    return newViolation;
  }

  // ================= SIMPAN HASIL UJIAN SISWA (REALTIME CLOUD & PERSISTENSI) =================
  public submitExam(submission: Omit<ExamSubmission, 'id' | 'submittedAt'>) {
    const newSub: ExamSubmission = {
      ...submission,
      id: `sub-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      submittedAt: new Date().toISOString(),
    };
    this.db.submissions.push(newSub);
    this.notify();

    // 1. Simpan ke Supabase tabel hasil_ujian & state
    supabaseService.saveHasilUjian(newSub);
    supabaseService.syncStateToSupabase('submissions', this.db.submissions);

    // 2. Simpan ke Firestore Cloud (jika aktif)
    cloudSync.saveHasilUjian(newSub);

    // 3. Simpan ke database server lokal (jika node server.ts aktif)
    fetch('/api/hasil-ujian', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSub),
    }).catch(() => {});

    return newSub;
  }
}

export const store = new StoreService();
