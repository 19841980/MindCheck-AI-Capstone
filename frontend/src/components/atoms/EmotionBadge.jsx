import { useState } from 'react';
import './EmotionBadge.css';

/**
 * EmotionBadge — Atomic component that displays a dominant emotion
 * with corresponding color and icon.
 *
 * States: normal, loading, unknown
 *
 * Accessibility: Color is NEVER the sole indicator.
 * Always shows icon + text label per WCAG 2.1 AA.
 */

const EMOTION_CONFIG = {
  'Ansiedad': { icon: '😰', className: 'emotion-badge--ansiedad' },
  'Calma': { icon: '😌', className: 'emotion-badge--calma' },
  'Estrés': { icon: '😣', className: 'emotion-badge--estres' },
  'Alegría': { icon: '😊', className: 'emotion-badge--alegria' },
  'Tristeza': { icon: '😢', className: 'emotion-badge--tristeza' },
  'Frustración': { icon: '😤', className: 'emotion-badge--frustracion' },
};

export default function EmotionBadge({ emotion, size = 'md', state = 'normal' }) {
  if (state === 'loading') {
    return <span className="emotion-badge skeleton" style={{ width: 80, height: 24 }} />;
  }

  const config = EMOTION_CONFIG[emotion] || { icon: '❓', className: 'emotion-badge--unknown' };

  return (
    <span
      className={`emotion-badge ${config.className} emotion-badge--${size}`}
      role="status"
      aria-label={`Emoción: ${emotion || 'Desconocida'}`}
    >
      <span className="emotion-badge__icon" aria-hidden="true">{config.icon}</span>
      <span className="emotion-badge__label">{emotion || 'Desconocida'}</span>
    </span>
  );
}
