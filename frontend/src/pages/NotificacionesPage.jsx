import { useState, useEffect } from 'react';
import { Bell, Check, AlertTriangle, Calendar, RefreshCw, Loader2 } from 'lucide-react';
import { alertsApi } from '../services/api';
import { formatDate } from '../data/mockData';
import './NotificacionesPage.css';

/**
 * NotificacionesPage — Displays alerts triggered by emotional patterns
 * and allows the student to acknowledge (read) them (RF-09).
 */
export default function NotificacionesPage() {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  /**
   * Fetches student alerts from backend.
   */
  async function fetchAlerts() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await alertsApi.getAlerts(50, 0);
      setAlerts(response.alerts || []);
    } catch (err) {
      setError(
        err.message || 'No pudimos cargar tus notificaciones. Intenta de nuevo.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts();
  }, []);

  /**
   * Mark an alert as acknowledged (read).
   * Removes it dynamically from the active list or marks it visually.
   */
  async function handleAcknowledge(alertId) {
    setAcknowledgingId(alertId);
    try {
      await alertsApi.acknowledgeAlert(alertId);
      // Update local state by marking the alert as acknowledged
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, acknowledged_at: new Date().toISOString() }
            : a
        )
      );
      
      // Update sidebar counter by triggering a custom event or reloading count
      window.dispatchEvent(new Event('alert-acknowledged'));
    } catch (err) {
      setError('No se pudo marcar la notificación como leída. Intenta de nuevo.');
    } finally {
      setAcknowledgingId(null);
    }
  }

  // Count unread alerts
  const unreadAlerts = alerts.filter((a) => !a.acknowledged_at);
  const readAlerts = alerts.filter((a) => a.acknowledged_at);

  return (
    <div className="notificaciones-page">
      <div className="notificaciones-page__header">
        <div>
          <h1 className="notificaciones-page__title">Notificaciones</h1>
          <p className="notificaciones-page__subtitle">
            Alertas de bienestar y recordatorios del sistema.
          </p>
        </div>
        {!isLoading && alerts.length > 0 && (
          <button
            onClick={fetchAlerts}
            className="notificaciones-page__refresh-btn"
            aria-label="Actualizar notificaciones"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="notificaciones-page__error animate-fade-in" role="alert">
          <p>⚠️ {error}</p>
          <button onClick={fetchAlerts} className="notificaciones-page__retry-btn">
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="notificaciones-page__list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="notification-card notification-card--loading" aria-busy="true">
              <div className="notification-card__icon-wrap">
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
              </div>
              <div className="notification-card__body">
                <div className="skeleton" style={{ width: '40%', height: 16, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '80%', height: 14, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: '30%', height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        /* Empty State */
        <div className="notificaciones-page__empty animate-fade-in">
          <span className="notificaciones-page__empty-icon" aria-hidden="true">🔔</span>
          <h3>No tienes notificaciones</h3>
          <p>Todo está al día. Aquí aparecerán tus alertas de bienestar y mensajes importantes.</p>
        </div>
      ) : (
        /* Data Render */
        <div className="notificaciones-page__content animate-fade-in">
          {unreadAlerts.length > 0 && (
            <div className="notificaciones-page__section">
              <h2 className="notificaciones-page__section-title">Pendientes ({unreadAlerts.length})</h2>
              <div className="notificaciones-page__list">
                {unreadAlerts.map((alert) => (
                  <NotificationCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={handleAcknowledge}
                    isAcknowledging={acknowledgingId === alert.id}
                  />
                ))}
              </div>
            </div>
          )}

          {readAlerts.length > 0 && (
            <div className="notificaciones-page__section">
              <h2 className="notificaciones-page__section-title">Anteriores</h2>
              <div className="notificaciones-page__list">
                {readAlerts.map((alert) => (
                  <NotificationCard
                    key={alert.id}
                    alert={alert}
                    isRead={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Subcomponent: NotificationCard
 */
function NotificationCard({ alert, onAcknowledge, isAcknowledging, isRead = false }) {
  const riskLabel = alert.risk_level || alert.alert_type || 'moderado';
  
  const riskMeta = {
    critico: {
      className: 'notification-card--critical',
      icon: AlertTriangle,
      label: 'Riesgo Crítico',
    },
    alto: {
      className: 'notification-card--high',
      icon: AlertTriangle,
      label: 'Riesgo Alto',
    },
    moderado: {
      className: 'notification-card--moderate',
      icon: Bell,
      label: 'Alerta Moderada',
    },
    bajo: {
      className: 'notification-card--low',
      icon: Bell,
      label: 'Recordatorio',
    },
  }[riskLabel] || {
    className: 'notification-card--moderate',
    icon: Bell,
    label: 'Notificación',
  };

  const IconComponent = riskMeta.icon;

  return (
    <div
      className={`notification-card ${riskMeta.className} ${isRead ? 'notification-card--read' : ''}`}
      id={`alert-${alert.id}`}
    >
      <div className="notification-card__icon-wrap" aria-hidden="true">
        <IconComponent size={20} />
      </div>
      <div className="notification-card__body">
        <div className="notification-card__meta">
          <span className="notification-card__label">{riskMeta.label}</span>
          <span className="notification-card__date">
            <Calendar size={12} />
            {formatDate(alert.triggered_at)}
          </span>
        </div>
        <p className="notification-card__message">{alert.message}</p>
        
        {/* Call to Action for Wellbeing */}
        {(riskLabel === 'critico' || riskLabel === 'alto') && (
          <div className="notification-card__cta">
            <strong>Soporte Institucional:</strong> Recuerda que puedes contactar al equipo de bienestar en cualquier momento.
          </div>
        )}
      </div>

      {!isRead && onAcknowledge && (
        <button
          className="notification-card__action-btn"
          onClick={() => onAcknowledge(alert.id)}
          disabled={isAcknowledging}
          aria-label="Marcar como leída"
          title="Marcar como leída"
        >
          {isAcknowledging ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <Check size={16} />
          )}
        </button>
      )}
    </div>
  );
}
