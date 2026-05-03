import './ResourceCard.css';

/**
 * ResourceCard — Displays a self-help resource with icon, title,
 * duration and emotion tags.
 *
 * States: normal, visited, loading
 */
export default function ResourceCard({ resource, onClick, state = 'normal' }) {
  if (state === 'loading') {
    return (
      <div className="resource-card resource-card--loading" aria-busy="true">
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: '70%', height: 14, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: '50%', height: 12 }} />
        </div>
      </div>
    );
  }

  const { title, type, duration, emotionTags, icon, visited } = resource;

  return (
    <button
      className={`resource-card ${visited ? 'resource-card--visited' : ''}`}
      onClick={() => onClick?.(resource)}
      aria-label={`${title} — ${duration}${emotionTags?.length ? ` — ${emotionTags.join(', ')}` : ''}`}
      id={`resource-${resource.id}`}
    >
      <div className="resource-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="resource-card__info">
        <span className="resource-card__title">{title}</span>
        <span className="resource-card__meta">
          {duration}
          {emotionTags?.length > 0 && (
            <> · {emotionTags[0]}</>
          )}
        </span>
      </div>
      <span className="resource-card__arrow" aria-hidden="true">›</span>
    </button>
  );
}
