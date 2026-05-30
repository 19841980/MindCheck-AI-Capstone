/**
 * MindCheck — Statistics Utilities.
 * Calculates wellbeing stats from real journal entries returned by the API.
 *
 * Backend returns entries with snake_case fields:
 * { id, student_id, sentiment_score, dominant_emotion, risk_level, keywords, created_at }
 */

/**
 * Normalize a sentiment score (-1 to 1) to a 0-100 wellbeing scale.
 */
function normalizeScore(sentimentScore) {
  return Math.round(((sentimentScore + 1) / 2) * 100);
}

/**
 * Calculate weekly wellbeing score (0-100) from entries.
 * Returns { weeklyScore, weeklyScoreChange }
 */
export function calculateWellbeingScore(entries) {
  if (!entries || entries.length === 0) {
    return { weeklyScore: 50, weeklyScoreChange: 0 };
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = entries.filter(e => new Date(e.created_at) >= oneWeekAgo);
  const lastWeek = entries.filter(e => {
    const d = new Date(e.created_at);
    return d >= twoWeeksAgo && d < oneWeekAgo;
  });

  const avgThis = thisWeek.length > 0
    ? thisWeek.reduce((sum, e) => sum + (e.sentiment_score || 0), 0) / thisWeek.length
    : 0;
  const avgLast = lastWeek.length > 0
    ? lastWeek.reduce((sum, e) => sum + (e.sentiment_score || 0), 0) / lastWeek.length
    : 0;

  return {
    weeklyScore: normalizeScore(avgThis),
    weeklyScoreChange: normalizeScore(avgThis) - normalizeScore(avgLast),
  };
}

/**
 * Calculate registration streak (consecutive days with at least 1 entry).
 */
export function calculateStreak(entries) {
  if (!entries || entries.length === 0) return { streak: 0, streakDays: [] };

  const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const streakDays = [];

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const hasEntry = entries.some(e => {
      const entryDate = new Date(e.created_at);
      return entryDate.toDateString() === checkDate.toDateString();
    });

    if (hasEntry) {
      streak++;
      streakDays.unshift(dayNames[checkDate.getDay()]);
    } else if (i > 0) {
      break; // Streak broken
    }
  }

  return { streak, streakDays };
}

/**
 * Calculate emotion frequency from entries.
 * Returns array sorted by percentage: [{ emotion, percentage, color }]
 */
export function calculateEmotionFrequency(entries) {
  if (!entries || entries.length === 0) return [];

  const emotionColors = {
    'ansiedad': 'var(--color-emotion-ansiedad)',
    'calma': 'var(--color-emotion-calma)',
    'estrés': 'var(--color-emotion-estres)',
    'alegría': 'var(--color-emotion-alegria)',
    'tristeza': 'var(--color-emotion-tristeza)',
    'frustración': 'var(--color-emotion-frustracion)',
  };

  const counts = {};
  const withEmotion = entries.filter(e => e.dominant_emotion);

  withEmotion.forEach(e => {
    const emotion = e.dominant_emotion.toLowerCase();
    counts[emotion] = (counts[emotion] || 0) + 1;
  });

  const total = withEmotion.length;
  return Object.entries(counts)
    .map(([emotion, count]) => ({
      emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      percentage: Math.round((count / total) * 100),
      color: emotionColors[emotion] || 'var(--color-text-tertiary)',
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

/**
 * Build trend data for the emotional chart.
 * Groups entries by date and averages sentiment scores.
 */
export function calculateEmotionTrend(entries, days = 7) {
  if (!entries || entries.length === 0) return [];

  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const filtered = entries.filter(e => new Date(e.created_at) >= cutoff && e.sentiment_score !== null);

  // Group by date string
  const byDate = {};
  filtered.forEach(e => {
    const d = new Date(e.created_at);
    const key = `${d.getDate()} ${months[d.getMonth()]}`;
    if (!byDate[key]) byDate[key] = { scores: [], date: d };
    byDate[key].scores.push(e.sentiment_score);
  });

  return Object.entries(byDate)
    .sort(([, a], [, b]) => a.date - b.date)
    .map(([date, { scores }]) => ({
      date,
      score: parseFloat((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(2)),
    }));
}

/**
 * Get the last analysis summary from the most recent entry.
 */
export function getLastAnalysis(entries) {
  if (!entries || entries.length === 0) return null;

  const latest = entries.find(e => e.sentiment_score !== null);
  if (!latest) return null;

  return {
    sentimentScore: latest.sentiment_score,
    dominantEmotion: latest.dominant_emotion
      ? latest.dominant_emotion.charAt(0).toUpperCase() + latest.dominant_emotion.slice(1)
      : 'Otro',
    riskLevel: latest.risk_level
      ? latest.risk_level.charAt(0).toUpperCase() + latest.risk_level.slice(1)
      : 'Bajo',
    timestamp: latest.created_at,
  };
}
