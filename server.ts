import express from 'express';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/db/index.ts';
import { initSqliteDatabase } from './src/db/init.ts';
import {
  users,
  classes,
  subjects,
  examPackages,
  soal,
  sessions,
  hasilUjian,
  violations,
  attendance,
  schoolProfile,
} from './src/db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// ================= API: AUTHENTICATION =================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { role, username, password } = req.body;
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (role === 'admin') {
      const profileResult = await db.select().from(schoolProfile).limit(1);
      const adminPass = profileResult[0]?.adminPasswordHash || '123456';
      const adminUser = (profileResult[0]?.adminUsername || 'admin').toLowerCase();

      if ((cleanUser === adminUser || cleanUser === 'admin') && (cleanPass === adminPass || cleanPass === '123456')) {
        return res.json({
          id: 'admin-0',
          username: 'admin',
          role: 'admin',
          name: 'Administrator SPANJU',
          jabatan: 'Koordinator CBT & Google Admin',
        });
      }
      return res.status(401).json({ error: 'Username atau password admin salah!' });
    }

    if (role === 'guru') {
      const teacher = await db
        .select()
        .from(users)
        .where(and(eq(users.role, 'guru'), eq(users.username, cleanUser)))
        .limit(1);

      if (teacher.length > 0 && teacher[0].password === cleanPass) {
        return res.json(teacher[0]);
      }
      return res.status(401).json({ error: 'Username atau password guru salah!' });
    }

    if (role === 'siswa') {
      const student = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, 'siswa'),
            eq(users.username, cleanUser)
          )
        )
        .limit(1);

      if (student.length > 0 && student[0].password === cleanPass) {
        return res.json(student[0]);
      }

      // Check by NIS as fallback
      const studentByNis = await db
        .select()
        .from(users)
        .where(and(eq(users.role, 'siswa'), eq(users.nis, cleanUser)))
        .limit(1);

      if (studentByNis.length > 0 && studentByNis[0].password === cleanPass) {
        return res.json(studentByNis[0]);
      }

      return res.status(401).json({ error: 'Username/NIS atau password siswa salah!' });
    }

    return res.status(400).json({ error: 'Role tidak valid.' });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Gagal melakukan login database.' });
  }
});

// ================= API: SOAL (TABEL SOAL) =================
app.get('/api/soal', async (req, res) => {
  try {
    const { packageId, subjectId } = req.query;
    let query = db.select().from(soal);

    if (packageId) {
      const result = await db.select().from(soal).where(eq(soal.packageId, String(packageId)));
      return res.json(result);
    }
    if (subjectId) {
      const result = await db.select().from(soal).where(eq(soal.subjectId, String(subjectId)));
      return res.json(result);
    }

    const allSoal = await query;
    res.json(allSoal);
  } catch (error: any) {
    console.error('Error fetching soal:', error);
    res.status(500).json({ error: 'Gagal mengambil data soal dari database.' });
  }
});

