import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, AlertCircle, Loader2 } from 'lucide-react';
import EmotionBadge from '../components/atoms/EmotionBadge';
import RiskIndicator from '../components/atoms/RiskIndicator';
import { journalApi } from '../services/api';
import './NewEntryPage.css';

const MIN_CHARS = 20;
const MAX_CHARS = 2000;

/**
 * Predefined emotions for manual fallback (SRS §6.3).
 * Shown when AI analysis fails so the student can still record their emotion.
 */
const MANUAL_EMOTIONS = [
  { value: 'ansiedad', label: 'Ansiedad', icon: '😰', score: -0.5 },
  { value: 'estrés', label: 'Estrés', icon: '😤', score: -0.4 },
  { value: 'tristeza', label: 'Tristeza', icon: '😢', score: -0.6 },
  { value: 'frustración', label: 'Frustración', icon: '😠', score: -0.3 },
  { value: 'calma', label: 'Calma', icon: '😌', score: 0.5 },
  { value: 'alegría', label: 'Alegría', icon: '😊', score: 0.7 },
];

export default function NewEntryPage() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  // Manual fallback state
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState(null);
  const [aiErrorMessage, setAiErrorMessage] = useState(null);
  const [isSavingManual, setIsSavingManual] = useState(false);

  const charCount = content.length;
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;
    setIsAnalyzing(true);
    setError(null);
    setShowManualPicker(false);
    setAiErrorMessage(null);

    try {
      const response = await journalApi.analyzeEntry(content);

      if (response.ai_available && response.analysis) {
        // AI analysis succeeded — show results
        setAnalysisResult({
          sentimentScore: response.analysis.sentiment_score,
          dominantEmotion: response.analysis.dominant_emotion,
          riskLevel: response.analysis.risk_level,
          riskJustification: response.analysis.risk_justification,
          keywords: response.analysis.keywords || [],
          recommendations: response.analysis.recommendations || [],
          crisisIndicators: response.analysis.crisis_indicators || false,
        });
      } else {
        // AI failed — entry is saved, show manual picker (SRS §6.3)
        setSavedEntryId(response.entry?.id);
        setAiErrorMessage(
          response.ai_error_message ||
          'El análisis de IA no está disponible en este momento.'
        );
        setShowManualPicker(true);
      }
    } catch (err) {
      setError(
        err.message || 'No pudimos conectar con el servidor. Intenta de nuevo.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleManualEmotion(emotion) {
    if (!savedEntryId) return;
    setIsSavingManual(true);

    try {
      const response = await journalApi.saveManualEmotion(
        savedEntryId,
        emotion.value,
        emotion.score,
        emotion.score < -0.3 ? 'moderado' : 'bajo'
      );

      setShowManualPicker(false);
      setAnalysisResult({
        sentimentScore: emotion.score,
        dominantEmotion: emotion.label,
        riskLevel: emotion.score < -0.3 ? 'Moderado' : 'Bajo',
        riskJustification: 'Emoción seleccionada manualmente por el estudiante.',
        keywords: [],
        recommendations: [],
        crisisIndicators: false,
      });
    } catch (err) {
      setError('No se pudo guardar la emoción. Intenta de nuevo.');
    } finally {
      setIsSavingManual(false);
    }
  }

  return (
    <div className="new-entry-page">
      <div className="new-entry-page__main">
        <h1 className="new-entry-page__title">Nueva bitácora emocional</h1>
        <p className="new-entry-page__subtitle">Cuéntanos cómo te sientes. Tu texto está protegido con AES-256.</p>

        <form onSubmit={handleSubmit} className="new-entry-page__form">
          <div className="new-entry-page__textarea-wrapper">
            <textarea
              className="new-entry-page__textarea"
              placeholder="¿Cómo te sientes hoy? Escribe libremente..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={MAX_CHARS}
              disabled={isAnalyzing || analysisResult || showManualPicker}
              id="journal-entry-textarea"
              rows={8}
            />
            <div className="new-entry-page__char-count">
              <span className={charCount < MIN_CHARS ? 'text-warning' : ''}>{charCount}</span> / {MAX_CHARS}
              {charCount < MIN_CHARS && <span className="text-hint"> (mínimo {MIN_CHARS})</span>}
            </div>
          </div>

          {error && <div className="new-entry-page__error" role="alert"><AlertCircle size={16} />{error}</div>}

          {!analysisResult && !showManualPicker && (
            <button type="submit" className="new-entry-page__submit" disabled={!isValid || isAnalyzing} id="btn-enviar">
              {isAnalyzing ? <><Loader2 size={18} className="spin" /> Analizando...</> : <><Send size={18} /> Guardar y analizar</>}
            </button>
          )}
        </form>

        {isAnalyzing && (
          <div className="new-entry-page__analyzing animate-fade-in">
            <div className="pulse-ring-wrap"><div className="pulse-ring" /><span>🧠</span></div>
            <h3>Analizando tu estado emocional...</h3>
            <p>La IA está procesando tu texto. Tu entrada ya fue guardada de forma segura.</p>
          </div>
        )}

        {/* Manual Emotion Picker — SRS §6.3 Fallback */}
        {showManualPicker && (
          <div className="new-entry-page__manual-picker animate-fade-in">
            <div className="manual-picker__header">
              <AlertCircle size={20} />
              <div>
                <h3>El análisis automático no está disponible</h3>
                <p>{aiErrorMessage}</p>
                <p className="manual-picker__saved">✅ Tu entrada fue guardada de forma segura.</p>
              </div>
            </div>
            <h4>¿Cómo te sientes? Selecciona tu emoción principal:</h4>
            <div className="manual-picker__grid">
              {MANUAL_EMOTIONS.map((emotion) => (
                <button
                  key={emotion.value}
                  className="manual-picker__btn"
                  onClick={() => handleManualEmotion(emotion)}
                  disabled={isSavingManual}
                  type="button"
                >
                  <span className="manual-picker__icon">{emotion.icon}</span>
                  <span className="manual-picker__label">{emotion.label}</span>
                </button>
              ))}
            </div>
            {isSavingManual && (
              <div className="manual-picker__saving">
                <Loader2 size={16} className="spin" /> Guardando...
              </div>
            )}
          </div>
        )}

        {analysisResult && (
          <div className="new-entry-page__result animate-scale-in">
            <h2>Resultado del análisis</h2>
            <div className="result-grid">
              <div className="result-card"><span className="result-label">Sentimiento</span>
                <span className="result-score" style={{color: analysisResult.sentimentScore >= 0 ? 'var(--color-sentiment-positive)' : 'var(--color-sentiment-negative)'}}>{analysisResult.sentimentScore.toFixed(2)}</span></div>
              <div className="result-card"><span className="result-label">Emoción</span><EmotionBadge emotion={analysisResult.dominantEmotion} /></div>
              <div className="result-card"><span className="result-label">Riesgo</span><RiskIndicator level={analysisResult.riskLevel} /></div>
            </div>
            <div className="result-justification"><strong>Justificación:</strong> {analysisResult.riskJustification}</div>
            {analysisResult.keywords.length > 0 && (
              <div className="result-keywords"><h4>Palabras clave</h4><div className="keyword-list">{analysisResult.keywords.map(kw => <span key={kw} className="keyword-tag">{kw}</span>)}</div></div>
            )}
            {analysisResult.recommendations.length > 0 && (
              <div className="result-recs"><h4>Recomendaciones</h4><ul>{analysisResult.recommendations.map((r,i)=><li key={i}>{r}</li>)}</ul></div>
            )}
            <div className="result-actions">
              <button className="btn-primary" onClick={() => navigate('/')}>Volver al inicio</button>
              <button className="btn-secondary" onClick={() => navigate('/recursos')}>Ver recursos</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
