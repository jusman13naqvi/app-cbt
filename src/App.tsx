/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from './types/cbt';
import { LoginPage } from './components/auth/LoginPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { GuruDashboard } from './components/guru/GuruDashboard';
import { SiswaDashboard } from './components/siswa/SiswaDashboard';
import { store } from './services/store';
import { supabaseService } from './services/supabase';

const SESSION_KEY = 'SPANJU_CBT_ACTIVE_USER';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return null;
  });

  useEffect(() => {
    // Sinkronkan data saat aplikasi dimuat dari Supabase jika sudah terkonfigurasi
    if (supabaseService.isConfigured()) {
      store.syncFromSupabase();
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#070d1e] font-sans antialiased selection:bg-blue-600/30 selection:text-blue-300">
      {currentUser.role === 'admin' && (
        <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />
      )}
      {currentUser.role === 'guru' && (
        <GuruDashboard currentUser={currentUser} onLogout={handleLogout} />
      )}
      {currentUser.role === 'siswa' && (
        <SiswaDashboard currentUser={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}
