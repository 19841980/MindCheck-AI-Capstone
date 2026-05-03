import { useState, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from 'recharts';
import { MOCK_EMOTION_TREND_7D, MOCK_EMOTION_TREND_30D, MOCK_EMOTION_TREND_90D, MOCK_FREQUENT_EMOTIONS, MOCK_WELLBEING_STATS } from '../data/mockData';
import './DashboardPage.css';

const HEATMAP_DATA = [
  { day: 'Lun', w1: 2, w2: 1, w3: 3, w4: 2 },
  { day: 'Mar', w1: 1, w2: 3, w3: 2, w4: 1 },
  { day: 'Mié', w1: 3, w2: 2, w3: 1, w4: 3 },
  { day: 'Jue', w1: 2, w2: 1, w3: 2, w4: 2 },
  { day: 'Vie', w1: 1, w2: 2, w3: 3, w4: 1 },
  { day: 'Sáb', w1: 0, w2: 1, w3: 0, w4: 1 },
  { day: 'Dom', w1: 0, w2: 0, w3: 1, w4: 0 },
];

const EMOTION_COLORS = {
  'Ansiedad': '#E76F51', 'Calma': '#40916C', 'Estrés': '#E63946',
  'Alegría': '#3A7CA5', 'Tristeza': '#7B68EE',
};

export default function DashboardPage() {
  const [period, setPeriod] = useState('7d');
  const stats = MOCK_WELLBEING_STATS;

  const trendData = useMemo(() => {
    switch (period) {
      case '30d': return MOCK_EMOTION_TREND_30D;
      case '90d': return MOCK_EMOTION_TREND_90D;
      default: return MOCK_EMOTION_TREND_7D;
    }
  }, [period]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <h1 className="dashboard-page__title">Dashboard emocional</h1>
        <div className="dashboard-page__period-filter">
          {['7d', '30d', '90d'].map((p) => (
            <button key={p} className={`period-btn ${period === p ? 'period-btn--active' : ''}`} onClick={() => setPeriod(p)}>{p === '7d' ? '7 días' : p === '30d' ? '30 días' : '90 días'}</button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-page__summary animate-fade-in">
        <div className="summary-card">
          <span className="summary-card__label">Bienestar semanal</span>
          <span className="summary-card__value summary-card__value--primary">{stats.weeklyScore}<small>/100</small></span>
          <span className="summary-card__change positive">↑ +{stats.weeklyScoreChange} pts</span>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">Racha activa</span>
          <span className="summary-card__value">{stats.registrationStreak} 🔥</span>
          <span className="summary-card__change">días consecutivos</span>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">Entradas este mes</span>
          <span className="summary-card__value">12</span>
          <span className="summary-card__change positive">↑ 3 más que el mes anterior</span>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">Emoción predominante</span>
          <span className="summary-card__value summary-card__value--emotion">😰 Ansiedad</span>
          <span className="summary-card__change">62% de las entradas</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="dashboard-page__charts">
        {/* Sentiment Trend */}
        <div className="chart-card chart-card--wide animate-fade-in" style={{animationDelay:'0.1s'}}>
          <h3 className="chart-card__title">Tendencia de sentimiento</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData} margin={{top:10,right:10,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3A7CA5" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3A7CA5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:11, fill:'var(--color-text-tertiary)'}} />
              <YAxis domain={[-1,1]} ticks={[-1,0,1]} axisLine={false} tickLine={false} tick={{fontSize:11, fill:'var(--color-text-tertiary)'}} />
              <Tooltip contentStyle={{background:'var(--color-bg-card)',border:'1px solid var(--color-border)',borderRadius:8,fontSize:12}} formatter={(v)=>[v.toFixed(2),'Sentimiento']} />
              <Area type="monotone" dataKey="score" stroke="#3A7CA5" strokeWidth={2.5} fill="url(#dashGrad)" dot={false} activeDot={{r:4,fill:'#3A7CA5',stroke:'#fff',strokeWidth:2}} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Emotion Distribution */}
        <div className="chart-card animate-fade-in" style={{animationDelay:'0.15s'}}>
          <h3 className="chart-card__title">Distribución de emociones</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={MOCK_FREQUENT_EMOTIONS} margin={{top:10,right:10,left:-10,bottom:0}} layout="vertical">
              <XAxis type="number" domain={[0,100]} axisLine={false} tickLine={false} tick={{fontSize:11, fill:'var(--color-text-tertiary)'}} />
              <YAxis type="category" dataKey="emotion" axisLine={false} tickLine={false} tick={{fontSize:12, fill:'var(--color-text-secondary)'}} width={70} />
              <Tooltip contentStyle={{background:'var(--color-bg-card)',border:'1px solid var(--color-border)',borderRadius:8,fontSize:12}} formatter={(v)=>[`${v}%`,'Frecuencia']} />
              <Bar dataKey="percentage" radius={[0,4,4,0]} barSize={14}>
                {MOCK_FREQUENT_EMOTIONS.map((entry, i) => (
                  <Cell key={i} fill={EMOTION_COLORS[entry.emotion] || '#6C757D'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Heatmap */}
        <div className="chart-card animate-fade-in" style={{animationDelay:'0.2s'}}>
          <h3 className="chart-card__title">Actividad por día</h3>
          <div className="heatmap">
            <div className="heatmap__header">
              <span></span><span>S1</span><span>S2</span><span>S3</span><span>S4</span>
            </div>
            {HEATMAP_DATA.map((row) => (
              <div key={row.day} className="heatmap__row">
                <span className="heatmap__day">{row.day}</span>
                {[row.w1, row.w2, row.w3, row.w4].map((val, i) => (
                  <div key={i} className={`heatmap__cell heatmap__cell--${val}`} title={`${val} entradas`} />
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
        <div className="chart-card chart-card--insight animate-fade-in" style={{animationDelay:'0.25s'}}>
          <div className="insight-icon">🧠</div>
          <h3 className="chart-card__title">Insight de IA</h3>
          <p className="insight-text">
            Tu bienestar ha mejorado un <strong>12%</strong> esta semana. La ansiedad relacionada con evaluaciones 
            sigue siendo tu principal preocupación, pero los registros de calma han aumentado en los últimos 3 días. 
            <strong> Te recomiendo mantener tu rutina de sueño</strong>, ya que las entradas con mejor sentimiento 
            coinciden con noches donde reportas haber dormido bien.
          </p>
        </div>
      </div>
    </div>
  );
}
