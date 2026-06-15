import { useState } from 'react';
import { Shield, Eye, Trash2, CheckCircle, AlertTriangle, Key, Loader2 } from 'lucide-react';
import { studentsApi } from '../services/api';
import { supabase } from '../services/supabaseClient';
import './PrivacidadPage.css';

/**
 * PrivacidadPage — Fulfills RNF-13 / Ley 19.628.
 * Informs student about cryptographic protection of emotional data,
 * and allows deleting the account permanently (Right to be Forgotten).
 */
export default function PrivacidadPage() {
  const [isChecked, setIsChecked] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const CONFIRMATION_PHRASE = 'ELIMINAR MI CUENTA';
  const isButtonEnabled = isChecked && confirmText.trim() === CONFIRMATION_PHRASE;

  async function handleDeleteAccount(e) {
    e.preventDefault();
    if (!isButtonEnabled) return;

    if (!window.confirm('¿Realmente deseas eliminar tu cuenta permanentemente? Esta acción borrará todas tus bitácoras, análisis y alertas de manera irreversible.')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      // 1. Request backend to delete profile and credentials
      await studentsApi.deleteAccount();
      
      setSuccess(true);
      
      // 2. Perform frontend sign out
      setTimeout(async () => {
        await supabase.auth.signOut();
      }, 3000);
    } catch (err) {
      setError(
        err.message || 'No pudimos eliminar tu cuenta en este momento. Por favor contacta soporte.'
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="privacidad-page">
      <div className="privacidad-page__header">
        <h1 className="privacidad-page__title">Privacidad y seguridad</h1>
        <p className="privacidad-page__subtitle">
          Garantías de privacidad y control absoluto sobre tus datos emocionales.
        </p>
      </div>

      {success ? (
        <div className="privacidad-page__success animate-scale-in">
          <CheckCircle size={48} className="privacidad-page__success-icon" />
          <h2>Cuenta eliminada exitosamente</h2>
          <p>Tu perfil y todas tus bitácoras han sido borradas permanentemente de nuestros sistemas en cumplimiento con la Ley 19.628.</p>
          <p className="privacidad-page__redirect-text">Cerrando sesión y redirigiendo...</p>
        </div>
      ) : (
        <div className="privacidad-page__content animate-fade-in">
          {/* Informative Cards Grid */}
          <div className="privacidad-page__cards">
            {/* Cifrado AES-256 */}
            <div className="privacy-card">
              <div className="privacy-card__icon-wrap">
                <Key size={24} />
              </div>
              <div className="privacy-card__body">
                <h3>Cifrado a nivel de aplicación</h3>
                <p>
                  El contenido de tus bitácoras se cifra utilizando el estándar de grado militar <strong>AES-256-GCM</strong> antes de guardarse en la base de datos relacional.
                </p>
                <span className="privacy-card__tag">Inviolable en reposo</span>
              </div>
            </div>

            {/* Tránsito Seguro */}
            <div className="privacy-card">
              <div className="privacy-card__icon-wrap">
                <Shield size={24} />
              </div>
              <div className="privacy-card__body">
                <h3>Tránsito seguro HTTPS</h3>
                <p>
                  Toda comunicación entre el cliente (PWA) y el servidor backend utiliza cifrado <strong>TLS 1.3</strong> y directivas HSTS. Tus datos nunca viajan expuestos.
                </p>
                <span className="privacy-card__tag">Seguridad en tránsito</span>
              </div>
            </div>

            {/* Privacidad por Diseño */}
            <div className="privacy-card">
              <div className="privacy-card__icon-wrap">
                <Eye size={24} />
              </div>
              <div className="privacy-card__body">
                <h3>Privacidad por diseño (SoC)</h3>
                <p>
                  El equipo de bienestar Duoc UC solo recibe alertas y estadísticas agregadas. <strong>Nunca</strong> tienen acceso al texto original de tus bitácoras emocionales.
                </p>
                <span className="privacy-card__tag">Confidencialidad absoluta</span>
              </div>
            </div>
          </div>

          {/* Right to be Forgotten Section (Danger Zone) */}
          <div className="privacidad-page__danger-zone">
            <div className="danger-zone__header">
              <AlertTriangle size={24} className="danger-zone__icon" />
              <div>
                <h2>Derecho al Olvido (Eliminación permanente)</h2>
                <p>Ley 19.628 de protección de la vida privada y datos personales en Chile.</p>
              </div>
            </div>
            
            <p className="danger-zone__desc">
              Tienes el control absoluto de tus datos. Al presionar el botón de abajo, eliminarás permanentemente tu cuenta y todos tus registros asociados (perfil, bitácoras emocionales, análisis de IA y alertas de bienestar). Esta acción es destructiva, irreversible y no se puede deshacer.
            </p>

            {error && (
              <div className="danger-zone__error" role="alert">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="danger-zone__form">
              <label className="danger-zone__checkbox-label">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  disabled={isDeleting}
                  className="danger-zone__checkbox"
                  id="chk-confirm-delete"
                />
                <span>Entiendo las consecuencias y acepto eliminar todos mis datos emocionalmente sensibles de forma irreversible.</span>
              </label>

              <div className="danger-zone__input-group">
                <label htmlFor="txt-confirm-phrase">
                  Para confirmar, escribe a continuación en mayúsculas la frase <strong>{CONFIRMATION_PHRASE}</strong>:
                </label>
                <input
                  type="text"
                  id="txt-confirm-phrase"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isDeleting || !isChecked}
                  placeholder={CONFIRMATION_PHRASE}
                  className="danger-zone__input"
                  autoComplete="off"
                />
              </div>

              <button
                type="submit"
                className="danger-zone__delete-btn"
                disabled={!isButtonEnabled || isDeleting}
                id="btn-confirm-delete"
              >
                {isDeleting ? (
                  <><Loader2 size={16} className="spin" /> Eliminando permanentemente...</>
                ) : (
                  <><Trash2 size={16} /> Eliminar mi cuenta y datos permanentemente</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
