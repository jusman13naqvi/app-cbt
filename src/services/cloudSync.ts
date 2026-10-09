import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import {
  Kelas,
  User,
  MataPelajaran,
  ExamPackage,
  ClassExamSession,
  AttendanceRecord,
  ProctorViolation,
  ExamSubmission,
  SchoolProfile,
  Question,
} from '../types/cbt';

export interface CloudSyncCallbacks {
  onClassesChange?: (classes: Kelas[]) => void;
  onTeachersChange?: (teachers: User[]) => void;
  onStudentsChange?: (students: User[]) => void;
  onSubjectsChange?: (subjects: MataPelajaran[]) => void;
  onPackagesChange?: (packages: ExamPackage[]) => void;
  onSessionsChange?: (sessions: ClassExamSession[]) => void;
  onAttendanceChange?: (attendance: AttendanceRecord[]) => void;
  onViolationsChange?: (violations: ProctorViolation[]) => void;
  onSubmissionsChange?: (submissions: ExamSubmission[]) => void;
  onProfileChange?: (profile: SchoolProfile, adminPasswordHash: string) => void;
}

class FirestoreSyncService {
  private isListening = false;
  private unsubscribers: Array<() => void> = [];

  public isAvailable(): boolean {
    return !!firestore;
  }

  // ================= 1. REAL-TIME MULTI-DEVICE LISTENERS =================
  public startRealtimeSync(callbacks: CloudSyncCallbacks) {
    if (this.isListening || !firestore) return;
    this.isListening = true;

    try {
      // 1. Classes
      const unsubClasses = onSnapshot(collection(firestore, 'cbt_classes'), (snapshot) => {
        const items: Kelas[] = [];
        snapshot.forEach((d) => items.push(d.data() as Kelas));
        if (callbacks.onClassesChange) callbacks.onClassesChange(items);
      }, (err) => console.warn('Cloud classes sync error:', err));
      this.unsubscribers.push(unsubClasses);

      // 2. Teachers
      const unsubTeachers = onSnapshot(collection(firestore, 'cbt_teachers'), (snapshot) => {
        const items: User[] = [];
        snapshot.forEach((d) => items.push(d.data() as User));
        if (callbacks.onTeachersChange) callbacks.onTeachersChange(items);
      }, (err) => console.warn('Cloud teachers sync error:', err));
      this.unsubscribers.push(unsubTeachers);

      // 3. Students
      const unsubStudents = onSnapshot(collection(firestore, 'cbt_students'), (snapshot) => {
        const items: User[] = [];
        snapshot.forEach((d) => items.push(d.data() as User));
        if (callbacks.onStudentsChange) callbacks.onStudentsChange(items);
      }, (err) => console.warn('Cloud students sync error:', err));
      this.unsubscribers.push(unsubStudents);

      // 4. Subjects
      const unsubSubjects = onSnapshot(collection(firestore, 'cbt_subjects'), (snapshot) => {
        const items: MataPelajaran[] = [];
        snapshot.forEach((d) => items.push(d.data() as MataPelajaran));
        if (callbacks.onSubjectsChange) callbacks.onSubjectsChange(items);
      }, (err) => console.warn('Cloud subjects sync error:', err));
      this.unsubscribers.push(unsubSubjects);

      // 5. Exam Packages
      const unsubPackages = onSnapshot(collection(firestore, 'cbt_packages'), (snapshot) => {
        const items: ExamPackage[] = [];
        snapshot.forEach((d) => items.push(d.data() as ExamPackage));
        if (callbacks.onPackagesChange) callbacks.onPackagesChange(items);
      }, (err) => console.warn('Cloud packages sync error:', err));
      this.unsubscribers.push(unsubPackages);

      // 6. Exam Sessions
      const unsubSessions = onSnapshot(collection(firestore, 'cbt_sessions'), (snapshot) => {
        const items: ClassExamSession[] = [];
        snapshot.forEach((d) => items.push(d.data() as ClassExamSession));
        if (callbacks.onSessionsChange) callbacks.onSessionsChange(items);
      }, (err) => console.warn('Cloud sessions sync error:', err));
      this.unsubscribers.push(unsubSessions);

      // 7. Attendance
      const unsubAttendance = onSnapshot(collection(firestore, 'cbt_attendance'), (snapshot) => {
        const items: AttendanceRecord[] = [];
        snapshot.forEach((d) => items.push(d.data() as AttendanceRecord));
        if (callbacks.onAttendanceChange) callbacks.onAttendanceChange(items);
      }, (err) => console.warn('Cloud attendance sync error:', err));
      this.unsubscribers.push(unsubAttendance);

      // 8. Violations
      const unsubViolations = onSnapshot(collection(firestore, 'cbt_violations'), (snapshot) => {
        const items: ProctorViolation[] = [];
        snapshot.forEach((d) => items.push(d.data() as ProctorViolation));
        if (callbacks.onViolationsChange) callbacks.onViolationsChange(items);
      }, (err) => console.warn('Cloud violations sync error:', err));
      this.unsubscribers.push(unsubViolations);

      // 9. Hasil Ujian (Submissions)
      const unsubSubmissions = onSnapshot(collection(firestore, 'cbt_hasil_ujian'), (snapshot) => {
        const items: ExamSubmission[] = [];
        snapshot.forEach((d) => items.push(d.data() as ExamSubmission));
        if (callbacks.onSubmissionsChange) callbacks.onSubmissionsChange(items);
      }, (err) => console.warn('Cloud submissions sync error:', err));
      this.unsubscribers.push(unsubSubmissions);

      // 10. School Profile & System Meta
      const unsubProfile = onSnapshot(doc(firestore, 'cbt_meta', 'profile'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const { adminPasswordHash, ...profileData } = data;
          if (callbacks.onProfileChange) {
            callbacks.onProfileChange(profileData as SchoolProfile, adminPasswordHash || '123456');
          }
        }
      }, (err) => console.warn('Cloud profile sync error:', err));
      this.unsubscribers.push(unsubProfile);

    } catch (e) {
      console.error('Failed to initialize real-time cloud listeners:', e);
    }
  }

  public stopRealtimeSync() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.isListening = false;
  }

  // ================= 2. MUTATIONS (PUSH TO CLOUD) =================
  public async saveClass(cls: Kelas) {
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, 'cbt_classes', String(cls.id)), cls, { merge: true });
    } catch (e) {
      console.warn('Error saving class to cloud:', e);
    }
  }

  public async deleteClass(id: string) {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'cbt_classes', String(id)));
    } catch (e) {
      console.warn('Error deleting class from cloud:', e);
    }
  }

  public async saveTeacher(guru: User) {
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, 'cbt_teachers', String(guru.id)), guru, { merge: true });
    } catch (e) {
      console.warn('Error saving teacher to cloud:', e);
    }
  }

  public async deleteTeacher(id: string) {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'cbt_teachers', String(id)));
    } catch (e) {
      console.warn('Error deleting teacher from cloud:', e);
    }
  }

  public async saveStudent(student: User) {
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, 'cbt_students', String(student.id)), student, { merge: true });
    } catch (e) {
      console.warn('Error saving student to cloud:', e);
    }
  }

  public async bulkSaveStudents(students: User[]) {
    if (!firestore || students.length === 0) return;
    try {
      const batch = writeBatch(firestore);
      students.forEach((s) => {
        batch.set(doc(firestore, 'cbt_students', String(s.id)), s, { merge: true });
      });
      await batch.commit();
    } catch (e) {
      console.warn('Error bulk saving students to cloud:', e);
    }
  }

  public async deleteStudent(id: string) {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'cbt_students', String(id)));
    } catch (e) {
      console.warn('Error deleting student from cloud:', e);
    }
  }

  public async saveSubject(sub: MataPelajaran) {
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, 'cbt_subjects', String(sub.id)), sub, { merge: true });
    } catch (e) {
      console.warn('Error saving subject to cloud:', e);
    }
  }

  public async deleteSubject(id: string) {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'cbt_subjects', String(id)));
    } catch (e) {
      console.warn('Error deleting subject from cloud:', e);
    }
  }

  public async saveExamPackage(pkg: ExamPackage) {
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, 'cbt_packages', String(pkg.id)), pkg, { merge: true });

      // Simpan butir soal ke cbt_soal untuk akses granular
      if (Array.isArray(pkg.questions)) {
        const batch = writeBatch(firestore);
        pkg.questions.forEach((q) => {
          const qId = q.id || `soal-${pkg.id}-${q.number}`;
          batch.set(
            doc(firestore, 'cbt_soal', String(qId)),
            { ...q, packageId: pkg.id, subjectId: pkg.subjectId },
            { merge: true }
          );
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('Error saving exam package to cloud:', e);
    }
  }

  public async deleteExamPackage(id: string) {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'cbt_packages', String(id)));
    } catch (e) {
      console.warn('Error deleting exam package from cloud:', e);
    }
  }

  public async saveExamSession(session: ClassExamSession) {
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, 'cbt_sessions', String(session.id)), session, { merge: true });
    } catch (e) {
      console.warn('Error saving exam session to cloud:', e);
    }
  }

  public async saveAttendance(att: AttendanceRecord) {
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, 'cbt_attendance', String(att.id)), att, { merge: true });
    } catch (e) {
      console.warn('Error saving attendance to cloud:', e);
    }
  }

  public async saveViolation(v: ProctorViolation) {
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, 'cbt_violations', String(v.id)), v, { merge: true });
    } catch (e) {
      console.warn('Error saving violation to cloud:', e);
    }
  }

  // ================= 3. SIMPAN HASIL UJIAN SISWA (REALTIME CLOUD) =================
  public async saveHasilUjian(sub: ExamSubmission) {
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, 'cbt_hasil_ujian', String(sub.id)), sub, { merge: true });
    } catch (e) {
      console.warn('Error saving submission to cloud:', e);
    }
  }

  public async saveProfile(profile: SchoolProfile, adminPasswordHash?: string) {
    if (!firestore) return;
    try {
      await setDoc(
        doc(firestore, 'cbt_meta', 'profile'),
        { ...profile, adminPasswordHash: adminPasswordHash || '123456' },
        { merge: true }
      );
    } catch (e) {
      console.warn('Error saving profile to cloud:', e);
    }
  }

  // ================= 4. BULK SYNC FULL STATE TO CLOUD =================
  public async syncAllToCloud(dbData: {
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
  }) {
    if (!firestore) return;
    try {
      if (dbData.classes?.length) {
        for (const c of dbData.classes) await this.saveClass(c);
      }
      if (dbData.teachers?.length) {
        for (const t of dbData.teachers) await this.saveTeacher(t);
      }
      if (dbData.students?.length) {
        await this.bulkSaveStudents(dbData.students);
      }
      if (dbData.subjects?.length) {
        for (const s of dbData.subjects) await this.saveSubject(s);
      }
      if (dbData.examPackages?.length) {
        for (const p of dbData.examPackages) await this.saveExamPackage(p);
      }
      if (dbData.sessions?.length) {
        for (const s of dbData.sessions) await this.saveExamSession(s);
      }
      if (dbData.profile) {
        await this.saveProfile(dbData.profile, dbData.adminPasswordHash);
      }
    } catch (e) {
      console.warn('Error syncing full state to cloud:', e);
    }
  }

  // ================= 5. KOSONGKAN DATA CLOUD =================
  public async clearAllCloudData() {
    if (!firestore) return;
    try {
      const collectionsToClear = [
        'cbt_classes',
        'cbt_teachers',
        'cbt_students',
        'cbt_subjects',
        'cbt_packages',
        'cbt_soal',
        'cbt_sessions',
        'cbt_attendance',
        'cbt_violations',
        'cbt_hasil_ujian',
      ];

      for (const colName of collectionsToClear) {
        const snap = await getDocs(collection(firestore, colName));
        const batch = writeBatch(firestore);
        snap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn('Error clearing cloud data:', e);
    }
  }
}

export const cloudSync = new FirestoreSyncService();
