import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  Question,
  ExamSubmission,
  Kelas,
  User,
  MataPelajaran,
  ExamPackage,
  ClassExamSession,
  AttendanceRecord,
  ProctorViolation,
  SchoolProfile,
} from '../types/cbt';
import { defaultCloudConfig } from '../config/cloudConfig';

const STORAGE_SUPABASE_KEY = 'SPANJU_SUPABASE_CONFIG';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;
  private channel: RealtimeChannel | null = null;
  private realtimeListeners: Set<(payload: any) => void> = new Set();

  constructor() {
    this.init();
  }

  public init() {
    // 0. Auto-Connect via URL Query Params (misal dibagikan admin via link: ?cloud_url=...&cloud_key=...)
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const qUrl = urlParams.get('cloud_url') || urlParams.get('sb_url');
        const qKey = urlParams.get('cloud_key') || urlParams.get('sb_key');

        if (qUrl && qKey && qUrl.trim() && qKey.trim()) {
          const newCfg = { url: qUrl.trim(), anonKey: qKey.trim() };
          localStorage.setItem(STORAGE_SUPABASE_KEY, JSON.stringify(newCfg));
          this.config = newCfg;
          this.client = createClient(newCfg.url, newCfg.anonKey);
          this.setupRealtimeChannel();

          // Bersihkan URL dari parameter agar rapi
          try {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          } catch {}
          return;
        }
      } catch (err) {
        console.warn('URL auto-config parser error:', err);
      }
    }

    // 1. Check environment variables (Vite / Vercel Environment Variables)
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    if (envUrl && envKey && envUrl.trim() && envKey.trim()) {
      this.config = { url: envUrl.trim(), anonKey: envKey.trim() };
      this.client = createClient(this.config.url, this.config.anonKey);
      this.setupRealtimeChannel();
      return;
    }

    // 2. Check bundled default cloud config
    if (defaultCloudConfig.supabaseUrl && defaultCloudConfig.supabaseAnonKey && defaultCloudConfig.supabaseUrl.trim() && defaultCloudConfig.supabaseAnonKey.trim()) {
      this.config = {
        url: defaultCloudConfig.supabaseUrl.trim(),
        anonKey: defaultCloudConfig.supabaseAnonKey.trim(),
      };
      this.client = createClient(this.config.url, this.config.anonKey);
      this.setupRealtimeChannel();
      return;
    }

    // 3. Check locally saved config in browser storage
    try {
      const stored = localStorage.getItem(STORAGE_SUPABASE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url && parsed.anonKey && parsed.url.trim() && parsed.anonKey.trim()) {
          this.config = { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
          this.client = createClient(this.config.url, this.config.anonKey);
          this.setupRealtimeChannel();
        }
      }
    } catch {}
  }

  public isConfigured(): boolean {
    return !!(this.client && this.config?.url && this.config?.anonKey);
  }

  public getConfig(): SupabaseConfig | null {
    return this.config;
  }

  public generateShareLink(): string {
    if (!this.config || !this.config.url || !this.config.anonKey) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/?cloud_url=${encodeURIComponent(this.config.url)}&cloud_key=${encodeURIComponent(this.config.anonKey)}`;
  }

  public setConfig(url: string, anonKey: string) {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();
    if (!cleanUrl || !cleanKey) {
      localStorage.removeItem(STORAGE_SUPABASE_KEY);
      if (this.channel) {
        this.client?.removeChannel(this.channel);
      }
      this.client = null;
      this.config = null;
      return;
    }

    const newConfig: SupabaseConfig = { url: cleanUrl, anonKey: cleanKey };
    localStorage.setItem(STORAGE_SUPABASE_KEY, JSON.stringify(newConfig));
    this.config = newConfig;
    this.client = createClient(cleanUrl, cleanKey);
    this.setupRealtimeChannel();
    this.realtimeListeners.forEach((fn) => fn({ type: 'config_changed' }));
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  // ================= REAL-TIME MULTI-DEVICE SUBSCRIPTIONS =================
  private setupRealtimeChannel() {
    if (!this.client) return;
    try {
      if (this.channel) {
        this.client.removeChannel(this.channel);
      }

      this.channel = this.client
        .channel('spanju_cbt_cloud_sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cbt_state' },
          (payload) => {
            const rowData: any = payload.new;
            this.realtimeListeners.forEach((fn) =>
              fn({
                type: 'cbt_state',
                key: rowData?.key,
                data: rowData?.data,
                payload,
              })
            );
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hasil_ujian' },
          (payload) => {
            this.realtimeListeners.forEach((fn) => fn({ type: 'hasil_ujian', payload }));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'soal' },
          (payload) => {
            this.realtimeListeners.forEach((fn) => fn({ type: 'soal', payload }));
          }
        )
        .on(
          'broadcast',
          { event: 'data_change' },
          (payload) => {
            this.realtimeListeners.forEach((fn) => fn({ type: 'broadcast', payload: payload.payload }));
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Supabase Realtime Connected! Multi-device synchronization active.');
          }
        });
    } catch (e) {
      console.warn('Realtime channel error:', e);
    }
  }

  public onRealtimeChange(callback: (payload: any) => void): () => void {
    this.realtimeListeners.add(callback);
    return () => this.realtimeListeners.delete(callback);
  }

  public broadcastChange(action: string, data?: any) {
    if (!this.client || !this.channel) return;
    try {
      this.channel.send({
        type: 'broadcast',
        event: 'data_change',
        payload: { action, data, timestamp: Date.now() },
      });
    } catch {}
  }

  // ================= AMBIL SELURUH DATA DARI SUPABASE CLOUD =================
  public async fetchFullStateFromSupabase(): Promise<{
    classes?: Kelas[];
    teachers?: User[];
    students?: User[];
    subjects?: MataPelajaran[];
    examPackages?: ExamPackage[];
    sessions?: ClassExamSession[];
    attendance?: AttendanceRecord[];
    violations?: ProctorViolation[];
    submissions?: ExamSubmission[];
    profile?: SchoolProfile;
    adminPasswordHash?: string;
  } | null> {
    if (!this.client) return null;

    try {
      const result: any = {};

      // 1. Ambil dari tabel sinkronisasi universal 'cbt_state'
      const { data: stateRows, error: stateErr } = await this.client
        .from('cbt_state')
        .select('*');

      if (!stateErr && Array.isArray(stateRows) && stateRows.length > 0) {
        stateRows.forEach((row: any) => {
          if (row.key === 'classes') result.classes = row.data;
          else if (row.key === 'teachers') result.teachers = row.data;
          else if (row.key === 'students') result.students = row.data;
          else if (row.key === 'subjects') result.subjects = row.data;
          else if (row.key === 'examPackages') result.examPackages = row.data;
          else if (row.key === 'sessions') result.sessions = row.data;
          else if (row.key === 'attendance') result.attendance = row.data;
          else if (row.key === 'violations') result.violations = row.data;
          else if (row.key === 'profile') {
            result.profile = row.data;
            if (row.data?.adminPasswordHash) {
              result.adminPasswordHash = row.data.adminPasswordHash;
            }
          }
        });
      }

      // 2. Ambil dari tabel hasil_ujian (jika ada)
      try {
        const subs = await this.getHasilUjian();
        if (subs && subs.length > 0) {
          result.submissions = subs;
        }
      } catch {}

      return Object.keys(result).length > 0 ? result : null;
    } catch (err) {
      console.warn('Gagal memuat state dari Supabase:', err);
      return null;
    }
  }

  // ================= SIMPAN MASTER STATE KE SUPABASE =================
  public async syncStateToSupabase(key: string, data: any) {
    if (!this.client) return;
    try {
      await this.client.from('cbt_state').upsert({
        key,
        data,
        updated_at: new Date().toISOString(),
      });
      this.broadcastChange(key, data);
    } catch (e) {
      console.warn(`Error syncing ${key} to Supabase:`, e);
    }
  }

  // ================= 1. AMBIL SOAL DARI TABEL SOAL SUPABASE =================
  public async getSoal(packageId?: string): Promise<Question[]> {
    if (!this.client) {
      const url = packageId ? `/api/soal?packageId=${encodeURIComponent(packageId)}` : '/api/soal';
      const res = await fetch(url).catch(() => null);
      if (!res || !res.ok) return [];
      return await res.json();
    }

    try {
      let query = this.client.from('soal').select('*');
      if (packageId) {
        query = query.eq('package_id', packageId);
      }
      query = query.order('number', { ascending: true });

      const { data, error } = await query;
      if (error) {
        console.warn('Error fetching soal from Supabase:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        type: row.type,
        number: row.number || 1,
        text: row.text,
        image: row.image,
        points: row.points || 10,
        options: row.options || [],
        correctAnswers: row.correct_answers || [],
        boolStatements: row.bool_statements || [],
        matchPairs: row.match_pairs || [],
        shortAnswerKeys: row.short_answer_keys || [],
      }));
    } catch (err) {
      console.warn('Gagal mengambil soal dari Supabase:', err);
      return [];
    }
  }

  public async saveSoal(questions: Question[], packageId: string, subjectId: string) {
    if (!this.client || questions.length === 0) return;
    try {
      const rows = questions.map((q) => ({
        id: q.id || `soal-${packageId}-${q.number}`,
        package_id: packageId,
        subject_id: subjectId,
        number: q.number,
        type: q.type,
        text: q.text,
        image: q.image || null,
        points: q.points || 10,
        options: q.options || [],
        correct_answers: q.correctAnswers || [],
        bool_statements: q.boolStatements || [],
        match_pairs: q.matchPairs || [],
        short_answer_keys: q.shortAnswerKeys || [],
      }));

      await this.client.from('soal').upsert(rows);
    } catch (e) {
      console.warn('Gagal menyimpan butir soal ke tabel soal Supabase:', e);
    }
  }

  // ================= 2. SIMPAN HASIL JAWABAN SISWA KE TABEL HASIL_UJIAN =================
  public async saveHasilUjian(hasil: ExamSubmission): Promise<any> {
    const payload = {
      id: hasil.id,
      exam_session_id: hasil.examSessionId,
      package_id: hasil.packageId,
      student_id: hasil.studentId,
      student_name: hasil.studentName,
      student_nis: hasil.studentNis,
      kelas_id: hasil.kelasId,
      answers: hasil.answers,
      score: hasil.score,
      max_score: hasil.maxScore,
      percentage: hasil.percentage,
      passed: hasil.passed,
      violations_count: hasil.violationsCount || 0,
      started_at: hasil.startedAt || new Date().toISOString(),
      submitted_at: hasil.submittedAt || new Date().toISOString(),
    };

    if (this.client) {
      try {
        await this.client.from('hasil_ujian').upsert(payload);
        this.broadcastChange('hasil_ujian', payload);
      } catch (err) {
        console.warn('Error pushing hasil_ujian to Supabase:', err);
      }
    }

    // Juga kirim ke backend API jika server node lokal tersedia
    fetch('/api/hasil-ujian', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});

    return payload;
  }

  // ================= 3. AMBIL SELURUH HASIL UJIAN =================
  public async getHasilUjian(examSessionId?: string, studentId?: string): Promise<ExamSubmission[]> {
    if (!this.client) {
      let url = '/api/hasil-ujian';
      const params = new URLSearchParams();
      if (examSessionId) params.append('examSessionId', examSessionId);
      if (studentId) params.append('studentId', studentId);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url).catch(() => null);
      if (!res || !res.ok) return [];
      return await res.json();
    }

    try {
      let query = this.client.from('hasil_ujian').select('*');
      if (examSessionId) {
        query = query.eq('exam_session_id', examSessionId);
      }
      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      query = query.order('submitted_at', { ascending: false });

      const { data, error } = await query;
      if (error) {
        console.warn('Error fetching hasil_ujian from Supabase:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        examSessionId: row.exam_session_id,
        packageId: row.package_id,
        studentId: row.student_id,
        studentName: row.student_name,
        studentNis: row.student_nis,
        kelasId: row.kelas_id,
        answers: row.answers || {},
        score: row.score,
        maxScore: row.max_score,
        percentage: row.percentage,
        passed: row.passed,
        violationsCount: row.violations_count || 0,
        startedAt: row.started_at,
        submittedAt: row.submitted_at,
      }));
    } catch (err) {
      console.warn('Gagal memuat hasil ujian dari Supabase:', err);
      return [];
    }
  }

  // ================= 4. TEST KONEKSI SUPABASE =================
  public async testConnection(url: string, key: string): Promise<{ success: boolean; message: string; tablesFound: boolean }> {
    try {
      const tempClient = createClient(url.trim(), key.trim());
      // Tes koneksi dengan query cbt_state
      const { data, error } = await tempClient.from('cbt_state').select('key').limit(1);

      if (error) {
        if (error.message.includes('relation "cbt_state" does not exist') || error.code === '42P01') {
          return {
            success: false,
            tablesFound: false,
            message: 'Koneksi ke server Supabase berhasil, TETAPI tabel "cbt_state" belum dibuat. Harap jalankan script SQL di Supabase SQL Editor terlebih dahulu!',
          };
        }
        return { success: false, tablesFound: false, message: `Koneksi gagal: ${error.message}` };
      }

      return {
        success: true,
        tablesFound: true,
        message: 'Koneksi ke Supabase Cloud Berhasil & Tabel Terdeteksi! Siap sinkronisasi antar-perangkat secara real-time.',
      };
    } catch (err: any) {
      return { success: false, tablesFound: false, message: err.message || 'Gagal menghubungi Supabase.' };
    }
  }
}

export const supabaseService = new SupabaseService();
