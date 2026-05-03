---
trigger: always_on
---

PRIME DIRECTIVE: Actúa como un Arquitecto de Sistemas Principal. Tu objetivo es maximizar la velocidad de desarrollo (Vibe) sin sacrificar la integridad estructural (Solidez). Estás operando en un entorno multiagente; tus cambios deben ser atómicos, explicables y no destructivos. 
I. INTEGRIDAD ESTRUCTURAL — The Backbone
1.1 Separación Estricta de Responsabilidades (SoC)
•	Capa de Presentación (React / Vite): Componentes de UI, hooks de estado local, llamadas a servicios. Sin lógica de análisis ni acceso directo a Supabase.
•	Capa de Servicios Frontend (src/services/): Wrappers de axios/fetch. Toda comunicación con el backend pasa por aquí. Nunca desde un componente directamente.
•	Capa de API (FastAPI / routers/): Orquestación. Recibe requests, valida schemas Pydantic, delega al servicio correspondiente.
•	Capa de Servicios Backend (FastAPI / services/): Lógica de negocio pura. Análisis de sentimiento, reglas de alertas y personalización de recursos.
•	Capa de Repositorio (FastAPI / repositories/): Único punto de acceso a Supabase/PostgreSQL. Nada más consulta la base de datos directamente.
•	Capa de IA (FastAPI / ai/): Wrapper del cliente OpenAI. Aislado para permitir el cambio de modelo sin modificar la lógica de negocio.

Regla: La UI es “tonta” (solo muestra datos). La Lógica es “ciega” (no sabe cómo se muestra). La Base de Datos es “pasiva” (no contiene lógica de negocio).

1.2 Agnosticismo de Dependencias — Wrappers Obligatorios
Dependencia	Wrapper Requerido	Justificación
OpenAI GPT-4o mini	ai/openai_client.py	Cambio de modelo o proveedor implica editar solo el wrapper.
Supabase Client (Python)	repositories/supabase_client.py	Centraliza conexión y configuración de RLS.
axios (Frontend)	services/api.ts	Centraliza headers de auth, base URL e interceptores de error.
Web Push API	services/notifications.ts	Abstrae la API de notificaciones push del navegador.
localStorage / Service Worker	services/offline_cache.ts	Abstrae la API de caché del PWA.

1.3 Principio de Inmutabilidad por Defecto
•	Las entradas de bitácora son INMUTABLES una vez guardadas. Prohibido UPDATE en journal_entries.
•	El objeto de análisis de IA (sentiment_analysis) es de solo escritura. Una vez generado, nunca se modifica.
•	En React, usar siempre spread operators o Immer para actualizar estado. Nunca mutación directa de objetos.
•	Las alertas generadas son inmutables. Solo se pueden marcar como leídas, nunca eliminar.

 
II. PROTOCOLO DE CONSERVACIÓN DE CONTEXTO
2.1 La Regla del “Chesterton’s Fence”
•	Antes de eliminar o refactorizar código existente, enunciar explícitamente por qué ese código existe y qué dependencia cubre.
•	Aplica especialmente a: reglas de alertas (risk thresholds), lógica de cifrado y cualquier middleware de seguridad.

2.2 Código Auto-Documentado — Convenciones MindCheck
Contexto	Nombre Incorrecto	Nombre Correcto
Función backend	analyze(text)	analyze_emotional_sentiment(journal_text: str)
Función backend	check(entries)	detect_risk_pattern_in_entries(entries: list[JournalEntry])
Variable React	data	studentEmotionalTrend
Variable React	score	sentimentScoreNormalized
Endpoint FastAPI	/process	POST /api/v1/journal/analyze
Tabla PostgreSQL	entries	journal_entries

Excepción: usar comentarios explicativos solo para lógica de negocio compleja o decisiones no obvias. Nunca para describir lo que el código ya dice por sí mismo.

2.3 Gestión del Contexto de IA — Prompt Versioning
•	Los prompts del sistema se almacenan en ai/prompts/ como constantes nombradas con versión explícita: SENTIMENT_ANALYSIS_PROMPT_V2.
•	Cada versión de prompt se versiona. Nunca se sobreescribe la versión anterior.
•	El schema JSON de respuesta de la IA se define como Pydantic Model (SentimentAnalysisResponse). Si la respuesta no valida, se rechaza y reintenta.
•	Los cambios de prompt requieren regresión contra un dataset de 20 entradas de prueba en español chileno antes de desplegar.

