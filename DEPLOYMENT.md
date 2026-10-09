# 🚀 Panduan Deployment: CBT SPANJU (SMP Negeri 7 Muara Badak)
**Kandidat Sekolah Rujukan Google**
*Dioptimalkan untuk Perangkat Chromebook & Cloudflare Pages / Workers*

---

## 📂 I. Struktur Arsitektur Folder Proyek
```
/
├── index.html                     # Entry point dengan typography Google & viewport Chromebook
├── package.json                   # Dependensi React 19, Tailwind CSS v4, Motion, Lucide, XLSX
├── schema.sql                     # Skema SQL database (Cloudflare D1 / Supabase / PostgreSQL)
├── wrangler.toml                  # Konfigurasi Cloudflare Pages / Workers & D1 Database
├── DEPLOYMENT.md                  # Panduan lengkap GitHub & Cloudflare
├── src/
│   ├── main.tsx                   # Mounting React Root
│   ├── App.tsx                    # Controller utama aplikasi & navigasi role dinamis
│   ├── index.css                  # Style sistem Google Material, scrollbars & security mode
│   ├── types/
│   │   └── cbt.ts                 # Definisi tipe TypeScript lengkap untuk seluruh entitas CBT
│   ├── services/
│   │   └── store.ts               # State engine terpusat, Excel importer/template, Backup JSON
│   └── components/
│       ├── common/
│       │   ├── Header.tsx         # Top bar 3-zone, Chromebook WiFi & Battery status
│       │   └── SpanjuBadge.tsx    # Logo emblem resmi Kandidat Sekolah Rujukan Google
│       ├── auth/
│       │   └── LoginPage.tsx      # Login card elegan dengan role switch & 1-klik akun demo
│       ├── admin/
│       │   └── AdminDashboard.tsx # Manajemen 7 Kelas, Guru, 11 Mapel, Siswa (Excel), Profil & Backup
│       ├── guru/
│       │   └── GuruDashboard.tsx  # Kotak kelas, Daftar Hadir, Paket CBT, Rekap Nilai, Live Proctoring Kamera
│       └── siswa/
│           ├── SiswaDashboard.tsx # Kotak 11 Mapel, Isi Presensi, Token Ujian, Pengumuman Nilai
│           └── CbtExamRunner.tsx  # Mode Keamanan Ketat Chromebook: Fullscreen, Anti-cheat, Kamera Webcam
```

---

## 🌐 II. Langkah 1: Push Kode ke Repositori GitHub Sekolah
1. Pastikan Anda telah menginstal `git` di laptop atau terminal server.
2. Buka terminal pada direktori proyek ini, lalu jalankan:
```bash
# Inisialisasi git dan buat branch main
git init
git add .
git commit -m "feat: Sistem CBT SPANJU Chromebook Ready v1.0"
git branch -M main

# Hubungkan ke repositori GitHub sekolah Anda
git remote add origin https://github.com/NAMA_ORGANISASI_SEKOLAH/cbt-spanju.git
git push -u origin main
```

---

## ⚡ III. Langkah 2: Deploy ke Vercel & GitHub (Pilihan Tercepat & Populer)

Aplikasi ini telah dilengkapi berkas konfigurasi `vercel.json` dan siap 100% untuk deployment SPA di Vercel.

