import './AlertBanner.css';

/**
 * AlertBanner — Displays alert notifications with risk level styling.
 *
 * States: moderate, high, critical, dismissed
 *
 * Accessibility: Uses role="alert" for screen readers.
 * Color is never the sole indicator — includes icon + text.
 */
export default function AlertBanner({ alert, onAction, onDismiss }) {
  if (!alert) return null;

  const typeClassMap = {
    moderate: 'alert-banner--moderate',
    high: 'alert-banner--high',
    critical: 'alert-banner--critical',
  };

  const iconMap = {
    moderate: '🟡',
    high: '🟠',
    critical: '🔴',
  };

  return (
    <div
      className={`alert-banner ${typeClassMap[alert.type] || ''} animate-scale-in`}
      role="alert"
      aria-live="polite"
      id={`alert-${alert.id}`}
    >
      <div className="alert-banner__header">
        <span className="alert-banner__icon" aria-hidden="true">{iconMap[alert.type]}</span>
        <strong className="alert-banner__title">{alert.title}</strong>
      </div>
      <p className="alert-banner__message">{alert.message}</p>
      {alert.actionLabel && (
        <button
          className="alert-banner__action"
          onClick={() => onAction?.(alert)}
          aria-label={alert.actionLabel}
        >
          {alert.actionLabel}
        </button>
      )}
    </div>
  );
}
