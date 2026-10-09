-- =========================================================================
-- DATABASE SCHEMA: CBT SPANJU (SMP NEGERI 7 MUARA BADAK)
-- Kandidat Sekolah Rujukan Google
-- Kompatibel dengan Cloudflare D1 (SQLite Serverless), Supabase / PostgreSQL
-- =========================================================================

-- 1. Tabel Profil Sekolah & Konfigurasi Sistem
CREATE TABLE IF NOT EXISTS school_profile (
  id TEXT PRIMARY KEY,
  school_name TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  npsn TEXT NOT NULL,
  headmaster TEXT NOT NULL,
  headmaster_nip TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('Ganjil', 'Genap')),
  admin_username TEXT NOT NULL DEFAULT 'admin',
  admin_password_hash TEXT NOT NULL,
  google_reference_status TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Kelas (7 Kelas dengan Palet Visual Khas)
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tingkat INTEGER NOT NULL CHECK (tingkat IN (7, 8, 9)),
  wali_kelas TEXT NOT NULL,
  theme_color TEXT NOT NULL, -- JSON string berisi warna bg, text, border
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Pengguna (Admin, Guru, Siswa)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'guru', 'siswa')),
  name TEXT NOT NULL,
  nip TEXT,
  nis TEXT,
  nisn TEXT,
  kelas_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
  jabatan TEXT,
  avatar TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Mata Pelajaran (11 Mapel Pokok Kurikulum)
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kode TEXT NOT NULL,
  tingkat INTEGER NOT NULL CHECK (tingkat IN (7, 8, 9)),
  guru_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Paket Soal CBT (Bank Soal 5 Tipe)
CREATE TABLE IF NOT EXISTS exam_packages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  tingkat INTEGER NOT NULL CHECK (tingkat IN (7, 8, 9)),
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  total_points INTEGER NOT NULL DEFAULT 100,
  kkm INTEGER NOT NULL DEFAULT 75,
  questions_json TEXT NOT NULL, -- JSON memuat butir soal, opsi gambar & kunci jawaban
  created_by_guru_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Sesi Ujian Kelas (Token Ujian)
CREATE TABLE IF NOT EXISTS class_exam_sessions (
  id TEXT PRIMARY KEY,
  kelas_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  package_id TEXT REFERENCES exam_packages(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  release_scores BOOLEAN NOT NULL DEFAULT FALSE,
  attendance_required BOOLEAN NOT NULL DEFAULT TRUE,
  activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Daftar Hadir / Presensi Ujian
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  kelas_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  nis TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Hadir', 'Sakit', 'Izin', 'Alpha')),
  device_info TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabel Hasil & Lembar Jawaban Siswa
CREATE TABLE IF NOT EXISTS exam_submissions (
  id TEXT PRIMARY KEY,
  exam_session_id TEXT REFERENCES class_exam_sessions(id) ON DELETE CASCADE,
  package_id TEXT REFERENCES exam_packages(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_nis TEXT NOT NULL,
  kelas_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  answers_json TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  percentage INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  violations_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabel Log Pelanggaran Proctoring Waktu Nyata
CREATE TABLE IF NOT EXISTS proctor_violations (
  id TEXT PRIMARY KEY,
  exam_session_id TEXT REFERENCES class_exam_sessions(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_nis TEXT NOT NULL,
  kelas_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('tab_switch', 'exit_fullscreen', 'split_screen', 'screenshot_blocked', 'blur_window')),
  message TEXT NOT NULL,
  snapshot_url TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk akselerasi query real-time
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_kelas ON users(kelas_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON class_exam_sessions(kelas_id, is_active);
CREATE INDEX IF NOT EXISTS idx_violations_session ON proctor_violations(exam_session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_submissions_session ON exam_submissions(exam_session_id, student_id);
