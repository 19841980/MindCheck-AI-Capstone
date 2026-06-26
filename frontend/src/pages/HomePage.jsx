import { useState, useEffect, useMemo, useContext } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { Plus, ChevronRight, TrendingUp, Flame, Brain } from 'lucide-react';
import EmotionBadge from '../components/atoms/EmotionBadge';
import RiskIndicator from '../components/atoms/RiskIndicator';
import JournalCard from '../components/molecules/JournalCard';
import AlertBanner from '../components/molecules/AlertBanner';
import ResourceCard from '../components/molecules/ResourceCard';
import { journalApi, resourcesApi, alertsApi } from '../services/api';
import { UserContext } from '../App';
import {
  calculateWellbeingScore,
  calculateStreak,
  calculateEmotionFrequency,
  calculateEmotionTrend,
  getLastAnalysis,
} from '../utils/statsUtils';
import {
  MOCK_WELLBEING_STATS,
  MOCK_EMOTION_TREND_7D,
  MOCK_EMOTION_TREND_30D,
  MOCK_EMOTION_TREND_90D,
  MOCK_FREQUENT_EMOTIONS,
  MOCK_JOURNAL_ENTRIES,
  MOCK_RESOURCES,
  formatDate,
} from '../data/mockData';
import './HomePage.css';

/**
 * Maps a single backend entry (snake_case) to the camelCase format
 * expected by JournalCard and other frontend components.
 */
function mapEntry(entry) {
  return {
    id: entry.id,
    content: entry.content || 'Entrada cifrada — ver detalle para descifrar.',
    sentimentScore: entry.sentiment_score ?? 0,
    dominantEmotion: entry.dominant_emotion
      ? entry.dominant_emotion.charAt(0).toUpperCase() + entry.dominant_emotion.slice(1)
      : 'Otro',
    riskLevel: entry.risk_level
      ? entry.risk_level.charAt(0).toUpperCase() + entry.risk_level.slice(1)
      : 'Bajo',
    keywords: entry.keywords || [],
    createdAt: entry.created_at,
  };
}

/**
 * Maps a backend resource (snake_case) to the camelCase format
 * expected by ResourceCard.
 */
function mapResource(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.resource_type,
    duration: r.duration,
    emotionTags: r.emotion_tags || [],
    icon: r.icon,
    visited: false,
  };
}

/**
 * Maps a backend alert (snake_case) to the format expected by AlertBanner.
 */
function mapAlert(alert) {
  return {
    id: alert.id,
    type: alert.alert_type || alert.risk_level || 'moderate',
    title: `Alerta ${(alert.risk_level || 'moderada').charAt(0).toUpperCase() + (alert.risk_level || 'moderada').slice(1)}`,
    message: alert.message,
    actionLabel: 'Contactar bienestar Duoc UC',
    actionUrl: '#',
    triggeredAt: alert.triggered_at,
    acknowledged: !!alert.acknowledged_at,
  };
}

/**
 * HomePage — Main landing page after login.
 * Matches the provided design mockup with:
 * - Greeting + date
 * - Wellbeing stats cards
 * - New entry CTA
 * - Emotional trend chart
 * - Recent entries
 * - Right panel: overall wellbeing, frequent emotions, alert, resources
 */