### A. Deploy Otomatis via Vercel Dashboard:
1. Buka [https://vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
2. Klik tombol **Add New...** > **Project**.
3. Pilih repositori GitHub `cbt-spanju`.
4. Pada bagian **Build and Output Settings**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **KUNCI AGAR DATA SINKRON DI SEMUA PERANGKAT (Multi-Device Sync):**
   Pada menu **Environment Variables**, tambahkan 2 variabel berikut:
   - `VITE_SUPABASE_URL` = `https://xxx.supabase.co` (URL project Supabase Anda)
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOi...` (Anon public key Supabase Anda)
   *(Dengan menambahkan 2 variabel ini di Vercel, SEMUA HP, laptop, dan Chromebook siswa/guru yang membuka web otomatis terhubung ke database online yang sama!)*
6. Klik **Deploy**. Dalam hitungan detik, aplikasi Anda live di `https://nama-proyek.vercel.app`.

---

## 🗄️ IV. Langkah 3: Setup Database Online Gratis di Supabase (PostgreSQL + Realtime)

Supabase adalah penyedia PostgreSQL gratis dengan fitur WebSocket Realtime. Ini memastikan data yang diinput Admin seketika muncul di perangkat guru & siswa di manapun berada.

1. Buka [https://supabase.com](https://supabase.com) dan buat akun (100% gratis, tanpa kartu kredit).
2. Klik **New Project**, beri nama `cbt-spanju-smpn7`, pilih region Singapura (`Southeast Asia - Singapore`).
3. Tunggu 1 menit sampai database siap.
4. Klik menu **SQL Editor** di bilah kiri, klik **New query**.
5. Buka berkas `supabase_setup.sql` dari proyek ini, salin seluruh isinya dan tempelkan ke SQL Editor, lalu klik tombol **Run**.
6. Ambil kredensial di menu **Project Settings** > **API**:
   - Salin **Project URL**
   - Salin **Project API Keys** (pilih yang **anon public**)
7. **Dua Cara Menghubungkan ke Aplikasi:**
   - **Cara 1 (Otomatis untuk Semua)**: Masukkan ke Vercel Environment Variables (`VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`), lalu re-deploy.
   - **Cara 2 (Langsung dari UI)**: Buka web CBT Anda, masuk ke Dashboard Admin (atau klik status database di halaman Login), tempel URL & Key, lalu klik **Simpan & Hubungkan**. Setelah terhubung, klik **"Bagikan Link ke HP/Laptop Lain"** untuk menyalin tautan auto-connect instan.

---

## ⚡ V. Langkah Alternatif: Deploy ke Cloudflare Pages
2. Di menu navigasi samping, klik **Compute (Workers & Pages)** > **Create application**.
3. Pilih tab **Pages**, lalu klik tombol **Connect to Git**.
4. Pilih akun GitHub Anda dan pilih repositori `cbt-spanju`.
5. Pada bagian **Build settings**:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. (Opsional) Pada bagian **Environment variables**, tambahkan:
   - `NODE_VERSION` = `20`
7. Klik **Save and Deploy**.
8. Dalam waktu kurang dari 1 menit, aplikasi CBT SPANJU telah live di URL global:
   `https://cbt-spanju-smpn7.pages.dev` (atau dapat diarahkan ke domain resmi sekolah: `cbt.smpn7muarabadak.sch.id`).

---

## 🗄️ IV. Langkah 3: Menghubungkan Database Cloud (Cloudflare D1 / Supabase)

### A. Menggunakan Cloudflare D1 (Serverless SQLite Terdistribusi)
1. Di dashboard Cloudflare, buka **Workers & Pages** > **D1**.
2. Klik **Create database**, beri nama `cbt_spanju_db`.
3. Buka tab **Console**, lalu salin seluruh isi berkas `schema.sql` dan jalankan query untuk membuat tabel-tabel data master secara otomatis.
4. Perbarui `database_id` pada berkas `wrangler.toml` dengan UUID database yang baru dibuat.

### B. Menggunakan Supabase (PostgreSQL Cloud)
1. Buat proyek baru di [https://supabase.com](https://supabase.com).
2. Buka menu **SQL Editor**, tempelkan isi berkas `schema.sql`, dan klik **Run**.
3. Salin URL dan Anon Key Supabase ke dalam `.env` atau Cloudflare Environment Variables.

---

## 💻 V. Pengaturan Kiosk Mode Chromebook (Google Admin Console)
Untuk menyelenggarakan ujian dengan keamanan maksimal di lingkungan Kandidat Sekolah Rujukan Google:
1. Masuk ke **Google Admin Console** (`admin.google.com`) dengan akun Google Workspace for Education sekolah.
2. Buka **Devices** > **Chrome** > **Apps & extensions** > **Kiosks**.
3. Pilih Unit Organisasi (OU) siswa SMP Negeri 7 Muara Badak.
4. Klik tanda **+ (Add Web App)**, lalu masukkan URL Cloudflare Pages CBT Anda (`https://cbt-spanju-smpn7.pages.dev`).
5. Aktifkan opsi **Auto-launch app** saat Chromebook dinyalakan siswa.
6. Dengan pengaturan ini, siswa tidak dapat membuka tab lain, browser lain, maupun menonaktifkan kamera selama ujian berlangsung.
