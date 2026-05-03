import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import './LoginPage.css';

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rut || !password) return;
    setIsLoading(true);
    setError(null);
    // Simulate auth
    await new Promise(r => setTimeout(r, 1200));
    setIsLoading(false);
    onLogin?.();
    navigate('/');
  }

  return (
    <div className="login-page">
      <div className="login-page__bg" />
      <div className="login-page__card animate-scale-in">
        <div className="login-page__logo">
          <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#2D6A4F" strokeWidth="2" fill="none" />
            <circle cx="14" cy="14" r="5" fill="#40916C" />
          </svg>
          <h1><strong>Mind</strong>Check</h1>
        </div>
        <p className="login-page__tagline">Plataforma de bienestar mental estudiantil</p>

        <form onSubmit={handleSubmit} className="login-page__form">
          <div className="login-page__field">
            <label htmlFor="login-rut">RUT Institucional</label>
            <input id="login-rut" type="text" placeholder="12.345.678-9" value={rut} onChange={e => setRut(e.target.value)} autoComplete="username" />
          </div>
          <div className="login-page__field">
            <label htmlFor="login-password">Contraseña</label>
            <div className="login-page__password-wrap">
              <input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" className="login-page__eye" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <div className="login-page__error" role="alert">{error}</div>}
          <button type="submit" className="login-page__submit" disabled={isLoading || !rut || !password}>
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="login-page__security">
          <Shield size={14} />
          <span>Conexión segura · Datos protegidos con cifrado AES-256</span>
        </div>

        <div className="login-page__footer">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Duoc_UC.svg/200px-Duoc_UC.svg.png" alt="Duoc UC" className="login-page__duoc-logo" />
          <span>Dirección de Bienestar Estudiantil</span>
        </div>
      </div>
    </div>
  );
}
