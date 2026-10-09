-- =========================================================================
-- SPANJU CBT - SCRIPT SETUP DATABASE SUPABASE (POSTGRESQL + REALTIME)
-- =========================================================================
-- Panduan Penggunaan:
-- 1. Buka dashboard Supabase Anda di https://supabase.com
-- 2. Pilih project Anda, lalu klik menu "SQL Editor" di bilah kiri.
-- 3. Klik "New query", salin dan tempel SELURUH isi script ini ke editor.
-- 4. Klik tombol "Run" (Jalankan).
-- 5. Ambil Project URL dan Anon Public Key di menu Project Settings -> API.
-- 6. Masukkan ke file src/config/cloudConfig.ts atau Dashboard Admin CBT SPANJU.
-- =========================================================================

-- 1. Tabel Sinkronisasi Universal (Multi-Device Realtime State)
CREATE TABLE IF NOT EXISTS public.cbt_state (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Butir Soal (Bank Soal Granular)
CREATE TABLE IF NOT EXISTS public.soal (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  subject_id TEXT,
  number INT DEFAULT 1,
  type TEXT DEFAULT 'pilihan_ganda',
  text TEXT,
  image TEXT,
  points INT DEFAULT 10,
  options JSONB DEFAULT '[]'::jsonb,
  correct_answers JSONB DEFAULT '[]'::jsonb,
  bool_statements JSONB DEFAULT '[]'::jsonb,
  match_pairs JSONB DEFAULT '[]'::jsonb,
  short_answer_keys JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Hasil Ujian Siswa (Submissions)
CREATE TABLE IF NOT EXISTS public.hasil_ujian (
  id TEXT PRIMARY KEY,
  exam_session_id TEXT,
  package_id TEXT,
  student_id TEXT,
  student_name TEXT,
  student_nis TEXT,
  kelas_id TEXT,
  answers JSONB DEFAULT '[]'::jsonb,
  score NUMERIC DEFAULT 0,
  max_score NUMERIC DEFAULT 100,
  percentage NUMERIC DEFAULT 0,
  passed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent_seconds INT DEFAULT 0,
  status TEXT DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa kueri cepat
CREATE INDEX IF NOT EXISTS idx_soal_package_id ON public.soal (package_id);
CREATE INDEX IF NOT EXISTS idx_hasil_ujian_student_id ON public.hasil_ujian (student_id);
CREATE INDEX IF NOT EXISTS idx_hasil_ujian_session_id ON public.hasil_ujian (exam_session_id);

-- 4. Matikan RLS (Row Level Security) agar Client CBT Siswa & Guru dapat membaca & menyimpan tanpa hambatan token privat
ALTER TABLE public.cbt_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.soal DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hasil_ujian DISABLE ROW LEVEL SECURITY;

-- 5. Aktifkan Supabase Realtime agar perubahan Admin langsung terkirim ke semua perangkat seketika
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cbt_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cbt_state;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'soal'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.soal;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'hasil_ujian'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hasil_ujian;
  END IF;
END $$;

-- 6. Insert State Awal Jika Masih Kosong
INSERT INTO public.cbt_state (key, data)
VALUES 
  ('classes', '[]'::jsonb),
  ('teachers', '[]'::jsonb),
  ('students', '[]'::jsonb),
  ('subjects', '[]'::jsonb),
  ('examPackages', '[]'::jsonb),
  ('sessions', '[]'::jsonb),
  ('attendance', '[]'::jsonb),
  ('violations', '[]'::jsonb),
  ('profile', '{"schoolName": "SMP Negeri 7 Muara Badak", "subtitle": "Kandidat Sekolah Rujukan Google", "npsn": "30401824", "headmaster": "Drs. H. Mulyadi, M.Pd.", "academicYear": "2025/2026", "semester": "Ganjil", "adminUsername": "admin"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