export default function HomePage() {
  const user = useContext(UserContext);
  const [trendPeriod, setTrendPeriod] = useState('7d');
  const [rawEntries, setRawEntries] = useState([]);
  const [resources, setResources] = useState(MOCK_RESOURCES.slice(0, 3));
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetches journal entries, resources, and alerts in parallel on mount.
   * Uses Promise.all with individual .catch() so one failing endpoint
   * doesn't prevent the others from loading.
   */
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [entriesRes, resourcesRes, alertsRes] = await Promise.all([
          journalApi.getEntries().catch(() => null),
          resourcesApi.getAll().catch(() => null),
          alertsApi.getAlerts(5, 0).catch(() => null),
        ]);
        if (entriesRes?.entries?.length > 0) {
          setRawEntries(entriesRes.entries);
        }
        if (resourcesRes?.resources?.length > 0) {
          setResources(resourcesRes.resources.map(mapResource).slice(0, 3));
        }
        if (alertsRes?.alerts?.length > 0) {
          setAlerts(alertsRes.alerts.filter(a => !a.acknowledged_at).map(mapAlert));
        }
      } catch (err) {
        // All calls failed — fallback to defaults (already set)
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  /**
   * Compute wellbeing stats from real entries.
   * Falls back to MOCK_WELLBEING_STATS when no real data exists yet.
   */
  const stats = useMemo(() => {
    if (rawEntries.length === 0) return MOCK_WELLBEING_STATS;
    const { weeklyScore, weeklyScoreChange } = calculateWellbeingScore(rawEntries);
    const { streak, streakDays } = calculateStreak(rawEntries);
    const lastAnalysis = getLastAnalysis(rawEntries);
    return {
      weeklyScore,
      weeklyScoreChange,
      registrationStreak: streak,
      streakDays,
      lastAnalysis: lastAnalysis
        ? { ...lastAnalysis, resourceCount: 2 }
        : MOCK_WELLBEING_STATS.lastAnalysis,
    };
  }, [rawEntries]);

  /**
   * Build trend data for the emotional chart.
   * Falls back to mock trend data when not enough real data points exist.
   */
  const trendData = useMemo(() => {
    if (rawEntries.length === 0) {
      switch (trendPeriod) {
        case '30d': return MOCK_EMOTION_TREND_30D;
        case '90d': return MOCK_EMOTION_TREND_90D;
        default: return MOCK_EMOTION_TREND_7D;
      }
    }
    const days = trendPeriod === '90d' ? 90 : trendPeriod === '30d' ? 30 : 7;
    const realTrend = calculateEmotionTrend(rawEntries, days);
    // If not enough real data points, fall back to mock
    if (realTrend.length < 2) {
      switch (trendPeriod) {
        case '30d': return MOCK_EMOTION_TREND_30D;
        case '90d': return MOCK_EMOTION_TREND_90D;
        default: return MOCK_EMOTION_TREND_7D;
      }
    }
    return realTrend;
  }, [rawEntries, trendPeriod]);

  /**
   * Frequent emotions computed from real data, with mock fallback.
   */
  const frequentEmotions = useMemo(() => {
    if (rawEntries.length === 0) return MOCK_FREQUENT_EMOTIONS;
    const real = calculateEmotionFrequency(rawEntries);
    return real.length > 0 ? real : MOCK_FREQUENT_EMOTIONS;
  }, [rawEntries]);

  /**
   * Recent entries — show the 2 most recent (real mapped or mock fallback).
   */
  const recentEntries = useMemo(() => {
    if (rawEntries.length === 0) return MOCK_JOURNAL_ENTRIES.slice(0, 2);
    return rawEntries.slice(0, 2).map(mapEntry);
  }, [rawEntries]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? '¡Buenos días' : now.getHours() < 18 ? '¡Buenas tardes' : '¡Buenas noches';
  const displayName = user?.firstName || 'Estudiante';

  return (
    <div className="home-page">
      {/* Main Content Area */}
      <div className="home-page__main">
        {/* Greeting */}
        <div className="home-page__greeting animate-fade-in">
          <span className="home-page__date">{formatDate(now.toISOString())} · {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          <h1 className="home-page__title">
            {greeting}, {displayName} 👋 ¿Cómo estás hoy?
          </h1>
        </div>

        {/* Stats Cards Row */}
        <div className="home-page__stats animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Wellbeing Score */}
          <div className="stat-card" id="stat-bienestar">
            <span className="stat-card__label">BIENESTAR SEMANAL</span>
            {isLoading ? (
              <div className="skeleton" style={{ width: '60%', height: 32, marginBottom: 8 }} />
            ) : (
              <>
                <div className="stat-card__value stat-card__value--primary">{stats.weeklyScore}</div>
                <div className="stat-card__bar">
                  <div
                    className="stat-card__bar-fill stat-card__bar-fill--primary"
                    style={{ width: `${stats.weeklyScore}%` }}
                  />
                </div>
                <span className="stat-card__change stat-card__change--positive">
                  ↑ +{stats.weeklyScoreChange} puntos vs semana pasada
                </span>
              </>
            )}
          </div>

          {/* Registration Streak */}
          <div className="stat-card" id="stat-racha">
            <span className="stat-card__label">RACHA DE REGISTROS</span>
            {isLoading ? (
              <div className="skeleton" style={{ width: '50%', height: 32, marginBottom: 8 }} />
            ) : (
              <>
                <div className="stat-card__value">
                  {stats.registrationStreak} <span className="stat-card__fire" aria-label="Racha activa">🔥</span>
                </div>
                <div className="stat-card__streak-days">
                  {stats.streakDays.map((day, i) => (
                    <span key={i} className="stat-card__streak-day stat-card__streak-day--active">
                      {day}
                    </span>
                  ))}
                  <span className="stat-card__streak-day">S</span>
                  <span className="stat-card__streak-day">D</span>
                </div>
                <span className="stat-card__change">días consecutivos esta semana</span>
              </>
            )}
          </div>

          {/* Last Analysis */}
          <div className="stat-card" id="stat-ultimo-analisis">
            <span className="stat-card__label">ÚLTIMO ANÁLISIS IA</span>
            {isLoading ? (
              <div className="skeleton" style={{ width: '40%', height: 32, marginBottom: 8 }} />
            ) : (
              <>
                <div className="stat-card__value stat-card__value--negative">
                  {stats.lastAnalysis.sentimentScore.toFixed(2)}
                </div>
                <div className="stat-card__badges">
                  <EmotionBadge emotion={stats.lastAnalysis.dominantEmotion} size="sm" />
                  <RiskIndicator level={stats.lastAnalysis.riskLevel} size="sm" />
                </div>
                <span className="stat-card__change">
                  Ayer, {new Date(stats.lastAnalysis.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} · {stats.lastAnalysis.resourceCount} recursos sugeridos
                </span>
              </>
            )}
          </div>
        </div>

        {/* New Entry CTA */}
        <Link to="/bitacora/nueva" className="home-page__cta animate-fade-in" style={{ animationDelay: '0.15s' }} id="cta-nueva-bitacora">
          <div className="home-page__cta-icon" aria-hidden="true">
            <Plus size={20} />
          </div>
          <div className="home-page__cta-text">
            <strong>Registrar nueva bitácora emocional</strong>
            <span>Cuéntanos cómo te sientes hoy · El análisis IA toma menos de 3 segundos</span>
          </div>
          <ChevronRight size={20} className="home-page__cta-arrow" />
        </Link>

        {/* Emotional Trend Chart */}
        <div className="home-page__chart-card animate-fade-in" style={{ animationDelay: '0.2s' }} id="chart-tendencia">
          <div className="home-page__chart-header">
            <h2 className="home-page__chart-title">Tendencia emocional</h2>
            <div className="home-page__chart-filters">
              {['7d', '30d', '90d'].map((p) => (
                <button
                  key={p}
                  className={`home-page__chart-filter ${trendPeriod === p ? 'home-page__chart-filter--active' : ''}`}
                  onClick={() => setTrendPeriod(p)}
                  aria-label={`Ver tendencia de ${p}`}
                  aria-pressed={trendPeriod === p}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="home-page__chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#40916C" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#40916C" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                    boxShadow: 'var(--shadow-md)',
                  }}
                  formatter={(value) => [value.toFixed(2), 'Sentimiento']}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#3A7CA5"
                  strokeWidth={2.5}
                  fill="url(#sentimentGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#3A7CA5', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Entries */}
        <div className="home-page__entries animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <div className="home-page__entries-header">
            <h2 className="home-page__entries-title">Entradas recientes</h2>
            <Link to="/bitacora" className="home-page__entries-link">
              Ver historial completo <ChevronRight size={14} />
            </Link>
          </div>
          <div className="home-page__entries-list">
            {isLoading ? (
              <>
                <JournalCard state="loading" />
                <JournalCard state="loading" />
              </>
            ) : (
              recentEntries.map((entry) => (
                <JournalCard key={entry.id} entry={entry} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <aside className="home-page__panel" aria-label="Panel de bienestar">
        {/* Overall Wellbeing Score */}
        <div className="wellbeing-ring animate-slide-in" id="panel-bienestar">
          <h3 className="wellbeing-ring__title">Bienestar general</h3>
          <div className="wellbeing-ring__chart">
            <svg viewBox="0 0 120 120" className="wellbeing-ring__svg">
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke="var(--color-border-light)"
                strokeWidth="8"
              />
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke="url(#wellbeingGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(stats.weeklyScore / 100) * 327} 327`}
                transform="rotate(-90 60 60)"
                className="wellbeing-ring__progress"
              />
              <defs>
                <linearGradient id="wellbeingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#40916C" />
                  <stop offset="100%" stopColor="#52B788" />
                </linearGradient>
              </defs>
              <text x="60" y="55" textAnchor="middle" className="wellbeing-ring__value">
                {stats.weeklyScore}
              </text>
              <text x="60" y="72" textAnchor="middle" className="wellbeing-ring__label">
                / 100
              </text>
            </svg>
          </div>
          <div className="wellbeing-ring__trend wellbeing-ring__trend--positive">
            <TrendingUp size={14} />
            Tendencia positiva esta semana
          </div>
        </div>

        {/* Frequent Emotions */}
        <div className="panel-section animate-slide-in" style={{ animationDelay: '0.1s' }} id="panel-emociones">
          <h3 className="panel-section__title">Emociones frecuentes</h3>
          <div className="emotion-bars">
            {frequentEmotions.map((item) => (
              <div key={item.emotion} className="emotion-bar">
                <span className="emotion-bar__label">{item.emotion}</span>
                <div className="emotion-bar__track">
                  <div
                    className="emotion-bar__fill"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <span className="emotion-bar__value">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alert — Real alerts from backend */}
        {alerts.length > 0 && (
          <div className="animate-slide-in" style={{ animationDelay: '0.15s' }}>
            <AlertBanner alert={alerts[0]} />
          </div>
        )}

        {/* Suggested Resources */}
        <div className="panel-section animate-slide-in" style={{ animationDelay: '0.2s' }} id="panel-recursos">
          <h3 className="panel-section__title">Recursos sugeridos</h3>
          <div className="panel-section__resources">
            {resources.map((res) => (
              <ResourceCard key={res.id} resource={res} />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
