import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table (Admin, Guru, Siswa)
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uid: text('uid').unique(),
  username: text('username').notNull(),
  password: text('password'),
  role: text('role').notNull(), // 'admin' | 'guru' | 'siswa'
  name: text('name').notNull(),
  nip: text('nip'),
  nis: text('nis'),
  nisn: text('nisn'),
  kelasId: text('kelas_id'),
  kelasName: text('kelas_name'),
  jabatan: text('jabatan'),
  avatar: text('avatar'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Ruang Kelas
export const classes = sqliteTable('classes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  tingkat: integer('tingkat').notNull(), // 7 | 8 | 9
  waliKelas: text('wali_kelas').notNull(),
  themeColor: text('theme_color', { mode: 'json' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Mata Pelajaran
export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kode: text('kode').notNull(),
  tingkat: integer('tingkat').notNull(),
  guruId: text('guru_id'),
  guruName: text('guru_name'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Paket Soal Ujian (Exam Packages)
export const examPackages = sqliteTable('exam_packages', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subjectId: text('subject_id').notNull(),
  subjectName: text('subject_name').notNull(),
  tingkat: integer('tingkat').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  totalPoints: integer('total_points').notNull(),
  kkm: integer('kkm').notNull(),
  questions: text('questions', { mode: 'json' }).notNull(),
  createdByGuruId: text('created_by_guru_id').notNull(),
  createdByName: text('created_by_name').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tabel Soal (Specifically requested for CBT items)
export const soal = sqliteTable('soal', {
  id: text('id').primaryKey(),
  packageId: text('package_id'),
  subjectId: text('subject_id'),
  number: integer('number'),
  type: text('type').notNull(), // 'pilihan_ganda' | 'pilihan_ganda_kompleks' | 'benar_salah' | 'menjodohkan' | 'isian_singkat'
  text: text('text').notNull(),
  image: text('image'),
  points: integer('points').default(10).notNull(),
  options: text('options', { mode: 'json' }),
  correctAnswers: text('correct_answers', { mode: 'json' }),
  boolStatements: text('bool_statements', { mode: 'json' }),
  matchPairs: text('match_pairs', { mode: 'json' }),
  shortAnswerKeys: text('short_answer_keys', { mode: 'json' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Sesi Ujian Kelas
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  kelasId: text('kelas_id').notNull(),
  packageId: text('package_id').notNull(),
  subjectId: text('subject_id').notNull(),
  token: text('token').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(false).notNull(),
  releaseScores: integer('release_scores', { mode: 'boolean' }).default(false).notNull(),
  attendanceRequired: integer('attendance_required', { mode: 'boolean' }).default(true).notNull(),
  activatedAt: text('activated_at'),
});

// Hasil Ujian Siswa (Specifically requested: tabel hasil_ujian)
export const hasilUjian = sqliteTable('hasil_ujian', {
  id: text('id').primaryKey(),
  examSessionId: text('exam_session_id').notNull(),
  packageId: text('package_id').notNull(),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  studentNis: text('student_nis').notNull(),
  kelasId: text('kelas_id').notNull(),
  answers: text('answers', { mode: 'json' }).notNull(),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  percentage: integer('percentage').notNull(),
  passed: integer('passed', { mode: 'boolean' }).notNull(),
  violationsCount: integer('violations_count').default(0).notNull(),
  startedAt: text('started_at').default(sql`CURRENT_TIMESTAMP`),
  submittedAt: text('submitted_at').default(sql`CURRENT_TIMESTAMP`),
});

// Pelanggaran Proctoring Real-time
export const violations = sqliteTable('violations', {
  id: text('id').primaryKey(),
  examSessionId: text('exam_session_id').notNull(),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  studentNis: text('student_nis').notNull(),
  kelasId: text('kelas_id').notNull(),
  type: text('type').notNull(),
  message: text('message').notNull(),
  snapshot: text('snapshot'),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
});

// Presensi / Kehadiran Siswa
export const attendance = sqliteTable('attendance', {
  id: text('id').primaryKey(),
  kelasId: text('kelas_id').notNull(),
  subjectId: text('subject_id').notNull(),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  nis: text('nis').notNull(),
  status: text('status').notNull(),
  deviceInfo: text('device_info'),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
});

// Profil Sekolah & Konfigurasi Sistem
export const schoolProfile = sqliteTable('school_profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolName: text('school_name').notNull(),
  subtitle: text('subtitle'),
  npsn: text('npsn'),
  headmaster: text('headmaster'),
  headmasterNip: text('headmaster_nip'),
  academicYear: text('academic_year'),
  semester: text('semester'),
  adminUsername: text('admin_username'),
  adminPasswordHash: text('admin_password_hash'),
  address: text('address'),
  googleReferenceStatus: text('google_reference_status'),
});
