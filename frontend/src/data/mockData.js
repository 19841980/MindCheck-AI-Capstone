/**
 * Mock data for MindCheck application.
 * Simulates backend responses for development and demonstration purposes.
 * In production, this data comes from the FastAPI backend + Supabase.
 */

export const MOCK_USER = {
  id: 'usr-001',
  firstName: 'Valentina',
  lastName: 'Rojas',
  initials: 'VR',
  email: 'valentina.rojas@duocuc.cl',
  sede: 'Santiago',
  carrera: 'Ingeniería',
  avatarUrl: null,
};

export const MOCK_WELLBEING_STATS = {
  weeklyScore: 74,
  weeklyScoreChange: 8,
  registrationStreak: 5,
  streakDays: ['L', 'M', 'X', 'J', 'V'],
  lastAnalysis: {
    sentimentScore: -0.58,
    dominantEmotion: 'Ansiedad',
    riskLevel: 'Moderado',
    timestamp: '2025-05-13T22:15:00',
    resourceCount: 2,
  },
};

export const MOCK_EMOTION_TREND_7D = [
  { date: '08 May', score: -0.3 },
  { date: '09 May', score: -0.1 },
  { date: '10 May', score: 0.2 },
  { date: '11 May', score: 0.4 },
  { date: '12 May', score: 0.3 },
  { date: '13 May', score: 0.6 },
  { date: '14 May', score: 0.55 },
];

export const MOCK_EMOTION_TREND_30D = [
  { date: '14 Abr', score: -0.5 },
  { date: '17 Abr', score: -0.3 },
  { date: '20 Abr', score: -0.6 },
  { date: '23 Abr', score: -0.2 },
  { date: '26 Abr', score: 0.1 },
  { date: '29 Abr', score: -0.1 },
  { date: '02 May', score: 0.2 },
  { date: '05 May', score: 0.0 },
  { date: '08 May', score: -0.3 },
  { date: '11 May', score: 0.4 },
  { date: '14 May', score: 0.55 },
];

export const MOCK_EMOTION_TREND_90D = [
  { date: 'Feb', score: -0.6 },
  { date: 'Mar 1', score: -0.4 },
  { date: 'Mar 15', score: -0.3 },
  { date: 'Abr 1', score: -0.5 },
  { date: 'Abr 15', score: -0.1 },
  { date: 'May 1', score: 0.1 },
  { date: 'May 14', score: 0.55 },
];

export const MOCK_FREQUENT_EMOTIONS = [
  { emotion: 'Ansiedad', percentage: 62, color: 'var(--color-emotion-ansiedad)' },
  { emotion: 'Calma', percentage: 54, color: 'var(--color-emotion-calma)' },
  { emotion: 'Estrés', percentage: 38, color: 'var(--color-emotion-estres)' },
  { emotion: 'Alegría', percentage: 30, color: 'var(--color-emotion-alegria)' },
  { emotion: 'Tristeza', percentage: 18, color: 'var(--color-emotion-tristeza)' },
];

export const MOCK_JOURNAL_ENTRIES = [
  {
    id: 'entry-001',
    content: 'Hoy tuve el examen de cálculo y la verdad no me fue tan bien como esperaba. Siento que me bloqueé en el momento y eso me tiene un poco ansioso...',
    sentimentScore: -0.6,
    dominantEmotion: 'Ansiedad',
    riskLevel: 'Moderado',
    keywords: ['examen', 'me bloqueé', 'ansioso'],
    createdAt: '2025-05-13T22:15:00',
    recommendations: ['Técnica de respiración 4-7-8', 'Planificación de estudio por bloques'],
  },
  {
    id: 'entry-002',
    content: 'Terminé el trabajo de historia, me siento más tranquila. Creo que mañana será un buen día. Dormí bien y eso me ayudó bastante...',
    sentimentScore: 0.7,
    dominantEmotion: 'Calma',
    riskLevel: 'Bajo',
    keywords: ['terminé', 'tranquila', 'dormí bien'],
    createdAt: '2025-05-12T21:40:00',
    recommendations: ['Continúa con tu rutina de sueño', 'Registro de gratitud'],
  },
  {
    id: 'entry-003',
    content: 'Día complicado. Tuve problemas con un compañero de grupo y no pudimos avanzar en el proyecto. Me siento frustrada y estresada por los plazos...',
    sentimentScore: -0.45,
    dominantEmotion: 'Frustración',
    riskLevel: 'Moderado',
    keywords: ['problemas', 'frustrada', 'estresada', 'plazos'],
    createdAt: '2025-05-11T20:30:00',
    recommendations: ['Comunicación asertiva', 'Técnica Pomodoro para gestión del tiempo'],
  },
  {
    id: 'entry-004',
    content: 'Hoy fue un gran día. Pasé la presentación oral que tanto me preocupaba y el profesor me felicitó. Me siento orgullosa de mi esfuerzo.',
    sentimentScore: 0.85,
    dominantEmotion: 'Alegría',
    riskLevel: 'Bajo',
    keywords: ['gran día', 'felicitó', 'orgullosa'],
    createdAt: '2025-05-10T19:00:00',
    recommendations: ['Celebra tus logros', 'Escribe sobre lo que te hizo sentir bien'],
  },
  {
    id: 'entry-005',
    content: 'No dormí bien anoche y hoy me costó concentrarme en clases. Estoy preocupada por las notas finales y siento mucha presión.',
    sentimentScore: -0.55,
    dominantEmotion: 'Estrés',
    riskLevel: 'Moderado',
    keywords: ['no dormí', 'concentrarme', 'presión', 'preocupada'],
    createdAt: '2025-05-09T21:15:00',
    recommendations: ['Higiene del sueño', 'Ejercicio de respiración diafragmática'],
  },
];

