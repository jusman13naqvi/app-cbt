export type UserRole = 'admin' | 'guru' | 'siswa';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  nip?: string;
  nis?: string;
  nisn?: string;
  kelasId?: string;
  kelasName?: string;
  jabatan?: string;
  avatar?: string;
}

export interface Kelas {
  id: string;
  name: string;
  tingkat: 7 | 8 | 9;
  waliKelas: string;
  themeColor: {
    bg: string;
    border: string;
    text: string;
    lightBg: string;
    accent: string;
  };
}

export interface MataPelajaran {
  id: string;
  name: string;
  kode: string;
  tingkat: 7 | 8 | 9;
  guruId: string;
  guruName: string;
}

export type QuestionType =
  | 'pilihan_ganda'
  | 'pilihan_ganda_kompleks'
  | 'benar_salah'
  | 'menjodohkan'
  | 'isian_singkat';

export interface OptionItem {
  id: string;
  label: string; // 'A', 'B', 'C', 'D'
  text: string;
  image?: string;
}

export interface BoolStatement {
  id: string;
  statement: string;
  correctAnswer: boolean; // true = Benar, false = Salah
}

export interface MatchPair {
  id: string;
  premise: string; // Kolom Kiri
  correctMatch: string; // Kolom Kanan
}

export interface Question {
  id: string;
  type: QuestionType;
  number: number;
  text: string;
  image?: string;
  points: number;
  // Options for Single & Multi Choice
  options?: OptionItem[];
  correctAnswers?: string[]; // IDs of correct options
  // For True/False
  boolStatements?: BoolStatement[];
  // For Matching
  matchPairs?: MatchPair[];
  // For Short Answer
  shortAnswerKeys?: string[]; // acceptable answers, trimmed and lowercase
}

export interface ExamPackage {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  tingkat: 7 | 8 | 9;
  durationMinutes: number;
  totalPoints: number;
  kkm: number;
  questions: Question[];
  createdByGuruId: string;
  createdByName: string;
  createdAt: string;
}

export interface ClassExamSession {
  id: string;
  kelasId: string;
  packageId: string;
  subjectId: string;
  token: string;
  isActive: boolean;
  releaseScores: boolean;
  attendanceRequired: boolean;
  activatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  kelasId: string;
  subjectId: string;
  studentId: string;
  studentName: string;
  nis: string;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';
  timestamp: string;
  deviceInfo?: string;
}

export interface ProctorViolation {
  id: string;
  examSessionId: string;
  studentId: string;
  studentName: string;
  studentNis: string;
  kelasId: string;
  type: 'tab_switch' | 'exit_fullscreen' | 'split_screen' | 'screenshot_blocked' | 'blur_window';
  message: string;
  timestamp: string;
  snapshot?: string;
}

export interface StudentLiveState {
  studentId: string;
  studentName: string;
  nis: string;
  kelasId: string;
  examSessionId: string;
  currentQuestion: number;
  answeredCount: number;
  violationsCount: number;
  status: 'active' | 'warning' | 'submitted' | 'disqualified';
  lastPing: string;
  cameraActive: boolean;
  webcamSnapshot?: string;
}

export interface ExamSubmission {
  id: string;
  examSessionId: string;
  packageId: string;
  studentId: string;
  studentName: string;
  studentNis: string;
  kelasId: string;
  answers: Record<string, any>;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  violationsCount: number;
  startedAt: string;
  submittedAt: string;
}

export interface SchoolProfile {
  schoolName: string;
  subtitle: string;
  npsn: string;
  headmaster: string;
  headmasterNip: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  adminUsername: string;
  address: string;
  googleReferenceStatus: string;
}
