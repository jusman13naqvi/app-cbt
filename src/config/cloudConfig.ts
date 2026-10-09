/**
 * Konfigurasi Database Cloud Global SPANJU CBT (Supabase / PostgreSQL)
 * 
 * CARA MENGHUBUNGKAN APLIKASI SECARA ONLINE & REAL-TIME KE SEMUA PERANGKAT (VERCEL / GITHUB):
 * 1. Buat project gratis di https://supabase.com
 * 2. Buka menu SQL Editor di Supabase, lalu jalankan script yang ada di file /supabase_setup.sql
 * 3. Buka Project Settings -> API di Supabase, salin Project URL dan anon public key.
 * 4. Masukkan ke variabel di bawah ini, atau pasang di Vercel Environment Variables:
 *    - VITE_SUPABASE_URL
 *    - VITE_SUPABASE_ANON_KEY
 * 5. Saat dideploy ke Vercel, semua laptop admin, komputer guru, dan HP/Chromebook siswa
 *    akan langsung terhubung ke database online yang sama secara real-time!
 */

export interface CloudDatabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export const defaultCloudConfig: CloudDatabaseConfig = {
  // Masukkan URL & Key Supabase project Anda di sini (opsional, bisa juga diatur via Dashboard Admin)
  supabaseUrl: '',
  supabaseAnonKey: '',
};
