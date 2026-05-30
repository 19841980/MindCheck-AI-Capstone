import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Trash2, ChevronDown, RefreshCw } from 'lucide-react';
import JournalCard from '../components/molecules/JournalCard';
import { journalApi } from '../services/api';
import { MOCK_JOURNAL_ENTRIES } from '../data/mockData';
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
                <JournalCard entry={entry} />
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
    </div>
  );
}
