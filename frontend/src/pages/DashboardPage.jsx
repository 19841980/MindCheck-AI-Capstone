/**
 * MindCheck — Dashboard Page (Real Data).
 *
 * Consumes journalApi.getEntries() and uses statsUtils.js
 * math utilities to render real emotional trends, wellbeing
 * scores, streaks, and emotion distribution.
 *
 * States (§3.3 Resilience):
 * - Loading: Skeleton screens per component
 * - Error: Empathetic message + retry action
 * - Empty: Motivational message for first entry
 * - Data: Full dashboard with charts
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { journalApi } from '../services/api';
import {
  calculateWellbeingScore,
  calculateStreak,
  calculateEmotionFrequency,
  calculateEmotionTrend,
  getLastAnalysis,
} from '../utils/statsUtils';
import './DashboardPage.css';

/**
 * Emotion-to-color mapping for the bar chart.
 * Uses hardcoded hex values that match our CSS design tokens
 * because Recharts <Cell fill> requires hex, not CSS vars.
 */
const EMOTION_COLORS = {
  'Ansiedad': '#E76F51',
  'Calma': '#40916C',
  'Estrés': '#E63946',
  'Alegría': '#3A7CA5',
  'Tristeza': '#7B68EE',
  'Frustración': '#F4A261',
  'Otro': '#6C757D',
};

/**
 * Emotion-to-emoji mapping for the summary card.
 */
const EMOTION_EMOJI = {
  'Ansiedad': '😰',
  'Calma': '😌',
  'Estrés': '😣',
  'Alegría': '😊',
  'Tristeza': '😢',
  'Frustración': '😤',
  'Otro': '🤔',
};

/**
 * Build heatmap data from real entries.
 * Groups entries by day-of-week and week-of-month.
 */
function buildHeatmapFromEntries(entries) {
  const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  // Initialize grid: 7 days × 4 weeks
  const grid = dayLabels.map((day) => ({ day, w1: 0, w2: 0, w3: 0, w4: 0 }));

  entries.forEach((entry) => {
    const date = new Date(entry.created_at);
    if (date < fourWeeksAgo) return;

    const dayIdx = date.getDay(); // 0=Sun, 6=Sat
    const weeksAgo = Math.floor((now - date) / (7 * 24 * 60 * 60 * 1000));
    const weekKey = `w${4 - Math.min(weeksAgo, 3)}`;

    if (grid[dayIdx]) {
      grid[dayIdx][weekKey] = Math.min((grid[dayIdx][weekKey] || 0) + 1, 3);
    }
  });

  return grid;
}


// --- Skeleton Components ---

function SummaryCardSkeleton() {
  return (
    <div className="summary-card">
      <div className="skeleton" style={{ width: '60%', height: 12, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '40%', height: 32, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '50%', height: 10 }} />
    </div>
  );
}

function ChartCardSkeleton({ wide }) {
  return (
    <div className={`chart-card ${wide ? 'chart-card--wide' : ''}`}>
      <div className="skeleton" style={{ width: '40%', height: 16, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 8 }} />
    </div>
  );
}


// --- Empty State ---

function EmptyDashboard() {
  return (
    <div className="dashboard-page__empty animate-fade-in">
      <div className="dashboard-page__empty-icon">📝</div>
      <h2 className="dashboard-page__empty-title">Tu dashboard te espera</h2>
      <p className="dashboard-page__empty-text">
        Comienza registrando tu primera bitácora emocional para ver tus tendencias,
        estadísticas de bienestar y distribución de emociones aquí.
      </p>
      <a href="/bitacora/nueva" className="dashboard-page__empty-cta">
        Escribir mi primera entrada →
      </a>
    </div>
  );
}


// --- Error State ---

function ErrorState({ onRetry }) {
  return (
    <div className="dashboard-page__error animate-fade-in">
      <div className="dashboard-page__error-icon">😔</div>
      <h2 className="dashboard-page__error-title">No pudimos cargar tus datos</h2>
      <p className="dashboard-page__error-text">
        Algo salió mal al conectar con el servidor. No te preocupes, tus registros
        están seguros.
      </p>
      <button className="dashboard-page__error-btn" onClick={onRetry}>
        Reintentar
      </button>
    </div>
  );
}


// --- Main Dashboard ---