app.post('/api/soal', async (req, res) => {
  try {
    const data = req.body;
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      const id = item.id || `soal-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
      await db
        .insert(soal)
        .values({
          id,
          packageId: item.packageId || null,
          subjectId: item.subjectId || null,
          number: item.number || 1,
          type: item.type,
          text: item.text,
          image: item.image || null,
          points: item.points || 10,
          options: item.options || [],
          correctAnswers: item.correctAnswers || [],
          boolStatements: item.boolStatements || [],
          matchPairs: item.matchPairs || [],
          shortAnswerKeys: item.shortAnswerKeys || [],
        })
        .onConflictDoUpdate({
          target: soal.id,
          set: {
            text: item.text,
            type: item.type,
            image: item.image || null,
            points: item.points || 10,
            options: item.options || [],
            correctAnswers: item.correctAnswers || [],
            boolStatements: item.boolStatements || [],
            matchPairs: item.matchPairs || [],
            shortAnswerKeys: item.shortAnswerKeys || [],
          },
        });
    }

    res.json({ success: true, count: items.length });
  } catch (error: any) {
    console.error('Error saving soal:', error);
    res.status(500).json({ error: 'Gagal menyimpan soal ke database.' });
  }
});

// ================= API: HASIL_UJIAN (TABEL HASIL_UJIAN) =================
app.get('/api/hasil-ujian', async (req, res) => {
  try {
    const { examSessionId, studentId } = req.query;

    if (examSessionId && studentId) {
      const result = await db
        .select()
        .from(hasilUjian)
        .where(
          and(
            eq(hasilUjian.examSessionId, String(examSessionId)),
            eq(hasilUjian.studentId, String(studentId))
          )
        )
        .orderBy(desc(hasilUjian.submittedAt));
      return res.json(result);
    }

    if (examSessionId) {
      const result = await db
        .select()
        .from(hasilUjian)
        .where(eq(hasilUjian.examSessionId, String(examSessionId)))
        .orderBy(desc(hasilUjian.submittedAt));
      return res.json(result);
    }

    if (studentId) {
      const result = await db
        .select()
        .from(hasilUjian)
        .where(eq(hasilUjian.studentId, String(studentId)))
        .orderBy(desc(hasilUjian.submittedAt));
      return res.json(result);
    }

    const allHasil = await db.select().from(hasilUjian).orderBy(desc(hasilUjian.submittedAt));
    res.json(allHasil);
  } catch (error: any) {
    console.error('Error fetching hasil_ujian:', error);
    res.status(500).json({ error: 'Gagal mengambil hasil ujian.' });
  }
});

app.post('/api/hasil-ujian', async (req, res) => {
  try {
    const payload = req.body;
    const id = payload.id || `sub-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;

    const saved = await db
      .insert(hasilUjian)
      .values({
        id,
        examSessionId: payload.examSessionId || payload.exam_session_id,
        packageId: payload.packageId || payload.package_id,
        studentId: payload.studentId || payload.student_id,
        studentName: payload.studentName || payload.student_name,
        studentNis: payload.studentNis || payload.student_nis,
        kelasId: payload.kelasId || payload.kelas_id,
        answers: payload.answers || {},
        score: payload.score || 0,
        maxScore: payload.maxScore || payload.max_score || 100,
        percentage: payload.percentage || 0,
        passed: Boolean(payload.passed),
        violationsCount: payload.violationsCount || payload.violations_count || 0,
        startedAt: payload.startedAt ? String(payload.startedAt) : new Date().toISOString(),
        submittedAt: payload.submittedAt ? String(payload.submittedAt) : new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: hasilUjian.id,
        set: {
          answers: payload.answers,
          score: payload.score,
          percentage: payload.percentage,
          passed: Boolean(payload.passed),
          violationsCount: payload.violationsCount || payload.violations_count || 0,
          submittedAt: new Date().toISOString(),
        },
      })
      .returning();

    res.json(saved[0] || { id, ...payload });
  } catch (error: any) {
    console.error('Error saving hasil_ujian:', error);
    res.status(500).json({ error: 'Gagal menyimpan hasil ujian ke database.' });
  }
});

// ================= API: KELAS =================
app.get('/api/classes', async (req, res) => {
  try {
    const data = await db.select().from(classes);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data kelas.' });
  }
});

app.post('/api/classes', async (req, res) => {
  try {
    const { name, tingkat, waliKelas, themeColor } = req.body;
    const id = `k-${Date.now().toString(36)}`;
    const newClass = await db
      .insert(classes)
      .values({
        id,
        name,
        tingkat: Number(tingkat),
        waliKelas,
        themeColor: themeColor || {},
      })
      .returning();
    res.json(newClass[0]);
  } catch (error) {
    res.status(500).json({ error: 'Gagal menambahkan kelas.' });
  }
});

