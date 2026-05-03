import './RiskIndicator.css';

/**
 * RiskIndicator — Atomic component showing risk level with icon + text.
 *
 * States: low, moderate, high, critical
 *
 * Accessibility: Never uses color alone. Always icon + text.
 */

const RISK_CONFIG = {
  'Bajo': { icon: '🟢', className: 'risk--low', label: 'Bajo' },
  'Moderado': { icon: '🟡', className: 'risk--moderate', label: 'Moderado' },
  'Alto': { icon: '🟠', className: 'risk--high', label: 'Alto' },
  'Crítico': { icon: '🔴', className: 'risk--critical', label: 'Crítico' },
};

export default function RiskIndicator({ level, size = 'md', state = 'normal' }) {
  if (state === 'loading') {
    return <span className="risk-indicator skeleton" style={{ width: 70, height: 22 }} />;
  }

  const config = RISK_CONFIG[level] || RISK_CONFIG['Bajo'];

  return (
    <span
      className={`risk-indicator ${config.className} risk-indicator--${size}`}
      role="status"
      aria-label={`Nivel de riesgo: ${config.label}`}
    >
      <span className="risk-indicator__dot" aria-hidden="true" />
      <span className="risk-indicator__label">{config.label}</span>
    </span>
  );
}
