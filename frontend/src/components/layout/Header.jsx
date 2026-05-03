import { NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';
import './Header.css';

/**
 * Header — Top navigation bar with navigation links and user profile.
 */
export default function Header({ user, onMenuToggle }) {
  return (
    <header className="header" role="banner">
      <button
        className="header__menu-btn"
        onClick={onMenuToggle}
        aria-label="Abrir menú de navegación"
      >
        <Menu size={22} />
      </button>

      <nav className="header__nav" aria-label="Navegación superior">
        <NavLink to="/" className="header__nav-link" end>Inicio</NavLink>
        <NavLink to="/bitacora" className="header__nav-link">Mi bitácora</NavLink>
        <NavLink to="/dashboard" className="header__nav-link">Dashboard</NavLink>
        <NavLink to="/recursos" className="header__nav-link">Recursos</NavLink>
      </nav>

      <div className="header__user" id="user-profile">
        <div className="header__avatar" aria-hidden="true">
          {user?.initials || 'U'}
        </div>
        <div className="header__user-info">
          <span className="header__user-name">
            {user?.firstName} {user?.lastName?.charAt(0)}.
          </span>
          <span className="header__user-detail">
            {user?.carrera} · {user?.sede}
          </span>
        </div>
      </div>
    </header>
  );
}