export default function DashboardPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('7d');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await journalApi.getEntries(100, 0);
      setEntries(response.entries || []);
    } catch (err) {
      setError(err.message || 'Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Computed stats from real entries
  const stats = useMemo(() => calculateWellbeingScore(entries), [entries]);
  const streakData = useMemo(() => calculateStreak(entries), [entries]);
  const emotionFrequency = useMemo(() => calculateEmotionFrequency(entries), [entries]);
  const lastAnalysis = useMemo(() => getLastAnalysis(entries), [entries]);

  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const trendData = useMemo(
    () => calculateEmotionTrend(entries, periodDays),
    [entries, periodDays],
  );

  const heatmapData = useMemo(() => buildHeatmapFromEntries(entries), [entries]);

  const entriesThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return entries.filter((e) => new Date(e.created_at) >= startOfMonth).length;
  }, [entries]);

  // Dominant emotion display
  const dominantEmotionLabel = lastAnalysis?.dominantEmotion || 'Sin datos';
  const dominantEmotionEmoji = EMOTION_EMOJI[dominantEmotionLabel] || '🤔';
  const dominantEmotionPercentage = emotionFrequency.length > 0
    ? `${emotionFrequency[0].percentage}% de las entradas`
    : 'Sin entradas suficientes';

  // --- Render: Loading ---
  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-page__header">
          <h1 className="dashboard-page__title">Dashboard emocional</h1>
        </div>
        <div className="dashboard-page__summary">
          {[1, 2, 3, 4].map((i) => <SummaryCardSkeleton key={i} />)}
        </div>
        <div className="dashboard-page__charts">
          <ChartCardSkeleton wide />
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
      </div>
    );
  }

  // --- Render: Error ---
  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-page__header">
          <h1 className="dashboard-page__title">Dashboard emocional</h1>
        </div>
        <ErrorState onRetry={fetchEntries} />
      </div>
    );
  }

  // --- Render: Empty ---
  if (entries.length === 0) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-page__header">
          <h1 className="dashboard-page__title">Dashboard emocional</h1>
        </div>
        <EmptyDashboard />
      </div>
    );
  }

  // --- Render: Data ---
  const changePrefix = stats.weeklyScoreChange >= 0 ? '↑' : '↓';
  const changeClass = stats.weeklyScoreChange >= 0 ? 'positive' : '';

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <h1 className="dashboard-page__title">Dashboard emocional</h1>
        <div className="dashboard-page__period-filter">
          {['7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'period-btn--active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === '7d' ? '7 días' : p === '30d' ? '30 días' : '90 días'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-page__summary animate-fade-in">
        <div className="summary-card">
          <span className="summary-card__label">Bienestar semanal</span>
          <span className="summary-card__value summary-card__value--primary">
            {stats.weeklyScore}<small>/100</small>
          </span>
          <span className={`summary-card__change ${changeClass}`}>
            {changePrefix} {Math.abs(stats.weeklyScoreChange)} pts vs semana anterior
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">Racha activa</span>
          <span className="summary-card__value">
            {streakData.streak} 🔥
          </span>
          <span className="summary-card__change">días consecutivos</span>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">Entradas este mes</span>
          <span className="summary-card__value">{entriesThisMonth}</span>
          <span className="summary-card__change">registros en el mes actual</span>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">Emoción predominante</span>
          <span className="summary-card__value summary-card__value--emotion">
            {dominantEmotionEmoji} {dominantEmotionLabel}
          </span>
          <span className="summary-card__change">{dominantEmotionPercentage}</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="dashboard-page__charts">
        {/* Sentiment Trend */}
        <div className="chart-card chart-card--wide animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h3 className="chart-card__title">Tendencia de sentimiento</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3A7CA5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3A7CA5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                />
                <YAxis
                  domain={[-1, 1]}
                  ticks={[-1, 0, 1]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => [v.toFixed(2), 'Sentimiento']}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#3A7CA5"
                  strokeWidth={2.5}
                  fill="url(#dashGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#3A7CA5', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-card__empty">
              <p>Aún no hay suficientes datos para mostrar la tendencia.</p>
            </div>
          )}
        </div>

        {/* Emotion Distribution */}
        <div className="chart-card animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <h3 className="chart-card__title">Distribución de emociones</h3>
          {emotionFrequency.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={emotionFrequency} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} layout="vertical">
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                />
                <YAxis
                  type="category"
                  dataKey="emotion"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                  width={85}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => [`${v}%`, 'Frecuencia']}
                />
                <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={14}>
                  {emotionFrequency.map((entry, i) => (
                    <Cell key={i} fill={EMOTION_COLORS[entry.emotion] || '#6C757D'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-card__empty">
              <p>Registra entradas con análisis para ver la distribución.</p>
            </div>
          )}
        </div>

        {/* Activity Heatmap */}
        <div className="chart-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="chart-card__title">Actividad por día</h3>
          <div className="heatmap">
            <div className="heatmap__header">
              <span></span><span>S1</span><span>S2</span><span>S3</span><span>S4</span>
            </div>
            {heatmapData.map((row) => (
              <div key={row.day} className="heatmap__row">
                <span className="heatmap__day">{row.day}</span>
                {[row.w1, row.w2, row.w3, row.w4].map((val, i) => (
                  <div
                    key={i}
                    className={`heatmap__cell heatmap__cell--${val}`}
                    title={`${val} entradas`}
                  />
                ))}
              </div>
            ))}
            <div className="heatmap__legend">
              <span>Menos</span>
              <div className="heatmap__cell heatmap__cell--0" />
              <div className="heatmap__cell heatmap__cell--1" />
              <div className="heatmap__cell heatmap__cell--2" />
              <div className="heatmap__cell heatmap__cell--3" />
              <span>Más</span>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="chart-card chart-card--insight animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <div className="insight-icon">🧠</div>
          <h3 className="chart-card__title">Resumen de IA</h3>
          {lastAnalysis ? (
            <p className="insight-text">
              Tu último registro refleja un estado de{' '}
              <strong>{lastAnalysis.dominantEmotion.toLowerCase()}</strong> con un
              puntaje de sentimiento de{' '}
              <strong>{lastAnalysis.sentimentScore.toFixed(2)}</strong>.
              {stats.weeklyScoreChange > 0
                ? ` Tu bienestar ha mejorado ${stats.weeklyScoreChange} puntos esta semana. ¡Sigue así!`
                : stats.weeklyScoreChange < 0
                  ? ` Tu bienestar bajó ${Math.abs(stats.weeklyScoreChange)} puntos esta semana. Recuerda que está bien pedir ayuda.`
                  : ' Tu bienestar se ha mantenido estable esta semana.'
              }
              {' '}Nivel de riesgo actual: <strong>{lastAnalysis.riskLevel}</strong>.
            </p>
          ) : (
            <p className="insight-text">
              Aún no tenemos suficientes datos para generar un insight personalizado.
              Sigue registrando cómo te sientes para desbloquear esta sección.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
