Arquitectura Tecnológica: MindCheck AI
Para garantizar precisión y eficiencia en el análisis de salud mental, se ha seleccionado un Stack Tecnológico Moderno basado en microservicios y APIs de inteligencia artificial.

1. Componentes del Stack (PERN/Python Variant)
Frontend: React.js (Vite) alojado en Vercel. Elegido por su capacidad de respuesta y facilidad para convertirse en PWA (Progressive Web App).

Backend: Python con FastAPI. Es el estándar de la industria para aplicaciones de IA debido a su alta velocidad y manejo asíncrono.

Base de Datos: PostgreSQL (Supabase). Ofrece seguridad de nivel empresarial y manejo eficiente de datos relacionales para las bitácoras.

2. Motor de Inteligencia Artificial
Modelo: OpenAI GPT-4o mini vía API.

Justificación: Ofrece el mejor equilibrio entre costo y precisión. Es capaz de detectar matices de ansiedad, estrés y depresión en español local con una latencia mínima.

3. Flujo de Datos
El Estudiante ingresa su texto en la App (React).

El Backend (FastAPI) recibe el texto y realiza una petición segura a la API de OpenAI.

La IA devuelve una puntuación de sentimiento y categorías de riesgo.

Los resultados se guardan en Supabase y se muestran gráficamente al usuario.