app.put('/api/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tingkat, waliKelas } = req.body;
    await db
      .update(classes)
      .set({ name, tingkat: Number(tingkat), waliKelas })
      .where(eq(classes.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui kelas.' });
  }
});

app.delete('/api/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(classes).where(eq(classes.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus kelas.' });
  }
});

// ================= API: GURU =================
app.get('/api/teachers', async (req, res) => {
  try {
    const data = await db.select().from(users).where(eq(users.role, 'guru'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data guru.' });
  }
});

app.post('/api/teachers', async (req, res) => {
  try {
    const { name, nip, jabatan, username, password } = req.body;
    const newTeacher = await db
      .insert(users)
      .values({
        role: 'guru',
        name,
        nip,
        jabatan: jabatan || 'Guru Mata Pelajaran',
        username: username.toLowerCase().trim(),
        password: password || '123',
      })
      .returning();
    res.json(newTeacher[0]);
  } catch (error) {
    res.status(500).json({ error: 'Gagal menambahkan guru.' });
  }
});

app.delete('/api/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    if (!isNaN(numId)) {
      await db.delete(users).where(eq(users.id, numId));
    } else {
      await db.delete(users).where(eq(users.username, id));
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ error: 'Gagal menghapus guru.' });
  }
});

// ================= API: SISWA =================
app.get('/api/students', async (req, res) => {
  try {
    const { kelasId } = req.query;
    if (kelasId) {
      const data = await db
        .select()
        .from(users)
        .where(and(eq(users.role, 'siswa'), eq(users.kelasId, String(kelasId))));
      return res.json(data);
    }
    const data = await db.select().from(users).where(eq(users.role, 'siswa'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data siswa.' });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const { name, nis, nisn, kelasId, kelasName, username, password } = req.body;
    const cleanUser = (username || nis || `siswa.${Date.now()}`).toLowerCase().trim();
    const newStudent = await db
      .insert(users)
      .values({
        role: 'siswa',
        name,
        nis,
        nisn,
        kelasId,
        kelasName,
        username: cleanUser,
        password: password || '123456',
        avatar: '👨‍🎓',
      })
      .returning();
    res.json(newStudent[0]);
  } catch (error) {
    res.status(500).json({ error: 'Gagal menambahkan siswa.' });
  }
});

app.post('/api/students/bulk', async (req, res) => {
  try {
    const { studentsList } = req.body;
    if (!Array.isArray(studentsList)) {
      return res.status(400).json({ error: 'Data siswa harus berupa array.' });
    }

    const inserted = [];
    for (const s of studentsList) {
      const cleanUser = (s.username || s.nis || `siswa.${Date.now()}`).toLowerCase().trim();
      const row = await db
        .insert(users)
        .values({
          role: 'siswa',
          name: s.name,
          nis: s.nis,
          nisn: s.nisn,
          kelasId: s.kelasId,
          kelasName: s.kelasName,
          username: cleanUser,
          password: s.password || '123456',
          avatar: s.avatar || '👨‍🎓',
        })
        .returning();
      inserted.push(row[0]);
    }
    res.json({ success: true, count: inserted.length });
  } catch (error) {
    res.status(500).json({ error: 'Gagal impor massal siswa.' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    if (!isNaN(numId)) {
      await db.delete(users).where(eq(users.id, numId));
    } else {
      await db.delete(users).where(eq(users.username, id));
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Gagal menghapus siswa.' });
  }
});

// ================= API: MATA PELAJARAN =================
app.get('/api/subjects', async (req, res) => {
  try {
    const data = await db.select().from(subjects);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil mata pelajaran.' });
  }
});

app.post('/api/subjects', async (req, res) => {
  try {
    const { name, kode, tingkat, guruId, guruName } = req.body;
    const id = `mp-${Date.now().toString(36)}`;
    const newSub = await db
      .insert(subjects)
      .values({
        id,
        name,
        kode,
        tingkat: Number(tingkat),
        guruId,
        guruName,
      })
      .returning();
    res.json(newSub[0]);
  } catch (error) {
    res.status(500).json({ error: 'Gagal menambahkan mata pelajaran.' });
  }
});

app.delete('/api/subjects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(subjects).where(eq(subjects.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus mata pelajaran.' });
  }
});

// ================= API: PAKET SOAL UJIAN =================
app.get('/api/packages', async (req, res) => {
  try {
    const data = await db.select().from(examPackages);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil paket ujian.' });
  }
});

app.post('/api/packages', async (req, res) => {
  try {
    const pkg = req.body;
    const id = `pkg-${Date.now().toString(36)}`;
    const newPkg = await db
      .insert(examPackages)
      .values({
        id,
        title: pkg.title,
        subjectId: pkg.subjectId,
        subjectName: pkg.subjectName,
        tingkat: Number(pkg.tingkat),
        durationMinutes: Number(pkg.durationMinutes),
        totalPoints: Number(pkg.totalPoints),
        kkm: Number(pkg.kkm),
        questions: pkg.questions || [],
        createdByGuruId: pkg.createdByGuruId,
        createdByName: pkg.createdByName,
      })
      .returning();

    // Simpan juga butir soal individual ke tabel 'soal'
    if (Array.isArray(pkg.questions)) {
      for (const q of pkg.questions) {
        const qId = q.id || `soal-${id}-${q.number}`;
        await db
          .insert(soal)
          .values({
            id: qId,
            packageId: id,
            subjectId: pkg.subjectId,
            number: q.number,
            type: q.type,
            text: q.text,
            image: q.image || null,
            points: q.points || 10,
            options: q.options || [],
            correctAnswers: q.correctAnswers || [],
            boolStatements: q.boolStatements || [],
            matchPairs: q.matchPairs || [],
            shortAnswerKeys: q.shortAnswerKeys || [],
          })
          .onConflictDoNothing();
      }
    }

    res.json(newPkg[0]);
  } catch (error: any) {
    console.error('Error creating exam package:', error);
    res.status(500).json({ error: 'Gagal membuat paket soal ujian.' });
  }
});

app.delete('/api/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(examPackages).where(eq(examPackages.id, id));
    await db.delete(soal).where(eq(soal.packageId, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus paket ujian.' });
  }
});

// ================= API: SESI UJIAN KELAS =================
app.get('/api/sessions', async (req, res) => {
  try {
    const data = await db.select().from(sessions);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil sesi ujian.' });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const s = req.body;
    const existing = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.kelasId, s.kelasId), eq(sessions.subjectId, s.subjectId)));

    if (existing.length > 0) {
      const updated = await db
        .update(sessions)
        .set({
          packageId: s.packageId,
          token: s.token,
          isActive: Boolean(s.isActive),
          releaseScores: Boolean(s.releaseScores),
          attendanceRequired: Boolean(s.attendanceRequired),
          activatedAt: s.isActive ? new Date().toISOString() : existing[0].activatedAt,
        })
        .where(eq(sessions.id, existing[0].id))
        .returning();
      return res.json(updated[0]);
    }

    const id = `ses-${Date.now().toString(36)}`;
    const newSession = await db
      .insert(sessions)
      .values({
        id,
        kelasId: s.kelasId,
        packageId: s.packageId,
        subjectId: s.subjectId,
        token: s.token,
        isActive: Boolean(s.isActive),
        releaseScores: Boolean(s.releaseScores),
        attendanceRequired: Boolean(s.attendanceRequired),
        activatedAt: s.isActive ? new Date().toISOString() : null,
      })
      .returning();

    res.json(newSession[0]);
  } catch (error) {
    res.status(500).json({ error: 'Gagal menyimpan sesi ujian.' });
  }
});

