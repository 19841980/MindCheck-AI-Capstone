import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Trash2, ChevronDown, RefreshCw, X, Loader2, AlertCircle } from 'lucide-react';
import JournalCard from '../components/molecules/JournalCard';
import EmotionBadge from '../components/atoms/EmotionBadge';
import RiskIndicator from '../components/atoms/RiskIndicator';
import { journalApi } from '../services/api';
import { MOCK_JOURNAL_ENTRIES } from '../data/mockData';
import { formatDate, formatTime } from '../utils/dateUtils';
import './JournalPage.css';

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
 * JournalPage — Lists all journal entries with search, filter, and delete.
 * RF-05: Historial y Edición de Entradas
 */
export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmotion, setFilterEmotion] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [deletingEntryId, setDeletingEntryId] = useState(null);

  // States for interactive detail decryption modal
  const [selectedEntryDetail, setSelectedEntryDetail] = useState(null);
  const [selectedEntryForModal, setSelectedEntryForModal] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  async function handleOpenDetail(entry) {
    setSelectedEntryForModal(entry);
    setSelectedEntryDetail(null);
    setIsDetailLoading(true);
    setDetailError(null);
    setShowDetailModal(true);

    if (entry.id.startsWith('entry-')) {
      const mockDetail = MOCK_JOURNAL_ENTRIES.find((e) => e.id === entry.id);
      setSelectedEntryDetail({
        entry: {
          id: mockDetail.id,
          content_decrypted: mockDetail.content,
          created_at: mockDetail.createdAt,
          sentiment_score: mockDetail.sentimentScore,
          dominant_emotion: mockDetail.dominantEmotion,
          risk_level: mockDetail.riskLevel,
          keywords: mockDetail.keywords,
        },
        analysis: {
          sentiment_score: mockDetail.sentimentScore,
          dominant_emotion: mockDetail.dominantEmotion,
          risk_level: mockDetail.riskLevel,
          keywords: mockDetail.keywords,
          recommendations: mockDetail.recommendations || [],
          risk_justification: 'Análisis generado para demostración.',
        },
      });
      setIsDetailLoading(false);
      return;
    }

    try {
      const response = await journalApi.getEntryDetail(entry.id);
      setSelectedEntryDetail(response);
    } catch (err) {
      setDetailError('No se pudo descifrar la entrada. Intenta nuevamente.');
    } finally {
      setIsDetailLoading(false);
    }
  }

  function handleCloseDetailModal() {
    setShowDetailModal(false);
    setSelectedEntryForModal(null);
    setSelectedEntryDetail(null);
    setDetailError(null);
  }

  /**
   * Fetches journal entries from the backend API.
   * Falls back to MOCK_JOURNAL_ENTRIES when the server is unreachable
   * or when no real entries exist yet, so the UI never looks empty for demos.
   */
  async function fetchEntries() {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await journalApi.getEntries();
      const mapped = (response.entries || []).map(mapEntry);
      // Use real data if available, otherwise fall back to mock data for demo purposes
      setEntries(mapped.length > 0 ? mapped : MOCK_JOURNAL_ENTRIES);
    } catch (err) {
      setFetchError('No pudimos cargar tus entradas. Verifica que el servidor esté activo.');
      setEntries(MOCK_JOURNAL_ENTRIES); // Fallback to mock
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchEntries(); }, []);

  /**
   * Permanently deletes a journal entry after user confirmation.
   * Optimistically removes the entry from the list, then calls the API.
   * Rolls back on failure.
   */
  async function handleDeleteEntry(entryId) {
    if (!window.confirm('¿Estás seguro/a de que deseas eliminar esta entrada? Esta acción es irreversible.')) {
      return;
    }
    setDeletingEntryId(entryId);
    const previousEntries = [...entries];
    // Optimistic removal
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    try {
      await journalApi.deleteEntry(entryId);
    } catch (err) {
      // Rollback on failure
      setEntries(previousEntries);
      setFetchError('No se pudo eliminar la entrada. Intenta de nuevo.');
    } finally {
      setDeletingEntryId(null);
    }
  }

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = !searchQuery
      || (entry.content && entry.content.toLowerCase().includes(searchQuery.toLowerCase()))
      || (entry.keywords && entry.keywords.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesEmotion = filterEmotion === 'all' || entry.dominantEmotion === filterEmotion;
    const matchesRisk = filterRisk === 'all' || entry.riskLevel === filterRisk;
    return matchesSearch && matchesEmotion && matchesRisk;
  });

  return (
    <div className="journal-page">
      <div className="journal-page__header">
        <div>
          <h1 className="journal-page__title">Mi bitácora emocional</h1>
          <p className="journal-page__subtitle">
            {entries.length} entradas registradas · Tus datos están cifrados con AES-256
          </p>
        </div>
        <Link to="/bitacora/nueva" className="journal-page__new-btn" id="btn-nueva-entrada">
          <Plus size={18} />
          Nueva entrada
        </Link>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="journal-page__error animate-fade-in" role="alert">
          <p>⚠️ {fetchError}</p>
          <button onClick={fetchEntries} className="journal-page__retry-btn" aria-label="Reintentar carga de entradas">
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="journal-page__filters animate-fade-in">
        <div className="journal-page__search">
          <Search size={16} className="journal-page__search-icon" />
          <input
            type="text"
            placeholder="Buscar en bitácoras..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="journal-page__search-input"
            id="search-journal"
            aria-label="Buscar entradas de bitácora"
          />
        </div>
        <div className="journal-page__filter-group">
          <select
            value={filterEmotion}
            onChange={(e) => setFilterEmotion(e.target.value)}
            className="journal-page__select"
            aria-label="Filtrar por emoción"
          >
            <option value="all">Todas las emociones</option>
            <option value="Ansiedad">Ansiedad</option>
            <option value="Calma">Calma</option>
            <option value="Estrés">Estrés</option>
            <option value="Alegría">Alegría</option>
            <option value="Tristeza">Tristeza</option>
            <option value="Frustración">Frustración</option>
          </select>
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="journal-page__select"
            aria-label="Filtrar por nivel de riesgo"
          >
            <option value="all">Todos los niveles</option>
            <option value="Bajo">Bajo</option>
            <option value="Moderado">Moderado</option>
            <option value="Alto">Alto</option>
            <option value="Crítico">Crítico</option>
          </select>
        </div>
      </div>

      {/* Entries List */}
      <div className="journal-page__list">
        {isLoading ? (
          /* Loading Skeletons — 3 skeleton JournalCards */
          <>
            <div className="animate-fade-in" style={{ animationDelay: '0s' }}>
              <JournalCard state="loading" />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
              <JournalCard state="loading" />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <JournalCard state="loading" />
            </div>
          </>
        ) : filteredEntries.length === 0 ? (
          <div className="journal-page__empty animate-fade-in">
            <span className="journal-page__empty-icon" aria-hidden="true">📝</span>
            <h3>No se encontraron entradas</h3>
            <p>
              {searchQuery || filterEmotion !== 'all' || filterRisk !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda.'
                : '¡Comienza registrando tu primera bitácora emocional!'}
            </p>
            {!searchQuery && filterEmotion === 'all' && filterRisk === 'all' && (
              <Link to="/bitacora/nueva" className="journal-page__empty-btn">
                Registrar primera entrada
              </Link>
            )}
          </div>
        ) : (
          filteredEntries.map((entry, i) => (
            <div key={entry.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="journal-page__entry-wrapper">
                <JournalCard entry={entry} onClick={() => handleOpenDetail(entry)} />
                <button
                  className="journal-page__delete-btn"
                  onClick={() => handleDeleteEntry(entry.id)}
                  disabled={deletingEntryId === entry.id}
                  aria-label={`Eliminar entrada del ${entry.createdAt}`}
                  title="Eliminar entrada"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Detalle de Bitácora (Descifrado) */}
      {showDetailModal && (
        <div className="journal-modal-overlay animate-fade-in" onClick={handleCloseDetailModal}>
          <div className="journal-modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button
              className="journal-modal-close"
              onClick={handleCloseDetailModal}
              aria-label="Cerrar detalle"
              id="btn-close-journal-modal"
            >
              <X size={20} />
            </button>

            {isDetailLoading ? (
              <div className="journal-modal__loading">
                <Loader2 size={32} className="spin" />
                <p>Descifrando entrada con seguridad AES-256...</p>
              </div>
            ) : detailError ? (
              <div className="journal-modal__error">
                <AlertCircle size={32} />
                <p>{detailError}</p>
                <button onClick={() => handleOpenDetail(selectedEntryForModal)} className="journal-page__retry-btn">
                  Intentar nuevamente
                </button>
              </div>
            ) : selectedEntryDetail ? (
              <div className="journal-modal__body">
                <div className="journal-modal__header">
                  <span className="journal-modal__date">
                    {formatDate(selectedEntryDetail.entry.created_at || selectedEntryDetail.entry.createdAt)} a las {formatTime(selectedEntryDetail.entry.created_at || selectedEntryDetail.entry.createdAt)}
                  </span>
                  <div className="journal-modal__badges">
                    <EmotionBadge emotion={selectedEntryDetail.analysis?.dominant_emotion || selectedEntryDetail.entry.dominant_emotion} size="md" />
                    <RiskIndicator level={selectedEntryDetail.analysis?.risk_level || selectedEntryDetail.entry.risk_level} size="md" />
                  </div>
                </div>

                <div className="journal-modal__score-section">
                  <div className="journal-modal__score-wrapper">
                    <span className="journal-modal__score-label">Puntaje de Sentimiento</span>
                    <div 
                      className="journal-modal__score-badge"
                      style={{ 
                        color: (selectedEntryDetail.analysis?.sentiment_score ?? 0) >= 0.3
                          ? 'var(--color-sentiment-positive)'
                          : (selectedEntryDetail.analysis?.sentiment_score ?? 0) <= -0.3
                            ? 'var(--color-sentiment-negative)'
                            : 'var(--color-sentiment-neutral)',
                        backgroundColor: (selectedEntryDetail.analysis?.sentiment_score ?? 0) >= 0.3
                          ? 'var(--color-sentiment-positive-bg)'
                          : (selectedEntryDetail.analysis?.sentiment_score ?? 0) <= -0.3
                            ? 'var(--color-sentiment-negative-bg)'
                            : 'var(--color-sentiment-neutral-bg)'
                      }}
                    >
                      {(selectedEntryDetail.analysis?.sentiment_score ?? 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="journal-modal__content-section">
                  <h3>Bitácora Escrita</h3>
                  <div className="journal-modal__text-box">
                    "{selectedEntryDetail.entry.content_decrypted}"
                  </div>
                </div>

                {selectedEntryDetail.analysis?.keywords && selectedEntryDetail.analysis.keywords.length > 0 && (
                  <div className="journal-modal__keywords-section">
                    <h3>Conceptos Clave Detectados</h3>
                    <div className="journal-modal__keywords">
                      {selectedEntryDetail.analysis.keywords.map((kw) => (
                        <span key={kw} className="journal-modal__keyword">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEntryDetail.analysis?.risk_justification && (
                  <div className="journal-modal__justification-section">
                    <h3>Justificación del Nivel de Riesgo</h3>
                    <p className="journal-modal__justification-text">
                      {selectedEntryDetail.analysis.risk_justification}
                    </p>
                  </div>
                )}

                {selectedEntryDetail.analysis?.recommendations && selectedEntryDetail.analysis.recommendations.length > 0 && (
                  <div className="journal-modal__recommendations-section">
                    <h3>Recomendaciones de Apoyo Generadas</h3>
                    <ul className="journal-modal__recommendations-list">
                      {selectedEntryDetail.analysis.recommendations.map((rec, index) => (
                        <li key={index} className="journal-modal__recommendation-item">
                          💡 {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="journal-modal__footer">
                  <button
                    className="journal-modal__delete-btn"
                    onClick={() => {
                      handleDeleteEntry(selectedEntryDetail.entry.id);
                      setShowDetailModal(false);
                    }}
                  >
                    <Trash2 size={16} /> Eliminar Entrada
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
