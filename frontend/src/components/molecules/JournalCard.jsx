import EmotionBadge from '../atoms/EmotionBadge';
import RiskIndicator from '../atoms/RiskIndicator';
import { formatRelativeDate, formatTime } from '../../data/mockData';
import './JournalCard.css';

/**
 * JournalCard — Displays a journal entry with sentiment score,
 * emotion badge, risk indicator, content preview and keywords.
 *
 * States: expanded, collapsed, loading
 */
export default function JournalCard({ entry, state = 'collapsed' }) {
  if (state === 'loading') {
    return (
      <article className="journal-card journal-card--loading" aria-busy="true">
        <div className="journal-card__score-col">
          <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
        </div>
        <div className="journal-card__content">
          <div className="skeleton" style={{ width: '60%', height: 14, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '100%', height: 14, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: '80%', height: 14 }} />
        </div>
      </article>
    );
  }

  const {
    content,
    sentimentScore,
    dominantEmotion,
    riskLevel,
    keywords,
    createdAt,
  } = entry;

  const scoreColor = sentimentScore >= 0.3
    ? 'var(--color-sentiment-positive)'
    : sentimentScore <= -0.3
      ? 'var(--color-sentiment-negative)'
      : 'var(--color-sentiment-neutral)';

  const scoreBg = sentimentScore >= 0.3
    ? 'var(--color-sentiment-positive-bg)'
    : sentimentScore <= -0.3
      ? 'var(--color-sentiment-negative-bg)'
      : 'var(--color-sentiment-neutral-bg)';

  return (
    <article className="journal-card animate-fade-in" id={`journal-entry-${entry.id}`}>
      <div className="journal-card__score-col">
        <div
          className="journal-card__score"
          style={{ color: scoreColor, backgroundColor: scoreBg }}
          aria-label={`Puntuación de sentimiento: ${sentimentScore.toFixed(1)}`}
        >
          {sentimentScore.toFixed(1)}
        </div>
      </div>
      <div className="journal-card__body">
        <div className="journal-card__meta">
          <span className="journal-card__date">
            {formatRelativeDate(createdAt)}, {formatTime(createdAt)}
          </span>
          <div className="journal-card__badges">
            <EmotionBadge emotion={dominantEmotion} size="sm" />
            <RiskIndicator level={riskLevel} size="sm" />
          </div>
        </div>
        <p className="journal-card__text">"{content}"</p>
        {keywords && keywords.length > 0 && (
          <div className="journal-card__keywords" aria-label="Palabras clave emocionales">
            {keywords.map((kw) => (
              <span key={kw} className="journal-card__keyword">{kw}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
