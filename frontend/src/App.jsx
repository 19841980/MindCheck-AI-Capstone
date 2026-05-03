import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import HomePage from './pages/HomePage';
import JournalPage from './pages/JournalPage';
import NewEntryPage from './pages/NewEntryPage';
import DashboardPage from './pages/DashboardPage';
import ResourcesPage from './pages/ResourcesPage';
import LoginPage from './pages/LoginPage';
import { MOCK_USER, MOCK_NOTIFICATIONS } from './data/mockData';
import './App.css';

/**
 * AppLayout — Wraps authenticated pages with Sidebar + Header.
 */
function AppLayout({ darkMode, onToggleDarkMode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = MOCK_USER;
  const notifCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <div className="app-layout">
      <Sidebar
        notificationCount={notifCount}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
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
 * App — Root component with routing and theme management.
 */
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  function handleToggleDarkMode() {
    setDarkMode(!darkMode);
    document.documentElement.setAttribute('data-theme', !darkMode ? 'dark' : 'light');
  }

  function handleLogin() {
    setIsAuthenticated(true);
  }

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginPage onLogin={handleLogin} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode} />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/bitacora" element={<JournalPage />} />
          <Route path="/bitacora/nueva" element={<NewEntryPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/recursos" element={<ResourcesPage />} />
          <Route path="/notificaciones" element={<div style={{padding:'var(--space-xl)'}}><h1>Notificaciones</h1><p style={{color:'var(--color-text-tertiary)',marginTop:'var(--space-sm)'}}>Próximamente — Módulo de notificaciones push.</p></div>} />
          <Route path="/privacidad" element={<div style={{padding:'var(--space-xl)'}}><h1>Privacidad y seguridad</h1><p style={{color:'var(--color-text-tertiary)',marginTop:'var(--space-sm)'}}>Próximamente — Configuración de privacidad y derecho al olvido.</p></div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
