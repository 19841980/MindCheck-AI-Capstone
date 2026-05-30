/**
 * MindCheck — Login Page.
 *
 * Autenticación Institucional Nativa con Supabase Auth (Propuesta 1).
 *
 * Flujo:
 * 1. El estudiante ingresa su correo institucional (@duocuc.cl o @profesor.duoc.cl)
 *    y su contraseña.
 * 2. El frontend valida el dominio del correo con Regex ANTES de llamar a Supabase
 *    para evitar solicitudes innecesarias.
 * 3. Si es la primera vez, se registra con signUp; en adelante, con signInWithPassword.
 * 4. Tras login exitoso, el JWT (access_token) queda persistido por Supabase JS
 *    en localStorage automáticamente. El callback onLogin() actualiza el estado de App.
 *
 * Errores de Supabase se traducen a mensajes empáticos en español (§3.3).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertCircle, Loader2, UserPlus, LogIn } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import './LoginPage.css';

/**
 * Regex para validar dominios institucionales de Duoc UC.
 * Solo permite correos que terminen en @duocuc.cl o @profesor.duoc.cl
 */
const INSTITUTIONAL_EMAIL_REGEX = /^[^\s@]+@(duocuc\.cl|profesor\.duoc\.cl)$/i;

/**
 * Traduce códigos de error comunes de Supabase Auth a mensajes
 * empáticos en español (lenguaje no alarmista, §3.3).
 */
function translateSupabaseError(errorMessage) {
  const message = (errorMessage || '').toLowerCase();

  if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
    return 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.';
  }
  if (message.includes('email not confirmed')) {
    return 'Tu cuenta aún no ha sido confirmada. Revisa tu bandeja de entrada para activarla.';
  }
  if (message.includes('user already registered') || message.includes('already been registered')) {
    return 'Este correo ya está registrado. Intenta iniciar sesión en lugar de registrarte.';
  }
  if (message.includes('signup is disabled')) {
    return 'El registro de nuevas cuentas está temporalmente deshabilitado. Contacta al equipo de soporte.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Demasiados intentos. Por favor espera unos minutos antes de intentar de nuevo.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'No pudimos conectar con el servidor de autenticación. Verifica tu conexión a internet.';
  }
  if (message.includes('password') && message.includes('6')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }

  // Fallback genérico
  return `Error de autenticación: ${errorMessage}`;
}


export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  /**
   * Valida que el correo pertenezca a un dominio institucional
   * ANTES de enviar la solicitud a Supabase.
   * Retorna true si es válido, false si no.
   */
  function validateInstitutionalEmail(emailValue) {
    if (!emailValue || !emailValue.trim()) {
      setError('Ingresa tu correo institucional.');
      return false;
    }
    if (!INSTITUTIONAL_EMAIL_REGEX.test(emailValue.trim())) {
      setError('Solo se permiten correos institucionales (@duocuc.cl o @profesor.duoc.cl).');
      return false;
    }
    return true;
  }

  /**
   * Inicio de sesión con Supabase Auth (signInWithPassword).
   * El JWT se persiste automáticamente en localStorage por Supabase JS.
   */
  async function handleSignIn() {
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      throw new Error(authError.message);
    }

    return data;
  }

  /**
   * Registro de nueva cuenta con Supabase Auth (signUp).
   * Dependiendo de la configuración de Supabase, puede requerir
   * confirmación por correo electrónico.
   */
  async function handleSignUp() {
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (authError) {
      throw new Error(authError.message);
    }

    // Supabase puede devolver un usuario sin sesión si requiere confirmación
    if (data.user && !data.session) {
      setSignUpSuccess(true);
      return null; // No hay sesión aún — espera confirmación
    }

    return data;
  }

  /**
   * Handler principal del formulario.
   * Valida dominio → llama signIn o signUp → actualiza estado global.
   */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;

    setError(null);
    setSignUpSuccess(false);

    // Validar dominio institucional (nunca enviar a Supabase si falla)
    if (!validateInstitutionalEmail(email)) return;

    setIsLoading(true);

    try {
      let authData;

      if (isSignUpMode) {
        authData = await handleSignUp();
        if (!authData) {
          // Registro exitoso pero requiere confirmación de correo
          setIsLoading(false);
          return;
        }
      } else {
        authData = await handleSignIn();
      }

      // Login exitoso — notificar al componente padre (App.jsx)
      onLogin?.(authData.user);
      navigate('/');

    } catch (err) {
      setError(translateSupabaseError(err.message));
    } finally {
      setIsLoading(false);
    }
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

        {/* Confirmation message after successful signup */}
        {signUpSuccess && (
          <div className="login-page__success" role="status">
            ✅ ¡Cuenta creada! Revisa tu correo institucional para confirmar tu cuenta antes de iniciar sesión.
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-page__form">
          <div className="login-page__field">
            <label htmlFor="login-email">Correo Institucional</label>
            <input
              id="login-email"
              type="email"
              placeholder="nombre.apellido@duocuc.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isLoading}
            />
          </div>
          <div className="login-page__field">
            <label htmlFor="login-password">Contraseña</label>
            <div className="login-page__password-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUpMode ? 'new-password' : 'current-password'}
                disabled={isLoading}
              />
              <button
                type="button"
                className="login-page__eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-page__error" role="alert">
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-page__submit"
            disabled={isLoading || !email || !password}
            id="btn-login"
          >
            {isLoading ? (
              <><Loader2 size={18} className="spin" /> {isSignUpMode ? 'Registrando...' : 'Ingresando...'}</>
            ) : (
              <>
                {isSignUpMode ? <UserPlus size={18} /> : <LogIn size={18} />}
                {' '}{isSignUpMode ? 'Crear cuenta' : 'Ingresar'}
              </>
            )}
          </button>
        </form>

        {/* Toggle between Login / Register */}
        <div className="login-page__toggle">
          <button
            type="button"
            className="login-page__toggle-btn"
            onClick={() => {
              setIsSignUpMode(!isSignUpMode);
              setError(null);
              setSignUpSuccess(false);
            }}
            disabled={isLoading}
          >
            {isSignUpMode
              ? '¿Ya tienes cuenta? Inicia sesión'
              : '¿Primera vez? Crea tu cuenta'}
          </button>
        </div>

        <div className="login-page__security">
          <Shield size={14} />
          <span>Conexión segura · Datos protegidos con cifrado AES-256</span>
        </div>

        <div className="login-page__footer">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Duoc_UC.svg/200px-Duoc_UC.svg.png"
            alt="Duoc UC"
            className="login-page__duoc-logo"
          />
          <span>Dirección de Bienestar Estudiantil</span>
        </div>
      </div>
    </div>
  );
}