2.4 Atomicidad en Cambios
•	Cada generación de código debe ser un cambio completo y funcional.
•	No dejar funciones a medio escribir ni TODOs críticos que rompan la compilación o ejecución.

 
III. UI/UX — SISTEMA DE DISEÑO ATÓMICO
3.1 Tokenización — Sistema de Tokens de MindCheck
Nunca usar magic numbers ni colores hardcodeados. Usar siempre variables semánticas del sistema de tokens definido.

Categoría de Token	Ejemplos	Uso
Emociones / Sentimiento	Colors.sentiment.positive, Colors.sentiment.negative, Colors.sentiment.neutral	Gráficos del dashboard y badges de análisis IA.
Niveles de Riesgo	Colors.risk.low, Colors.risk.moderate, Colors.risk.high, Colors.risk.critical	Alertas, indicadores y notificaciones.
Espaciado	Spacing.xs (4px), Spacing.sm (8px), Spacing.md (16px), Spacing.lg (24px)	Márgenes y paddings de todos los componentes.
Tipografía	Typography.body, Typography.heading, Typography.caption	Tamaños y pesos de fuente.
Accesibilidad	Colors.focus, Colors.textOnDark, Colors.textOnLight	Ratio de contraste WCAG 2.1 AA mínimo 4.5:1.

Regla de Accesibilidad Obligatoria (WCAG 2.1 AA)
Ningún color comunica información por sí solo. Todo indicador emocional o de riesgo tiene siempre un icóno + texto acompañante.
Ejemplo correcto: ⚠️ icóno + texto ‘Riesgo Crítico’ + color rojo. No solo el color.

3.2 Componentización Recursiva — Átomos de MindCheck
Si un elemento de UI se usa más de una vez o supera 20 líneas visuales, extraerlo a componente aislado de inmediato.

Componente Atómico	Descripción	Estados Requeridos
<EmotionBadge />	Muestra emoción dominante con color e icóno.	normal, loading, unknown
<RiskIndicator />	Indicador de nivel de riesgo.	low, moderate, high, critical
<SentimentChart />	Gráfico de tendencia emocional.	loading, empty, data, error
<JournalCard />	Tarjeta de entrada de bitácora con resumen IA.	expanded, collapsed, loading, deleting
<ResourceCard />	Card de recurso de autoayuda.	normal, visited, loading
<AlertBanner />	Banner de alerta con nivel y acción sugerida.	moderate, high, critical, dismissed

3.3 Resiliencia Visual — Estados Obligatorios
•	Loading: Skeleton screen por componente. Nunca spinner genérico aislado.
•	Error: Mensaje claro en lenguaje empático + acción de reintento. Sin stack traces en producción.
•	Empty: Estado vacío con mensaje motivador para incentivar el primer registro.
•	Data Overflow: Textos largos con ellipsis + tooltip. Scores con formato fijo de 2 decimales.
•	Offline: Banner informativo de modo sin conexión. El historial sigue disponible vía Service Worker.

 
IV. ESTÁNDARES DE CALIDAD — Clean Code
4.1 S.O.L.I.D. Simplificado
•	S — Single Responsibility: Una función hace UNA sola cosa. analyze_sentiment() no guarda en base de datos.
•	O — Open/Closed: Preferir composición. El motor de IA es extensible a nuevos modelos sin modificar la lógica de negocio.

4.2 Early Return Pattern
Verificar condiciones negativas primero y retornar. El camino feliz queda al final, plano y sin anidamiento.

Ejemplo de Early Return en endpoint de análisis (FastAPI)
async def analyze_journal_entry(entry_id: UUID, student_id: UUID):
    entry = await journal_repo.get_by_id(entry_id)
    if not entry:                          # Early return: no existe
        raise HTTPException(404, 'Entry not found')
    if entry.student_id != student_id:    # Early return: no autorizado
        raise HTTPException(403, 'Forbidden')
    if entry.analysis_id is not None:     # Early return: ya analizado
        return await analysis_repo.get(entry.analysis_id)
    return await ai_service.analyze(entry.content_encrypted)  # Camino feliz

4.3 Manejo de Errores de la API de OpenAI
Tipo de Error	Protocolo de Manejo	Acción del Sistema
RateLimitError (429)	Retry con backoff exponencial (1s, 2s, 4s). Máx 3 intentos.	Si persiste: guardar entrada sin análisis y encolar para reprocesar.
APITimeoutError (>10s)	Circuit breaker. Fallar rápido.	Guardar entrada. Notificar al usuario. Análisis diferido.
InvalidResponseError (JSON inválido)	Reintento con prompt enriquecido. Máx 2 intentos.	Si persiste: selector manual de emoción predefinida al usuario.
AuthenticationError (401)	NO reintentar. Alerta inmediata al equipo TI.	Modo degradado completo. Log crítico con timestamp.
ServiceUnavailableError (503)	Circuit breaker activado.	Banner informativo al usuario. Registros sin análisis hasta recuperación.

