import { sqliteClient } from './index.ts';

export async function initSqliteDatabase() {
  try {
    await sqliteClient.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT UNIQUE,
        username TEXT NOT NULL,
        password TEXT,
        role TEXT NOT NULL,
        name TEXT NOT NULL,
        nip TEXT,
        nis TEXT,
        nisn TEXT,
        kelas_id TEXT,
        kelas_name TEXT,
        jabatan TEXT,
        avatar TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tingkat INTEGER NOT NULL,
        wali_kelas TEXT NOT NULL,
        theme_color TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kode TEXT NOT NULL,
        tingkat INTEGER NOT NULL,
        guru_id TEXT,
        guru_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS exam_packages (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        subject_name TEXT NOT NULL,
        tingkat INTEGER NOT NULL,
        duration_minutes INTEGER NOT NULL,
        total_points INTEGER NOT NULL,
        kkm INTEGER NOT NULL,
        questions TEXT NOT NULL,
        created_by_guru_id TEXT NOT NULL,
        created_by_name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS soal (
        id TEXT PRIMARY KEY,
        package_id TEXT,
        subject_id TEXT,
        number INTEGER,
        type TEXT NOT NULL,
        text TEXT NOT NULL,
        image TEXT,
        points INTEGER DEFAULT 10 NOT NULL,
        options TEXT,
        correct_answers TEXT,
        bool_statements TEXT,
        match_pairs TEXT,
        short_answer_keys TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        kelas_id TEXT NOT NULL,
        package_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        token TEXT NOT NULL,
        is_active INTEGER DEFAULT 0 NOT NULL,
        release_scores INTEGER DEFAULT 0 NOT NULL,
        attendance_required INTEGER DEFAULT 1 NOT NULL,
        activated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS hasil_ujian (
        id TEXT PRIMARY KEY,
        exam_session_id TEXT NOT NULL,
        package_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        student_nis TEXT NOT NULL,
        kelas_id TEXT NOT NULL,
        answers TEXT NOT NULL,
        score INTEGER NOT NULL,
        max_score INTEGER NOT NULL,
        percentage INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        violations_count INTEGER DEFAULT 0 NOT NULL,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        submitted_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS violations (
        id TEXT PRIMARY KEY,
        exam_session_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        student_nis TEXT NOT NULL,
        kelas_id TEXT NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        snapshot TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        kelas_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        nis TEXT NOT NULL,
        status TEXT NOT NULL,
        device_info TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS school_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_name TEXT NOT NULL,
        subtitle TEXT,
        npsn TEXT,
        headmaster TEXT,
        headmaster_nip TEXT,
        academic_year TEXT,
        semester TEXT,
        admin_username TEXT,
        admin_password_hash TEXT,
        address TEXT,
        google_reference_status TEXT
      );
    `);

    // Ensure default admin user exists
    const adminCheck = await sqliteClient.execute({
      sql: `SELECT id FROM users WHERE username = ? LIMIT 1`,
      args: ['admin'],
    });

    if (adminCheck.rows.length === 0) {
      await sqliteClient.execute({
        sql: `INSERT INTO users (username, password, role, name, jabatan)
              VALUES (?, ?, ?, ?, ?)`,
        args: ['admin', '123456', 'admin', 'Administrator SPANJU', 'Koordinator CBT & Google Admin'],
      });
    }

    // Ensure default school profile exists
    const profileCheck = await sqliteClient.execute({
      sql: `SELECT id FROM school_profile LIMIT 1`,
      args: [],
    });

    if (profileCheck.rows.length === 0) {
      await sqliteClient.execute({
        sql: `INSERT INTO school_profile (school_name, subtitle, npsn, headmaster, headmaster_nip, academic_year, semester, admin_username, admin_password_hash, address, google_reference_status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'SMP Negeri 7 Muara Badak',
          'Kandidat Sekolah Rujukan Google',
          '30401824',
          'Drs. H. Mulyadi, M.Pd.',
          '197205121998021003',
          '2025/2026',
          'Ganjil',
          'admin',
          '123456',
          'Jl. Poros Samarinda - Muara Badak Km. 14, Kec. Muara Badak, Kab. Kutai Kartanegara',
          'Kandidat Sekolah Rujukan Google Indonesia (Level 2 Verified)',
        ],
      });
    }

    console.log('SQLite database initialized successfully (cbt_spanju.db).');
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
  }
}
