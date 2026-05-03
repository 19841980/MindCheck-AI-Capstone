import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Trash2, ChevronDown } from 'lucide-react';
import JournalCard from '../components/molecules/JournalCard';
import { MOCK_JOURNAL_ENTRIES } from '../data/mockData';
import './JournalPage.css';

/**
 * JournalPage — Lists all journal entries with search, filter, and delete.
 * RF-05: Historial y Edición de Entradas
 */
export default function JournalPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmotion, setFilterEmotion] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const entries = MOCK_JOURNAL_ENTRIES;

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = !searchQuery
      || entry.content.toLowerCase().includes(searchQuery.toLowerCase())
      || entry.keywords.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()));
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
        {filteredEntries.length === 0 ? (
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
              <JournalCard entry={entry} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