export const MOCK_ALERTS = [
  {
    id: 'alert-001',
    type: 'moderate',
    title: 'Alerta moderada',
    message: '4 registros negativos esta semana. ¿Te gustaría hablar con alguien?',
    actionLabel: 'Contactar bienestar Duoc UC',
    actionUrl: '#',
    triggeredAt: '2025-05-14T09:00:00',
    acknowledged: false,
  },
];

export const MOCK_RESOURCES = [
  {
    id: 'res-001',
    title: 'Respiración 4-7-8',
    description: 'Técnica de respiración para reducir ansiedad en 3 minutos.',
    type: 'exercise',
    duration: '3 minutos',
    emotionTags: ['Ansiedad'],
    icon: '😮‍💨',
    visited: false,
  },
  {
    id: 'res-002',
    title: 'Mindfulness express',
    description: 'Meditación guiada breve para momentos de estrés.',
    type: 'meditation',
    duration: '5 minutos',
    emotionTags: ['Estrés'],
    icon: '🧘',
    visited: false,
  },
  {
    id: 'res-003',
    title: 'Gestión académica',
    description: 'Artículo sobre técnicas para manejar la carga académica.',
    type: 'article',
    duration: '4 min lectura',
    emotionTags: ['Estrés', 'Ansiedad'],
    icon: '📚',
    visited: true,
  },
  {
    id: 'res-004',
    title: 'Ejercicio de gratitud',
    description: 'Escribe 3 cosas por las que estás agradecido/a hoy.',
    type: 'exercise',
    duration: '5 minutos',
    emotionTags: ['Tristeza', 'Calma'],
    icon: '🙏',
    visited: false,
  },
  {
    id: 'res-005',
    title: 'Respiración diafragmática',
    description: 'Aprende la técnica de respiración profunda para calmar tu cuerpo.',
    type: 'exercise',
    duration: '4 minutos',
    emotionTags: ['Ansiedad', 'Estrés'],
    icon: '💨',
    visited: false,
  },
  {
    id: 'res-006',
    title: 'Línea de apoyo Duoc UC',
    description: 'Contacto directo con el equipo de bienestar estudiantil.',
    type: 'contact',
    duration: 'Disponible 24/7',
    emotionTags: ['Crisis'],
    icon: '📞',
    visited: false,
  },
];

export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-001',
    type: 'reminder',
    title: 'Recordatorio diario',
    message: '¿Cómo te sientes hoy? Registra tu bitácora emocional.',
    timestamp: '2025-05-14T20:00:00',
    read: false,
  },
  {
    id: 'notif-002',
    type: 'alert',
    title: 'Alerta moderada',
    message: 'Hemos notado registros negativos recientes. Revisa tus recursos de apoyo.',
    timestamp: '2025-05-14T09:00:00',
    read: false,
  },
];

/**
 * Formats a date string into a human-readable Spanish format.
 * @param {string} dateString - ISO 8601 date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Formats a date string into relative format (Ayer, Lunes, etc.)
 */
export function formatRelativeDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';

  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  if (diffDays < 7) return days[date.getDay()];

  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

/**
 * Formats time from ISO string.
 */
export function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}