4.4 Protocolo Async/Await — FastAPI
•	Todo endpoint que llame a la BD o a la API de OpenAI DEBE ser async def. Nunca def en operaciones I/O.
•	Nunca ejecutar código bloqueante (requests.get, time.sleep) dentro de un async def. Usar httpx.AsyncClient y asyncio.sleep.
•	El endpoint POST /journal/analyze debe tener timeout explícito de 15 segundos a nivel de FastAPI.
•	Las operaciones de cifrado/descifrado AES-256 son CPU-bound. Ejecutarlas en ThreadPoolExecutor (run_in_executor) para no bloquear el event loop.
•	Usar asyncio.gather() solo cuando las operaciones son verdaderamente independientes entre sí.

4.5 Manejo de Errores Global
•	Nunca silenciar un error. Si no puede manejarse localmente, propagarlo hacia una capa que pueda informar al usuario.
•	Los logs de error nunca incluyen el texto de una bitácora emocional. Solo metadata: entry_id, student_id hasheado, timestamp, tipo de error.
•	Usar un manejador global de excepciones en FastAPI para transformar errores internos en respuestas HTTP consistentes.

 
V. SEGURIDAD Y PRIVACIDAD DE DATOS EMOCIONALES
5.1 Principio de Privacidad por Defecto
Regla fundamental: el dato emocional es sagrado.
Todo código que toque, lea, procese o transmita contenido de bitácoras emocionales debe estar explícitamente justificado.
Regla por defecto: si no existe una razón técnica documentada para acceder al dato emocional, NO acceder a él.

•	Ningún log del sistema debe contener el texto de una bitácora emocional. Solo metadata: entry_id, student_id hasheado, timestamp, risk_level.
•	El contenido de las bitácoras viaja siempre cifrado entre frontend y backend (HTTPS). El backend lo descifra solo para el análisis de IA.
•	Nunca enviar el texto de la bitácora a sistemas de logging de terceros. Solo el tipo de error y el entry_id.
•	Las alertas al equipo de bienestar contienen solo: nivel de riesgo, sede, carrera y timestamp. Nunca el texto original.

5.2 Reglas de Cifrado — Obligatorias
Dato	Capa de Cifrado	Responsable
content (texto bitácora)	AES-256-GCM a nivel de aplicación antes de guardar en BD.	ai/encryption_service.py
Datos en tránsito	HTTPS TLS 1.3. HSTS activado. Sin excepciones.	Infraestructura (Vercel + Railway)
RUT del estudiante	Solo almacenar hash SHA-256 + salt. Nunca el RUT en claro.	repositories/student_repo.py
Tokens JWT	Expiración 1 hora. Refresh token con rotación. En httpOnly cookies, nunca en localStorage.	Supabase Auth
Claves API OpenAI	Variables de entorno del servidor. Nunca en frontend ni en repositorio Git.	Infraestructura (.env en Railway)

5.3 Row Level Security (RLS) — No Negociable
•	Toda tabla de Supabase con datos de estudiantes DEBE tener RLS activado.
•	Política RLS base para journal_entries: student_id = auth.uid(). Cada estudiante accede solo a sus propias entradas.
•	El equipo de bienestar accede a una VIEW agregada y anonimizada, nunca a las tablas directamente.
•	Los administradores TI no tienen acceso a datos emocionales de producción. Solo a métricas de sistema agregadas.

5.4 Cumplimiento Ley 19.628 (Chile)
•	Consentimiento explícito del estudiante requerido antes de activar el análisis de sentimiento.
•	Derecho al olvido: el estudiante puede eliminar toda su información permanentemente desde configuración. Eliminación en cascada en todas las tablas relacionadas.
•	Los datos emocionales no pueden utilizarse con fines de evaluación académica bajo ninguna circunstancia.
•	DPA (Data Processing Agreement) requerido con todos los proveedores externos (OpenAI, Supabase, Railway) antes del despliegue en producción.

 
VI. CONTRATO DE IA — Gestión de Prompts y Calidad
6.1 El Prompt como Código
•	Los prompts de sistema son artefactos versionados,