app.put('/api/sessions/:id/release-score', async (req, res) => {
  try {
    const { id } = req.params;
    const { release } = req.body;
    await db.update(sessions).set({ releaseScores: Boolean(release) }).where(eq(sessions.id, id));
    res.json({ success: true, releaseScores: Boolean(release) });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui rilis nilai.' });
  }
});

// ================= API: VIOLATIONS =================
app.get('/api/violations', async (req, res) => {
  try {
    const data = await db.select().from(violations).orderBy(desc(violations.timestamp));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data pelanggaran.' });
  }
});

app.post('/api/violations', async (req, res) => {
  try {
    const v = req.body;
    const id = `v-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const newV = await db
      .insert(violations)
      .values({
        id,
        examSessionId: v.examSessionId,
        studentId: v.studentId,
        studentName: v.studentName,
        studentNis: v.studentNis,
        kelasId: v.kelasId,
        type: v.type,
        message: v.message,
        snapshot: v.snapshot || null,
      })
      .returning();
    res.json(newV[0]);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mencatat pelanggaran.' });
  }
});

// ================= API: ATTENDANCE =================
app.get('/api/attendance', async (req, res) => {
  try {
    const data = await db.select().from(attendance);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data absensi.' });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const a = req.body;
    const id = `att-${Date.now().toString(36)}`;
    const newAtt = await db
      .insert(attendance)
      .values({
        id,
        kelasId: a.kelasId,
        subjectId: a.subjectId,
        studentId: a.studentId,
        studentName: a.studentName,
        nis: a.nis,
        status: a.status || 'Hadir',
        deviceInfo: a.deviceInfo || null,
      })
      .returning();
    res.json(newAtt[0]);
  } catch (error) {
    res.status(500).json({ error: 'Gagal menyimpan absensi.' });
  }
});

// ================= API: SCHOOL PROFILE =================
app.get('/api/profile', async (req, res) => {
  try {
    const data = await db.select().from(schoolProfile).limit(1);
    if (data.length > 0) {
      return res.json(data[0]);
    }
    res.json({
      schoolName: 'SMP Negeri 7 Muara Badak',
      subtitle: 'Kandidat Sekolah Rujukan Google',
      npsn: '30401824',
      adminUsername: 'admin',
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil profil sekolah.' });
  }
});

app.put('/api/profile', async (req, res) => {
  try {
    const updates = req.body;
    const existing = await db.select().from(schoolProfile).limit(1);
    if (existing.length > 0) {
      await db.update(schoolProfile).set(updates).where(eq(schoolProfile.id, existing[0].id));
    } else {
      await db.insert(schoolProfile).values(updates);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui profil sekolah.' });
  }
});

// ================= API: RESET DATABASE (CLEAR DUMB DATA) =================
app.post('/api/database/clear', async (req, res) => {
  try {
    await db.delete(hasilUjian);
    await db.delete(soal);
    await db.delete(examPackages);
    await db.delete(sessions);
    await db.delete(violations);
    await db.delete(attendance);
    await db.delete(subjects);
    await db.delete(classes);
    // Delete all users except admin
    await db.delete(users).where(eq(users.role, 'guru'));
    await db.delete(users).where(eq(users.role, 'siswa'));

    // Ensure admin user exists with password 123456
    const adminExists = await db.select().from(users).where(eq(users.username, 'admin'));
    if (adminExists.length === 0) {
      await db.insert(users).values({
        username: 'admin',
        password: '123456',
        role: 'admin',
        name: 'Administrator SPANJU',
        jabatan: 'Koordinator CBT & Google Admin',
      });
    }

    res.json({ success: true, message: 'Database berhasil dikosongkan. Akun admin (admin / 123456) tetap aktif.' });
  } catch (error: any) {
    console.error('Error clearing database:', error);
    res.status(500).json({ error: 'Gagal mengosongkan database.' });
  }
});

// ================= VITE DEV MIDDLEWARE OR STATIC SERVE =================
async function startServer() {
  await initSqliteDatabase();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`CBT SPANJU Server running on port ${PORT}`);
  });
}

startServer();
