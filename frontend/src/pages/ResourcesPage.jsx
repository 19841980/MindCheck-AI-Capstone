import { useState, useEffect } from 'react';
import { Heart, Wind, BookOpen, Phone, Search, RefreshCw } from 'lucide-react';
import { resourcesApi } from '../services/api';
import { MOCK_RESOURCES } from '../data/mockData';
import './ResourcesPage.css';

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: Heart },
  { id: 'exercise', label: 'Ejercicios', icon: Wind },
  { id: 'meditation', label: 'Meditación', icon: Heart },
  { id: 'article', label: 'Artículos', icon: BookOpen },
  { id: 'contact', label: 'Contacto', icon: Phone },
];

/**
 * Maps a backend resource (snake_case) to the camelCase format
 * expected by the resource card UI.
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

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Fetches self-help resources from the backend API.
   * Falls back to MOCK_RESOURCES when the server is unreachable
   * or when no real resources exist yet, so the UI never looks empty.
   */
  async function fetchResources() {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await resourcesApi.getAll();
      const mapped = (response.resources || []).map(mapResource);
      // Use real data if available, otherwise fall back to mock data for demo purposes
      setResources(mapped.length > 0 ? mapped : MOCK_RESOURCES);
    } catch (err) {
      setFetchError('No pudimos cargar los recursos. Verifica que el servidor esté activo.');
      setResources(MOCK_RESOURCES); // Fallback to mock
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchResources(); }, []);

  const filtered = resources.filter((r) => {
    const matchCat = category === 'all' || r.type === category;
    const matchSearch = !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="resources-page">
      <div className="resources-page__header">
        <h1 className="resources-page__title">Recursos de autoayuda</h1>
        <p className="resources-page__subtitle">Herramientas y recursos personalizados según tu estado emocional.</p>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="resources-page__error animate-fade-in" role="alert">
          <p>⚠️ {fetchError}</p>
          <button onClick={fetchResources} className="resources-page__retry-btn" aria-label="Reintentar carga de recursos">
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      )}

      <div className="resources-page__search">
        <Search size={16} className="resources-page__search-icon" />
        <input type="text" placeholder="Buscar recursos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="resources-page__search-input" />
      </div>

      <div className="resources-page__categories">
        {CATEGORIES.map((cat) => (
          <button key={cat.id} className={`category-btn ${category === cat.id ? 'category-btn--active' : ''}`} onClick={() => setCategory(cat.id)}>
            <cat.icon size={16} /> {cat.label}
          </button>
        ))}
      </div>

      <div className="resources-page__grid">
        {isLoading ? (
          /* Loading Skeletons — 6 resource skeleton cards */
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="resource-full-card resource-full-card--loading animate-fade-in" style={{animationDelay: `${i * 0.05}s`}} aria-busy="true">
              <div className="resource-full-card__icon">
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
              </div>
              <div className="resource-full-card__body">
                <div className="skeleton" style={{ width: '70%', height: 16, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '100%', height: 14, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: '50%', height: 14 }} />
              </div>
              <div className="skeleton" style={{ width: 80, height: 32, borderRadius: 6 }} />
            </div>
          ))
        ) : (
          <>
            {filtered.map((resource, i) => (
              <div key={resource.id} className="resource-full-card animate-fade-in" style={{animationDelay: `${i * 0.05}s`}}>
                <div className="resource-full-card__icon">{resource.icon}</div>
                <div className="resource-full-card__body">
                  <h3 className="resource-full-card__title">{resource.title}</h3>
                  <p className="resource-full-card__desc">{resource.description}</p>
                  <div className="resource-full-card__meta">
                    <span className="resource-full-card__duration">⏱ {resource.duration}</span>
                    <div className="resource-full-card__tags">
                      {resource.emotionTags.map((tag) => <span key={tag} className="resource-full-card__tag">{tag}</span>)}
                    </div>
                  </div>
                </div>
                <button className="resource-full-card__btn">Comenzar</button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="resources-page__empty">
                <span>🔍</span>
                <p>No se encontraron recursos. Intenta otra categoría o búsqueda.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Emergency Contacts */}
      <div className="resources-page__emergency animate-fade-in">
        <h2>📞 Líneas de apoyo</h2>
        <div className="emergency-cards">
          <div className="emergency-card">
            <strong>Bienestar Duoc UC</strong>
            <span>Lunes a Viernes, 8:30 - 18:00</span>
            <a href="tel:+56221234567">+56 2 2123 4567</a>
          </div>
          <div className="emergency-card">
            <strong>Fono Salud Mental</strong>
            <span>Disponible 24/7</span>
            <a href="tel:600">600 360 7777</a>
          </div>
          <div className="emergency-card">
            <strong>Línea de la Vida</strong>
            <span>Emergencias, 24/7</span>
            <a href="tel:+56229109000">+56 2 2910 9000</a>
          </div>
        </div>
      </div>
    </div>
  );
}
