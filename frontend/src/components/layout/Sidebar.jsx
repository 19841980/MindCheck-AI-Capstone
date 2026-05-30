import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, BookOpen, BarChart3, Heart,
  Bell, Shield, Settings, LogOut, Moon, Sun
} from 'lucide-react';
import './Sidebar.css';

/**
 * Sidebar — Main navigation component.
 * Uses NavLink for active state highlighting.
 * Accessible via keyboard navigation.
 */
export default function Sidebar({ notificationCount = 0, darkMode, onToggleDarkMode, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/bitacora', icon: BookOpen, label: 'Mi bitácora', badge: 5 },
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/recursos', icon: Heart, label: 'Recursos' },
  ];

  const alertItems = [
    { path: '/notificaciones', icon: Bell, label: 'Notificaciones', badge: notificationCount },
    { path: '/privacidad', icon: Shield, label: 'Privacidad' },
  ];

  return (
    <aside className="sidebar" role="navigation" aria-label="Navegación principal">
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#2D6A4F" strokeWidth="2" fill="none" />
            <circle cx="14" cy="14" r="5" fill="#40916C" />
          </svg>
        </div>
        <span className="sidebar__logo-text">
          <strong>Mind</strong>Check
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar__nav">
        <ul className="sidebar__nav-list">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar__nav-link ${isActive ? 'sidebar__nav-link--active' : ''}`
                }
                end={item.path === '/'}
                id={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
              >
                <item.icon size={18} className="sidebar__nav-icon" />
                <span className="sidebar__nav-label">{item.label}</span>
                {item.badge > 0 && (
                  <span className="sidebar__badge" aria-label={`${item.badge} pendientes`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Alerts section */}
        <div className="sidebar__section-label">ALERTAS</div>
        <ul className="sidebar__nav-list">
          {alertItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar__nav-link ${isActive ? 'sidebar__nav-link--active' : ''}`
                }
                id={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
              >
                <item.icon size={18} className="sidebar__nav-icon" />
                <span className="sidebar__nav-label">{item.label}</span>
                {item.badge > 0 && (
                  <span className="sidebar__badge" aria-label={`${item.badge} pendientes`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="sidebar__footer">
        <button
          className="sidebar__nav-link sidebar__theme-toggle"
          onClick={onToggleDarkMode}
          aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          <span className="sidebar__nav-label">{darkMode ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
        {onLogout && (
          <button
            className="sidebar__nav-link sidebar__logout-btn"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            id="btn-logout"
          >
            <LogOut size={18} />
            <span className="sidebar__nav-label">Cerrar sesión</span>
          </button>
        )}
        <div className="sidebar__encrypted">
          <Shield size={14} />
          <div>
            <strong>Datos cifrados</strong>
            <span>Tu información está protegida con AES-256</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
