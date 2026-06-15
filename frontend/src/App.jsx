/**
 * MindCheck — Root Application Component.
 *
 * Manages authentication state via Supabase onAuthStateChange listener.
 * When a session exists (login/signup/token refresh), the app renders
 * the authenticated layout. Otherwise, the login page is shown.
 *
 * Provides UserContext so any page can access the authenticated user
 * without prop-drilling.
 *
 * The Supabase user metadata is mapped to the app's user shape for
 * Header, Sidebar, and page-level greeting components.
 */

import { useState, useEffect, createContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { alertsApi } from './services/api';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import HomePage from './pages/HomePage';
import JournalPage from './pages/JournalPage';
import NewEntryPage from './pages/NewEntryPage';
import DashboardPage from './pages/DashboardPage';
import ResourcesPage from './pages/ResourcesPage';
import LoginPage from './pages/LoginPage';
import NotificacionesPage from './pages/NotificacionesPage';
import PrivacidadPage from './pages/PrivacidadPage';
import './App.css';

/**
 * UserContext — Provides the authenticated user object to all pages.
 * Consumed via useContext(UserContext) in any child component.
 */
export const UserContext = createContext(null);

/**
 * Builds a user object compatible with the existing Header/Sidebar
 * from the Supabase user metadata. Falls back to sensible defaults
 * when metadata is incomplete.
 */
function buildUserFromSession(supabaseUser) {
  if (!supabaseUser) return null;

  const email = supabaseUser.email || '';
  const meta = supabaseUser.user_metadata || {};

  // Derive display name from metadata or email prefix
  const firstName = meta.first_name || meta.firstName || email.split('@')[0].split('.')[0] || 'Estudiante';
  const lastName = meta.last_name || meta.lastName || email.split('@')[0].split('.')[1] || '';
  const capitalizedFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const capitalizedLast = lastName.charAt(0).toUpperCase() + lastName.slice(1);

  return {
    id: supabaseUser.id,
    firstName: capitalizedFirst,
    lastName: capitalizedLast,
    initials: `${capitalizedFirst.charAt(0)}${capitalizedLast.charAt(0) || ''}`.toUpperCase(),
    email,
    sede: meta.sede || 'Sin asignar',
    carrera: meta.carrera || 'Sin asignar',
    avatarUrl: meta.avatar_url || null,
  };
}

/**
 * AppLayout — Wraps authenticated pages with Sidebar + Header.
 * Fetches unread alert count from the backend for the notification badge.
 */
function AppLayout({ user, darkMode, onToggleDarkMode, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  /**
   * Fetch unread alert count from backend on mount.
   * Silent failure — badge shows 0 if the API is unreachable.
   */
  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const response = await alertsApi.getUnreadCount();
        setUnreadAlertCount(response.unread_count || 0);
      } catch {
        // Silent fallback — badge shows 0
      }
    }
    fetchUnreadCount();

    // Listen to custom event when an alert is acknowledged to refresh badge count
    window.addEventListener('alert-acknowledged', fetchUnreadCount);
    return () => {
      window.removeEventListener('alert-acknowledged', fetchUnreadCount);
    };
  }, []);

  return (
    <div className="app-layout">
      <Sidebar
        notificationCount={unreadAlertCount}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        onLogout={onLogout}
      />
      <div className="app-layout__body">
        <Header user={user} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * App — Root component with routing and Supabase auth state.
 *
 * Uses supabase.auth.onAuthStateChange() to reactively respond
 * to login, logout, and token refresh events. This means:
 * - If the user closes and reopens the browser, the session is restored.
 * - If the token expires, Supabase refreshes it automatically.
 * - Calling supabase.auth.signOut() triggers an immediate redirect to login.
 */
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // 1. Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });

    // 2. Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, updatedSession) => {
        setSession(updatedSession);
      }
    );

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  function handleToggleDarkMode() {
    setDarkMode(!darkMode);
    document.documentElement.setAttribute('data-theme', !darkMode ? 'dark' : 'light');
  }

  function handleLogin() {
    // Session is updated automatically by onAuthStateChange.
    // This callback exists for any future side-effects (e.g., analytics).
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    // Session is cleared automatically by onAuthStateChange → setSession(null)
  }

  // Show nothing while checking for existing session (avoids login flash)
  if (session === undefined) {
    return null;
  }

  // Not authenticated → show login
  if (!session) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginPage onLogin={handleLogin} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Authenticated → render app
  const user = buildUserFromSession(session.user);

  return (
    <UserContext.Provider value={user}>
      <BrowserRouter>
        <Routes>
          <Route element={
            <AppLayout
              user={user}
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
              onLogout={handleLogout}
            />
          }>
            <Route path="/" element={<HomePage />} />
            <Route path="/bitacora" element={<JournalPage />} />
            <Route path="/bitacora/nueva" element={<NewEntryPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/recursos" element={<ResourcesPage />} />
            <Route path="/notificaciones" element={<NotificacionesPage />} />
            <Route path="/privacidad" element={<PrivacidadPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserContext.Provider>
  );
}
