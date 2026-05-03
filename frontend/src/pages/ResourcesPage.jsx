import { useState } from 'react';
import { Heart, Wind, BookOpen, Phone, Search } from 'lucide-react';
import { MOCK_RESOURCES } from '../data/mockData';
import './ResourcesPage.css';

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: Heart },
  { id: 'exercise', label: 'Ejercicios', icon: Wind },
  { id: 'meditation', label: 'Meditación', icon: Heart },
  { id: 'article', label: 'Artículos', icon: BookOpen },
  { id: 'contact', label: 'Contacto', icon: Phone },
];

export default function ResourcesPage() {
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = MOCK_RESOURCES.filter((r) => {
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
