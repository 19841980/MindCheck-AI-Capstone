import { useState, useEffect, useRef } from 'react';
import { Heart, Wind, BookOpen, Phone, Search, RefreshCw, X, Play, Pause, CheckCircle } from 'lucide-react';
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

  // Interactive Modal States
  const [selectedResource, setSelectedResource] = useState(null);

  // 1. Breathing Exercise states
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('inhale'); // 'inhale', 'hold', 'exhale'
  const [breathingTimer, setBreathingTimer] = useState(4);
  const [breathingCycle, setBreathingCycle] = useState(1);

  // 2. Meditation Media states
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const [mediaTime, setMediaTime] = useState(0);

  // 3. Gratitude states
  const [gratitude1, setGratitude1] = useState('');
  const [gratitude2, setGratitude2] = useState('');
  const [gratitude3, setGratitude3] = useState('');
  const [gratitudeSaved, setGratitudeSaved] = useState(false);

  // Refs to control guided meditation audio in client (Web Audio API & Speech Synthesis)
  const audioContextRef = useRef(null);
  const osc1Ref = useRef(null);
  const osc2Ref = useRef(null);
  const gainNodeRef = useRef(null);
  const lfoRef = useRef(null);
  const spokenTimesRef = useRef(new Set());

  // Calming speech synthesizer for Spanish guided narration (Ley 19.628 privacy compliant & offline-friendly)
  const speakCalmText = (text) => {
    if (!('speechSynthesis' in window)) return;
    
    // Cancel active/queued speech to avoid overlaps
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CL'; // Spanish (Chile)

    const voices = window.speechSynthesis.getVoices();
    // Try to find a Spanish voice
    const esVoice = voices.find((v) => v.lang.startsWith('es'));
    if (esVoice) {
      utterance.voice = esVoice;
    }

    utterance.pitch = 0.92; // Slightly lower pitch for warm calming voice
    utterance.rate = 0.82;  // Calm, relaxed narration pace
    window.speechSynthesis.speak(utterance);
  };

  const startMeditationAudio = async () => {
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime); // Gentle soft volume
        gainNodeRef.current = gainNode;

        const filterNode = audioCtx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(130, audioCtx.currentTime); // Low pass filter for warm ambient sound

        const osc1 = audioCtx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(98, audioCtx.currentTime); // Low G
        osc1Ref.current = osc1;

        const osc2 = audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(102, audioCtx.currentTime); // Binaural beat delta tone (4Hz diff)
        osc2Ref.current = osc2;

        const lfo = audioCtx.createOscillator();
        lfo.frequency.setValueAtTime(0.08, audioCtx.currentTime); // 12-second breathing wave
        lfoRef.current = lfo;

        const lfoGain = audioCtx.createGain();
        lfoGain.gain.setValueAtTime(0.04, audioCtx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(gainNode.gain);

        osc1.connect(filterNode);
        osc2.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start(0);
        osc2.start(0);
        lfo.start(0);
      } catch (err) {
        console.error('[MindCheck] Falló iniciar AudioContext:', err);
      }
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }
  };

  const pauseMeditationAudio = () => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend();
    }
  };

  const stopMeditationAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioContextRef.current) {
      try {
        if (osc1Ref.current) {
          osc1Ref.current.stop();
          osc1Ref.current.disconnect();
        }
        if (osc2Ref.current) {
          osc2Ref.current.stop();
          osc2Ref.current.disconnect();
        }
        if (lfoRef.current) {
          lfoRef.current.stop();
          lfoRef.current.disconnect();
        }
      } catch (e) {
        console.warn('Error stopping oscillators:', e);
      }
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.warn('Error closing AudioContext:', e);
      }
      audioContextRef.current = null;
      osc1Ref.current = null;
      osc2Ref.current = null;
      gainNodeRef.current = null;
      lfoRef.current = null;
    }
  };

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

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    let interval = null;
    if (breathingActive && selectedResource) {
      const titleLower = selectedResource.title.toLowerCase();
      const is478 = titleLower.includes('4') && titleLower.includes('7') && titleLower.includes('8');
      interval = setInterval(() => {
        setBreathingTimer((prev) => {
          if (prev <= 1) {
            // Move to next phase
            if (breathingPhase === 'inhale') {
              setBreathingPhase('hold');
              return is478 ? 7 : 4;
            } else if (breathingPhase === 'hold') {
              setBreathingPhase('exhale');
              return is478 ? 8 : 4;
            } else {
              // Cycle completes. If reaches 4, stop exercise
              if (breathingCycle >= 4) {
                setBreathingActive(false);
                return 4;
              }
              setBreathingPhase('inhale');
              setBreathingCycle((c) => c + 1);
              return 4;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [breathingActive, breathingPhase, breathingCycle, selectedResource]);

  // Meditation Timer Loop (updates visual time)
  useEffect(() => {
    let interval = null;
    if (mediaPlaying) {
      interval = setInterval(() => {
        setMediaTime((prev) => {
          const nextTime = prev + 1;
          if (nextTime >= 300) {
            setMediaPlaying(false);
            stopMeditationAudio(); // Stop synthesis and sound fully
            return 300;
          }
          return nextTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mediaPlaying]);

  // Trigger guided speech when mediaTime changes to prevent skipped triggers or stale closure blocks
  useEffect(() => {
    if (!mediaPlaying) return;

    const timings = [
      { time: 0, phrase: 'Bienvenido a tu meditación guiada de MindCheck. Busca una postura cómoda, cierra los ojos y concéntrate en tu respiración.' },
      { time: 15, phrase: 'Siente cómo el aire entra y sale de tu cuerpo de forma natural. No intentes forzar nada. Solo observa el ritmo.' },
      { time: 45, phrase: 'Si surge algún pensamiento o distracción en tu mente, reconócelo sin juzgarlo. Déjalo pasar como si fuera una nube flotando en el cielo, y regresa amablemente tu atención a la respiración.' },
      { time: 90, phrase: 'Relaja tu rostro, tus hombros, tu cuello y tu mandíbula. Siente cómo con cada exhalación, cualquier tensión acumulada se disuelve lentamente.' },
      { time: 150, phrase: 'Disfruta de este espacio de calma y quietud. Te estás dedicando un valioso tiempo para cuidar de tu bienestar mental.' },
      { time: 210, phrase: 'Sigue el aire fluyendo por tu cuerpo. Inhalando paz y tranquilidad, exhalando cansancio y preocupación.' },
      { time: 260, phrase: 'Poco a poco, comienza a regresar tu atención al espacio físico que te rodea. Siente el contacto de tus pies con el suelo y vuelve a habitar este momento presente.' },
      { time: 290, phrase: 'Gracias por meditar con nosotros hoy. Cuando te sientas listo, puedes abrir suavemente tus ojos. Que tengas un día lleno de paz y enfoque. Namasté.' }
    ];

    timings.forEach((item) => {
      // Use a range check (tolerance of 3 seconds) to ensure that if a tick gets skipped or delayed,
      // the voice still triggers. Check if we haven't spoken it yet in this session.
      if (mediaTime >= item.time && mediaTime - item.time <= 3 && !spokenTimesRef.current.has(item.time)) {
        spokenTimesRef.current.add(item.time);
        speakCalmText(item.phrase);
      }
    });
  }, [mediaTime, mediaPlaying]);

  // Synchronize play/pause state changes to the Web Audio & Web Speech synthesis engine
  useEffect(() => {
    if (mediaPlaying) {
      startMeditationAudio();
    } else {
      pauseMeditationAudio();
    }
  }, [mediaPlaying]);

  // Clear all audio, oscillators, filter nodes and speech queues upon component unmount
  useEffect(() => {
    return () => {
      stopMeditationAudio();
      spokenTimesRef.current.clear();
    };
  }, []);

  function handleCloseModal() {
    stopMeditationAudio(); // Stop any running binaural beat or speech synthesizers safely
    spokenTimesRef.current.clear(); // Reset spoken times tracking
    setSelectedResource(null);
    // Reset all interactive states
    setBreathingActive(false);
    setBreathingPhase('inhale');
    setBreathingTimer(4);
    setBreathingCycle(1);

    setMediaPlaying(false);
    setMediaTime(0);

    setGratitudeSaved(false);
    setGratitude1('');
    setGratitude2('');
    setGratitude3('');
  }

  function startBreathing() {
    setBreathingPhase('inhale');
    setBreathingTimer(4);
    setBreathingCycle(1);
    setBreathingActive(true);
  }

  function stopBreathing() {
    setBreathingActive(false);
  }

  const filtered = resources.filter((r) => {
    const matchCat = category === 'all' || r.type === category;
    const matchSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  function renderModalContent() {
    if (!selectedResource) return null;

    const titleLower = selectedResource.title.toLowerCase();
    const is478 = titleLower.includes('4') && titleLower.includes('7') && titleLower.includes('8');
    const isDiafragmática = titleLower.includes('diafragmática') || titleLower.includes('diafragmatica');
    const isMindfulness = titleLower.includes('mindfulness') || titleLower.includes('meditación') || titleLower.includes('meditacion');
    const isGratitude = titleLower.includes('gratitud') || titleLower.includes('agradecido');
    const isAcademic = 
      titleLower.includes('académica') || 
      titleLower.includes('academica') || 
      titleLower.includes('académico') || 
      titleLower.includes('academico') ||
      titleLower.includes('gestión') ||
      titleLower.includes('gestion');

    if (is478 || isDiafragmática) {
      return (
        <div className="resource-modal__exercise">
          <div className="resource-modal__badge">EJERCICIO DE RESPIRACIÓN</div>
          <h2>{selectedResource.title}</h2>
          <p className="resource-modal__description">{selectedResource.description}</p>

          <div className="breathing-container">
            {breathingActive ? (
              <>
                <div className={`breathing-bubble breathing-bubble--${breathingPhase}`}>
                  <span className="breathing-bubble__phase">
                    {breathingPhase === 'inhale' && 'Inhala'}
                    {breathingPhase === 'hold' && 'Mantén'}
                    {breathingPhase === 'exhale' && 'Exhala'}
                  </span>
                  <span className="breathing-bubble__timer">{breathingTimer}s</span>
                </div>
                <div className="breathing-stats">
                  <span className="breathing-stats__cycle">Ciclo: <strong>{breathingCycle}/4</strong></span>
                  <span className="breathing-stats__phase-desc">
                    {breathingPhase === 'inhale' && 'Llena tus pulmones lentamente por la nariz...'}
                    {breathingPhase === 'hold' && 'Retén el aire con calma...'}
                    {breathingPhase === 'exhale' && 'Expulsa el aire suavemente por la boca...'}
                  </span>
                </div>
                <button className="resource-modal__btn resource-modal__btn--stop" onClick={stopBreathing}>
                  Pausar Ejercicio
                </button>
              </>
            ) : (
              <div className="breathing-intro">
                <div className="breathing-instruction-box">
                  <h3>Instrucciones:</h3>
                  {is478 ? (
                    <ul>
                      <li><strong>1. Inhala:</strong> Toma aire por la nariz en silencio durante 4 segundos.</li>
                      <li><strong>2. Retén:</strong> Aguanta la respiración durante 7 segundos.</li>
                      <li><strong>3. Exhala:</strong> Expulsa el aire por la boca haciendo un soplido durante 8 segundos.</li>
                      <li>Repite este ciclo 4 veces para calmar tu sistema nervioso.</li>
                    </ul>
                  ) : (
                    <ul>
                      <li><strong>1. Inhala:</strong> Coloca una mano en tu pecho y otra en tu abdomen. Inhala inflando el abdomen durante 4 segundos.</li>
                      <li><strong>2. Retén:</strong> Sostén el aire de forma relajada durante 4 segundos.</li>
                      <li><strong>3. Exhala:</strong> Libera el aire lentamente por la boca durante 4 segundos.</li>
                      <li>Practica durante unos minutos para desacelerar tu ritmo cardíaco.</li>
                    </ul>
                  )}
                </div>
                <button className="resource-modal__btn" onClick={startBreathing}>
                  Comenzar Respiración
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (isMindfulness) {
      const formatMinSec = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };

      return (
        <div className="resource-modal__meditation">
          <div className="resource-modal__badge">MEDITACIÓN GUIADA</div>
          <h2>{selectedResource.title}</h2>
          <p className="resource-modal__description">{selectedResource.description}</p>

          <div className="meditation-player">
            <div className="meditation-player__disc-wrap">
              <div className={`meditation-player__disc ${mediaPlaying ? 'meditation-player__disc--spinning' : ''}`}>
                🧘
              </div>
            </div>

            <div className="meditation-player__waveform">
              {[...Array(20)].map((_, idx) => (
                <div
                  key={idx}
                  className={`wave-bar ${mediaPlaying ? 'wave-bar--animating' : ''}`}
                  style={{
                    height: `${Math.sin(idx * 0.5) * 20 + 25}px`,
                    animationDelay: `${idx * 0.08}s`
                  }}
                />
              ))}
            </div>

            <div className="meditation-player__time">
              <span>{formatMinSec(mediaTime)}</span>
              <span>05:00</span>
            </div>

            <div className="meditation-player__progress-bar">
              <div
                className="meditation-player__progress-fill"
                style={{ width: `${(mediaTime / 300) * 100}%` }}
              />
            </div>

            <div className="meditation-player__controls">
              <button
                className="meditation-player__control-btn"
                onClick={() => setMediaPlaying(!mediaPlaying)}
                aria-label={mediaPlaying ? 'Pausar meditación' : 'Reproducir meditación'}
              >
                {mediaPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (isGratitude) {
      const handleSaveGratitude = (e) => {
        e.preventDefault();
        if (!gratitude1.trim() || !gratitude2.trim() || !gratitude3.trim()) return;

        const existing = JSON.parse(localStorage.getItem('mindcheck_gratitude_entries') || '[]');
        existing.push({
          date: new Date().toISOString(),
          items: [gratitude1, gratitude2, gratitude3]
        });
        localStorage.setItem('mindcheck_gratitude_entries', JSON.stringify(existing));
        setGratitudeSaved(true);
      };

      return (
        <div className="resource-modal__gratitude">
          <div className="resource-modal__badge">EJERCICIO DE GRATITUD</div>
          <h2>{selectedResource.title}</h2>
          <p className="resource-modal__description">{selectedResource.description}</p>

          {gratitudeSaved ? (
            <div className="gratitude-success animate-scale-in">
              <CheckCircle size={48} className="gratitude-success__icon" />
              <h3>¡Excelente ejercicio!</h3>
              <p>Tomarte el tiempo para reconocer las cosas buenas, por pequeñas que sean, reentrena tu cerebro para enfocarse en lo positivo y reduce los niveles de cortisol.</p>
              <button className="resource-modal__btn" onClick={handleCloseModal}>
                Cerrar Recurso
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveGratitude} className="gratitude-form">
              <p className="gratitude-form__intro">Escribe 3 cosas por las que te sientas agradecido/a hoy:</p>

              <div className="gratitude-form__group">
                <span className="gratitude-form__number">1</span>
                <input
                  type="text"
                  value={gratitude1}
                  onChange={(e) => setGratitude1(e.target.value)}
                  placeholder="Ej: El café de la mañana, hablar con un amigo..."
                  required
                  maxLength={100}
                  className="gratitude-form__input"
                  id="gratitude-input-1"
                />
              </div>

              <div className="gratitude-form__group">
                <span className="gratitude-form__number">2</span>
                <input
                  type="text"
                  value={gratitude2}
                  onChange={(e) => setGratitude2(e.target.value)}
                  placeholder="Ej: Terminar un trabajo a tiempo..."
                  required
                  maxLength={100}
                  className="gratitude-form__input"
                  id="gratitude-input-2"
                />
              </div>

              <div className="gratitude-form__group">
                <span className="gratitude-form__number">3</span>
                <input
                  type="text"
                  value={gratitude3}
                  onChange={(e) => setGratitude3(e.target.value)}
                  placeholder="Ej: Que el día estuvo soleado..."
                  required
                  maxLength={100}
                  className="gratitude-form__input"
                  id="gratitude-input-3"
                />
              </div>

              <button
                type="submit"
                className="resource-modal__btn"
                disabled={!gratitude1.trim() || !gratitude2.trim() || !gratitude3.trim()}
                id="gratitude-submit-btn"
              >
                Guardar Registro
              </button>
            </form>
          )}
        </div>
      );
    }

    if (isAcademic) {
      return (
        <div className="resource-modal__article">
          <div className="resource-modal__badge">ARTÍCULO / GUÍA</div>
          <h2>{selectedResource.title}</h2>
          <p className="resource-modal__description">{selectedResource.description}</p>

          <div className="article-content">
            <section className="article-section">
              <h3>1. La Técnica Pomodoro</h3>
              <p>Divide tu tiempo de estudio en bloques de <strong>25 minutos de enfoque absoluto</strong>, seguidos de <strong>5 minutos de descanso</strong>. Después de 4 ciclos, toma un descanso más largo de 15 a 30 minutos.</p>
              <div className="article-tip">💡 Evita revisar el celular durante los 25 minutos de estudio. Apaga las notificaciones.</div>
            </section>

            <section className="article-section">
              <h3>2. Planificación por Bloques (Time Blocking)</h3>
              <p>Asigna tareas específicas a horas específicas del día en lugar de usar una simple lista de tareas pendientes. Esto reduce la fatiga de decisión y te da claridad mental sobre cuándo trabajarás y cuándo descansarás.</p>
            </section>

            <section className="article-section">
              <h3>3. La Regla de los 2 Minutos</h3>
              <p>Si una tarea académica o pendiente toma menos de 2 minutos completarla, hazla de inmediato. Acumular pequeñas tareas genera ruido mental y estrés innecesario.</p>
            </section>

            <section className="article-section">
              <h3>4. Establece Límites Saludables</h3>
              <p>Estudiar de corrido sin pausas disminuye tu retención y aumenta tu ansiedad. Integra descansos activos para caminar, estirarte o tomar agua cada 90 minutos.</p>
            </section>
          </div>

          <button className="resource-modal__btn" onClick={handleCloseModal}>
            Entendido, finalizar lectura
          </button>
        </div>
      );
    }

    // Generic fallback for custom backend resources
    return (
      <div className="resource-modal__generic">
        <div className="resource-modal__badge">RECURSO GENERAL</div>
        <h2>{selectedResource.title}</h2>
        <div className="resource-modal__body">
          <p className="resource-modal__description-large">{selectedResource.description}</p>
          <div className="generic-info-box">
            <h3>⏱ Duración estimada:</h3>
            <p>{selectedResource.duration || 'Variable'}</p>
            <h3>🏷 Emociones asociadas:</h3>
            <div className="resource-full-card__tags">
              {selectedResource.emotionTags.map((tag) => <span key={tag} className="resource-full-card__tag">{tag}</span>)}
            </div>
          </div>
          <button className="resource-modal__btn" onClick={handleCloseModal}>
            Aceptar
          </button>
        </div>
      </div>
    );
  }

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
                <button 
                  className="resource-full-card__btn"
                  onClick={() => setSelectedResource(resource)}
                  id={`btn-resource-${resource.id}`}
                >
                  Comenzar
                </button>
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

      {/* Interactive Detail Modal Overlay */}
      {selectedResource && (
        <div className="resource-modal-overlay animate-fade-in" onClick={handleCloseModal}>
          <div className="resource-modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button className="resource-modal-close" onClick={handleCloseModal} aria-label="Cerrar modal" id="btn-close-resource-modal">
              <X size={20} />
            </button>
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
}
