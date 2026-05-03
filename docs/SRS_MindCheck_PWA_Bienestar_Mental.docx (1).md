  
**DUOC UC**

Vicerrectoría Académica — Dirección de Bienestar Estudiantil

**DOCUMENTO DE ESPECIFICACIÓN DE REQUERIMIENTOS DE SOFTWARE**

***Aplicación Web Progresiva para el Bienestar Mental Estudiantil***

| Campo | Detalle |
| ----- | ----- |
| Código del Proyecto | DUC-BWM-2025-001 |
| Versión | 1.0.0 |
| Fecha de Emisión | Mayo 2025 |
| Estado del Documento | Borrador Aprobado |
| Clasificación | Confidencial — Uso Interno |
| Estándar de Referencia | IEEE 830-1998 / ISO/IEC 25010 |

# **1\. INTRODUCCIÓN**

## **1.1 Propósito del Documento**

El presente Documento de Especificación de Requerimientos de Software (SRS) define de manera formal y exhaustiva los requisitos funcionales, no funcionales, restricciones y criterios de aceptación para el desarrollo de una Aplicación Web Progresiva (PWA) orientada al bienestar mental de los estudiantes de Duoc UC.

Este documento constituye el contrato base entre los equipos de desarrollo, las unidades de bienestar estudiantil y la dirección académica, estableciendo el alcance, la arquitectura tecnológica y las expectativas de calidad del sistema.

## **1.2 Alcance del Sistema**

La PWA de Bienestar Mental, denominada internamente “MindCheck”, es un sistema de monitoreo preventivo del estado emocional estudiantil que opera de la siguiente manera:

* Permite a los estudiantes registrar bitácoras emocionales en texto libre en español.

* Procesa estas entradas mediante la API de OpenAI GPT-4o mini para extraer sentimientos, emociones dominantes e indicadores de riesgo.

* Genera visualizaciones personales de tendencias emocionales a lo largo del tiempo.

* Dispara alertas tempranas automáticas cuando detecta patrones de riesgo psicológico.

* Ofrece recursos de autoayuda adaptados al estado emocional actual del estudiante.

* Garantiza la privacidad total de los datos emocionales mediante cifrado y control de acceso.

| Nota de Alcance Este sistema NO reemplaza la atención psicológica profesional. Es una herramienta de detección temprana y apoyo preventivo que complementa los servicios de bienestar institucional existentes. |
| :---- |

## **1.3 Definiciones, Acrónimos y Abreviaturas**

| Término / Acrónimo | Definición |
| ----- | ----- |
| PWA | Progressive Web App — Aplicación Web Progresiva con capacidades nativas |
| SRS | Software Requirements Specification — Especificación de Requerimientos |
| GPT-4o mini | Modelo de lenguaje grande de OpenAI optimizado para costo-eficiencia |
| NLP | Natural Language Processing — Procesamiento de Lenguaje Natural |
| JWT | JSON Web Token — estándar de autenticación stateless |
| HTTPS | HyperText Transfer Protocol Secure — protocolo cifrado HTTP |
| CI/CD | Continuous Integration / Continuous Deployment |
| RLS | Row Level Security — seguridad a nivel de fila en PostgreSQL |
| CORS | Cross-Origin Resource Sharing — política de acceso entre dominios |
| Duoc UC | Instituto Profesional y Centro de Formación Técnica Duoc UC |

## **1.4 Referencias Normativas**

* IEEE Std 830-1998: Recommended Practice for Software Requirements Specifications

* ISO/IEC 25010:2011: Systems and Software Quality Requirements and Evaluation (SQuaRE)

* Ley 19.628 (Chile): Protección de la Vida Privada y datos personales

* WCAG 2.1 Level AA: Web Content Accessibility Guidelines

* OWASP Top 10 (2023): Vulnerabilidades críticas en aplicaciones web

* RFC 6749: OAuth 2.0 Authorization Framework

# **2\. DESCRIPCIÓN GENERAL DEL SISTEMA**

## **2.1 Perspectiva del Producto**

MindCheck se integra en el ecosistema digital de Duoc UC como un sistema web independiente que se conecta con la infraestructura existente de autenticación institucional. La aplicación opera como una PWA instalable en dispositivos móviles y de escritorio, sin requerir descarga desde tiendas de aplicaciones.

## **2.2 Objetivos del Sistema**

### **2.2.1 Objetivo General**

| Objetivo General del Proyecto Desarrollar una PWA que permita el monitoreo preventivo del bienestar emocional de los estudiantes de Duoc UC, mediante análisis de sentimiento basado en inteligencia artificial, generando alertas tempranas y recursos de autoayuda personalizados. |
| :---- |

### **2.2.2 Objetivos Específicos**

1. Implementar un sistema de registro de bitácora emocional en texto libre en español.

2. Integrar la API de OpenAI GPT-4o mini para análisis de sentimiento en español con respuestas estructuradas.

3. Desarrollar un dashboard personal con visualización de tendencias emocionales temporales.

4. Crear un sistema de alertas inteligentes ante patrones de riesgo detectados automáticamente.

5. Diseñar un módulo de recursos de autoayuda personalizados según el estado anímico.

6. Garantizar la privacidad y seguridad de los datos emocionales del estudiante mediante cifrado de extremo a extremo.

## **2.3 Características de los Usuarios**

| Tipo de Usuario | Descripción | Nivel Técnico | Permisos Principales |
| ----- | ----- | ----- | ----- |
| Estudiante | Alumno matriculado en Duoc UC. Usuario principal del sistema. | Bajo-Medio | Escribir bitácoras, ver dashboard propio, acceder a recursos |
| Psícólogo/Consejero | Profesional de bienestar institucional. Recibe alertas críticas. | Medio | Ver alertas anonimizadas, gestionar recursos, ver estadísticas agregadas |
| Administrador | Personal TI de Duoc UC. Gestiona la plataforma técnica. | Alto | Gestión de usuarios, configuración de umbrales, auditoría del sistema |

## **2.4 Restricciones y Supuestos**

### **2.4.1 Restricciones**

* El sistema debe operar exclusivamente en español chileno para el análisis de sentimiento.

* El presupuesto mensual de la API de OpenAI no debe superar USD $200 en estado productivo.

* El almacenamiento de datos emocionales no puede ser utilizado con fines de evaluación académica.

* La aplicación debe cumplir con la Ley 19.628 de protección de datos personales de Chile.

* Los datos de los estudiantes no pueden compartirse con terceros bajo ninguna circunstancia.

### **2.4.2 Supuestos**

* Los estudiantes disponen de acceso a internet y un dispositivo con navegador moderno.

* Duoc UC proveerá las credenciales institucionales para la autenticación SSO.

* El equipo de bienestar institucional validará los umbrales de alerta antes del despliegue.

# **3\. REQUERIMIENTOS FUNCIONALES**

## **3.1 Módulo de Autenticación y Acceso**

### **RF-01: Autenticación Institucional**

| Atributo | Descripción |
| ----- | ----- |
| ID | RF-01 |
| Título | Autenticación con credenciales Duoc UC |
| Prioridad | Crítica (Must Have) |
| Descripción | El sistema debe autenticar a los estudiantes mediante sus credenciales institucionales (RUT y contraseña del portal Duoc UC) a través de un mecanismo OAuth 2.0 / SSO. |
| Criterio de éxito | El estudiante accede al sistema en menos de 3 segundos con credenciales válidas. El sistema rechaza credenciales inválidas con mensaje claro. |
| Excepciones | Si el SSO no está disponible, se muestra mensaje de mantenimiento y se registra el incidente. |

### **RF-02: Gestión de Sesión**

El sistema debe gestionar sesiones de usuario con los siguientes comportamientos:

* Cierre automático de sesión tras 30 minutos de inactividad.

* Soporte múximo de una sesión activa por usuario.

* Generación y renovación de tokens JWT con expiración de 1 hora.

* Registro de log de acceso (IP, timestamp, dispositivo) para auditoría.

## **3.2 Módulo de Bitácora Emocional**

### **RF-03: Registro de Entradas Emocionales**

| Atributo | Descripción |
| ----- | ----- |
| ID | RF-03 |
| Título | Registro de bitácora emocional en texto libre |
| Prioridad | Crítica (Must Have) |
| Descripción | El estudiante puede escribir entradas de texto libre describiendo su estado emocional. El campo acepta entre 20 y 2.000 caracteres en español. El sistema registra automáticamente la fecha, hora y sede del estudiante. |
| Criterio de éxito | La entrada se guarda en base de datos cifrada en menos de 500ms. El análisis de IA se completa en menos de 3 segundos. |
| Validaciones | Mínimo 20 caracteres, máximo 2.000. Detección automática de idioma para advertir si no es español. |

### **RF-04: Análisis de Sentimiento con IA**

Por cada entrada de bitácora, el sistema debe realizar análisis mediante la API de OpenAI GPT-4o mini, extrayendo:

* Sentimiento global: Positivo / Neutro / Negativo con puntuación de \-1.0 a 1.0.

* Emoción dominante: ansiedad, tristeza, alegría, estrés, frustración, calma u otras.

* Nivel de riesgo: Bajo / Moderado / Alto / Crítico con justificación.

* Palabras clave emocionales identificadas en el texto.

* Recomendaciones personalizadas basadas en el estado detectado.

### **RF-05: Historial y Edición de Entradas**

* El estudiante puede visualizar su historial completo de bitácoras ordenado por fecha.

* Las entradas pueden eliminarse permanentemente por el propio estudiante.

* No se permite la edición de entradas pasadas para garantizar la integridad del análisis.

* El historial muestra el análisis de IA asociado a cada entrada.

## **3.3 Módulo de Dashboard Personal**

### **RF-06: Visualización de Tendencias Emocionales**

| Atributo | Descripción |
| ----- | ----- |
| ID | RF-06 |
| Título | Dashboard de tendencias emocionales personales |
| Prioridad | Alta (Should Have) |
| Descripción | El sistema presenta al estudiante un panel visual con gráficos de su evolución emocional en el tiempo. Incluye gráfico de línea de sentimiento semanal/mensual, gráfico de barras de emociones frecuentes, mapa de calor de actividad por día de la semana y resumen textual generado por IA. |
| Criterio de éxito | El dashboard carga completamente en menos de 2 segundos para historiales de hasta 365 entradas. |
| Filtros disponibles | Por rango de fechas (7, 14, 30, 90 días o personalizado), por emoción, por nivel de riesgo. |

### **RF-07: Indicadores de Bienestar**

* Puntuación de bienestar semanal (0-100) basada en el promedio de análisis de sentimiento.

* Racha de registros: contador de días consecutivos con al menos una entrada.

* Comparativa con la semana anterior con indicador de mejora o deterioro.

* Insight personalizado generado por IA con recomendación basada en el patrón detectado.

## **3.4 Módulo de Alertas Inteligentes**

### **RF-08: Detección de Patrones de Riesgo**

| Nivel de Riesgo | Criterios de Activación | Acción del Sistema |
| ----- | ----- | ----- |
| Bajo | Sentimiento negativo aislado sin indicadores críticos. | Ninguna alerta. Recursos preventivos sugeridos. |
| Moderado | 3 o más entradas negativas consecutivas en 7 días. | Notificación push al estudiante con recursos de apoyo. |
| Alto | 5+ entradas negativas en 7 días O detección de emociones de alta intensidad. | Alerta al estudiante \+ sugerencia de contactar bienestar. |
| Crítico | Detección de indicadores de autolesiones o crisis severa en el texto. | Alerta inmediata al equipo de bienestar \+ recursos de emergencia al estudiante. |

### **RF-09: Notificaciones y Comunicaciones**

* Notificaciones push web para alertas moderadas, altas y críticas.

* Recordatorios diarios configurables por el estudiante (hora preferida de registro).

* Correo electrónico institucional para alertas críticas al equipo de bienestar.

* Las notificaciones respetan la preferencia de no molestar del sistema operativo.

## **3.5 Módulo de Recursos de Autoayuda**

### **RF-10: Biblioteca de Recursos Personalizados**

| Atributo | Descripción |
| ----- | ----- |
| ID | RF-10 |
| Título | Recursos de autoayuda adaptados al estado emocional |
| Prioridad | Alta (Should Have) |
| Descripción | El sistema presenta recursos curados según el estado emocional detectado. Incluye técnicas de mindfulness, ejercicios de respiración, artículos psicoeducativos, videos de manejo del estrés y contactos del equipo de bienestar institucional. |
| Personalización | Los recursos se filtran según la emoción dominante y el nivel de riesgo detectados en la última entrada de bitácora. |
| Criterio de éxito | El sistema sugiere al menos 3 recursos relevantes dentro de los 5 segundos posteriores al análisis de IA. |

### **RF-11: Herramientas de Autocuidado Interactivas**

* Ejercicio de respiración guiada con animación (4-7-8 y respiración diafragmática).

* Temporizador de meditación con ambientes sonoros.

* Diario de gratitud estructurado como complemento a la bitácora emocional.

* Acceso directo a líneas de apoyo crítico (Fóno Salud Mental, Duoc UC Bienestar).

# **4\. REQUERIMIENTOS NO FUNCIONALES**

## **4.1 Rendimiento**

| ID | Requerimiento | Métrica Aceptable |
| ----- | ----- | ----- |
| RNF-01 | Tiempo de carga inicial de la aplicación (PWA). | \< 3 segundos en conexión 4G. |
| RNF-02 | Tiempo de respuesta del análisis de sentimiento (IA). | \< 5 segundos en el 95% de las solicitudes. |
| RNF-03 | Tiempo de carga del dashboard con 365 entradas. | \< 2 segundos. |
| RNF-04 | Disponibilidad del servicio (uptime). | \>= 99.5% mensual. |
| RNF-05 | Capacidad de usuarios concurrentes. | 500 usuarios simultáneos sin degradación de rendimiento. |
| RNF-06 | Tamaño del Service Worker cacheado. | \< 5 MB para funcionamiento offline básico. |

## **4.2 Seguridad y Privacidad**

| ID | Requerimiento | Implementación Técnica |
| ----- | ----- | ----- |
| RNF-07 | Cifrado de datos en tránsito. | HTTPS obligatorio con TLS 1.3. HSTS habilitado. |
| RNF-08 | Cifrado de datos en reposo. | AES-256 para campos emocionales en PostgreSQL. |
| RNF-09 | Control de acceso a datos. | Row Level Security (RLS) en Supabase. Cada usuario solo accede a sus datos. |
| RNF-10 | Protección contra ataques comunes. | Protección OWASP Top 10: SQLi, XSS, CSRF, inyección de prompt. |
| RNF-11 | Anonimización de datos para alertas. | Las alertas al equipo de bienestar no incluyen texto de bitácora, solo indicadores agrupados. |
| RNF-12 | Gestión de claves API. | Las claves de OpenAI se almacenan en variables de entorno del servidor. Nunca en frontend. |
| RNF-13 | Derecho al olvido. | El estudiante puede eliminar toda su información permanentemente desde la configuración. |

## **4.3 Usabilidad y Accesibilidad**

* WCAG 2.1 Nivel AA: contraste mínimo 4.5:1, navegación por teclado completa.

* Responsive Design: interfaz optimizada para móvil (320px), tablet (768px) y escritorio (1280px+).

* Modo oscuro: disponible para reducción de fatiga visual.

* Soporte PWA: instalable desde el navegador, funcionamiento offline básico (ver historial).

* Tiempo máximo para completar una entrada de bitácora: el flujo completo no debe requerir más de 5 minutos.

## **4.4 Mantenibilidad y Escalabilidad**

* Cobertura de pruebas unitarias: mínimo 80% en backend (FastAPI).

* Documentación de API automática: generada con OpenAPI/Swagger desde FastAPI.

* Arquitectura desacoplada: frontend y backend independientes para escalar horizontalmente.

* Logs estructurados: todos los eventos del sistema se registran en formato JSON para análisis posterior.

* Pipeline CI/CD: despliegue automático al fusionar ramas main en GitHub Actions.

# **5\. ARQUITECTURA Y STACK TECNOLÓGICO**

## **5.1 Stack Tecnológico**

| Capa | Tecnología Principal | Versión | Justificación |
| ----- | ----- | ----- | ----- |
| Frontend | React.js (Vite) | React 18 / Vite 5 | Alta velocidad de desarrollo, soporte nativo PWA, despliegue serverless gratuito en Vercel. |
| Backend | Python con FastAPI | Python 3.12 / FastAPI 0.110 | Estándar de la industria para servicios IA; asincrónico, tipado y de alto rendimiento. |
| Base de Datos | PostgreSQL (Supabase) | PostgreSQL 15 | Seguridad empresarial, manejo relacional eficiente, autenticación y RLS integrados. |
| Motor de IA | OpenAI GPT-4o mini API | gpt-4o-mini | Mejor relación costo-precisión para análisis de sentimiento en español local. |
| Despliegue Frontend | Vercel | N/A (SaaS) | CDN global, HTTPS automático, despliegue en segundos desde GitHub. |
| Despliegue Backend | Railway / Render | N/A (SaaS) | Plataforma PaaS con soporte Python, escalado automático y entornos de staging. |
| Autenticación | Supabase Auth \+ JWT | N/A | Integración nativa con PostgreSQL, soporte OAuth y tokens seguros. |
| PWA | Vite PWA Plugin \+ Workbox | Workbox 7 | Generación automática de Service Worker, caché offline y manifiesto. |

## **5.2 Diagrama de Arquitectura (Descripción)**

La arquitectura sigue el patrón Cliente-Servidor con separación clara de responsabilidades:

* Capa de Presentación (React PWA): Interfaz de usuario instalable. Se comunica con el backend exclusivamente mediante HTTPS REST API. Incluye Service Worker para soporte offline.

* Capa de API (FastAPI): Orquesta toda la lógica de negocio. Valida entradas, llama a la API de OpenAI, aplica reglas de negocio para alertas y accede a la base de datos mediante el ORM SQLAlchemy.

* Capa de Datos (Supabase/PostgreSQL): Almacenamiento persistente con RLS activado. Los datos emocionales están cifrados a nivel de aplicación antes de su persistencia.

* Servicios Externos: API de OpenAI GPT-4o mini (análisis de sentimiento), servicio de correo (alertas críticas), notificaciones push web.

## **5.3 Modelo de Datos Principal**

### **Entidades Principales**

| Entidad | Campos Principales | Relaciones |
| ----- | ----- | ----- |
| students | id (UUID), email, rut\_hash, sede, carrera, created\_at | 1:N con journal\_entries, alerts |
| journal\_entries | id, student\_id, content\_encrypted, sentiment\_score, dominant\_emotion, risk\_level, analysis\_json, created\_at | N:1 con students; 1:N con alerts |
| sentiment\_analysis | id, entry\_id, raw\_response, score, emotion, keywords\[\], risk\_level, recommendations\[\] | 1:1 con journal\_entries |
| alerts | id, student\_id, entry\_id, alert\_type, triggered\_at, acknowledged\_at, acknowledged\_by | N:1 con students |
| resources | id, title, type, emotion\_tags\[\], risk\_level\_tags\[\], url, active | M:N con journal\_entries (via recommendations) |

# **6\. REQUERIMIENTOS DE INTEGRACIÓN CON IA**

## **6.1 Configuración del Prompt del Sistema**

El prompt de sistema enviado a GPT-4o mini debe cumplir los siguientes lineamientos:

* Instrucción explícita de responder únicamente en formato JSON estructurado.

* Definición clara de los campos de salida: sentiment\_score, dominant\_emotion, risk\_level, keywords, recommendations.

* Instrucción de considerar el contexto cultural chileno en la interpretación de expresiones.

* Reglas explícitas para la detección de indicadores de crisis (sin proporcionar información dañina).

* Límite de tokens de salida: máximo 800 tokens por análisis para control de costos.

## **6.2 Estructura de Respuesta Esperada de la IA**

| Esquema JSON de Respuesta de GPT-4o mini {  "sentiment\_score": \-0.75,  "dominant\_emotion": "ansiedad",  "secondary\_emotions": \["estrés", "preocupación"\],  "risk\_level": "moderado",  "risk\_justification": "El estudiante expresa preocupación sostenida por evaluaciones.",  "keywords": \["examen", "no puedo", "agotado"\],  "recommendations": \[    "Técnica de respiración 4-7-8",    "Planificación de estudio por bloques"  \],  "crisis\_indicators": false} |
| :---- |

## **6.3 Manejo de Errores y Fallback de IA**

* Si la API de OpenAI no responde en 10 segundos: registrar la entrada sin análisis y encolar para reprocesar.

* Si la respuesta no es JSON válido: reintento automático hasta 2 veces con prompt enriquecido.

* Si el servicio de IA está caído: notificar al usuario y permitir el registro manual de emoción (selector predefinido).

* Circuit breaker: si el 30% de las solicitudes falla en 5 minutos, activar modo degradado automáticamente.

# **7\. REQUERIMIENTOS DE INTERFAZ DE USUARIO**

## **7.1 Pantallas Principales del Sistema**

| Pantalla | Descripción | Componentes Clave |
| ----- | ----- | ----- |
| Login / Acceso | Autenticación con credenciales Duoc UC. | Logo institucional, campo RUT, campo contraseña, botón acceso. |
| Inicio / Home | Vista principal post-login con resumen del estado. | Indicador de bienestar, última entrada, acceso rápido a nueva bitácora, recursos del día. |
| Nueva Bitácora | Formulario de registro emocional. | Área de texto libre, contador de caracteres, botón guardar, feedback de análisis IA. |
| Dashboard | Visualización de tendencias emocionales. | Gráfico de línea, gráfico de barras, mapa de calor, filtros de fecha. |
| Historial | Lista de entradas pasadas con resumen IA. | Tarjetas de entradas, filtros, opción de eliminar. |
| Recursos | Biblioteca de autoayuda personalizada. | Categorías de recursos, cards de contenido, herramientas interactivas. |
| Configuración | Preferencias del usuario. | Notificaciones, recordatorios, privacidad, eliminar cuenta. |

## **7.2 Principios de Diseño**

* Paleta de colores cálidos y tranquilizadores: tonos verdes y azules suaves con alto contraste.

* Tipografía legible: Inter o Nunito Sans, tamaño mínimo 16px en contenido principal.

* Microinteracciones: feedback visual inmediato en cada acción del usuario.

* Carga progresiva: skeleton screens durante la carga de datos para evitar sensación de lentitud.

* Lenguaje empático: mensajes de error y alertas en lenguaje claro y no alarmista.

# **8\. PLAN DE PRUEBAS Y CRITERIOS DE ACEPTACIÓN**

## **8.1 Estrategia de Pruebas**

| Tipo de Prueba | Herramienta | Cobertura Requerida |
| ----- | ----- | ----- |
| Pruebas Unitarias Backend | pytest \+ pytest-asyncio | \>=80% de líneas de código |
| Pruebas de Integración API | pytest \+ httpx TestClient | Todos los endpoints documentados |
| Pruebas de Componentes Frontend | Vitest \+ React Testing Library | \>=70% de componentes |
| Pruebas E2E | Playwright | Flujos críticos (login, registro bitácora, alertas) |
| Pruebas de Carga | Locust | 500 usuarios concurrentes sin degradación \>20% |
| Pruebas de Seguridad | OWASP ZAP \+ revisión manual | OWASP Top 10 sin vulnerabilidades críticas |
| Pruebas de Accesibilidad | axe-core \+ revisión manual | WCAG 2.1 AA compliance |

## **8.2 Criterios de Aceptación del Sistema**

7. Todos los requerimientos funcionales CRÍTICOS (RF-01 a RF-04, RF-08) deben estar implementados y pasar sus pruebas de aceptación.

8. El sistema debe procesar correctamente el 95% de entradas de análisis de sentimiento en español chileno.

9. Ninguna vulnerabilidad de nivel crítico u alto detectada en el escaneo de seguridad.

10. El tiempo de respuesta de la bitácora (fin a fin) debe ser \< 5 segundos en el 90% de las solicitudes en carga normal.

11. La aplicación debe ser instalable como PWA en Chrome, Firefox, Safari (iOS 16.4+) y Edge.

12. Al menos 10 estudiantes piloto deben completar el flujo completo sin asistencia técnica.

# **9\. CRONOGRAMA Y FASES DEL PROYECTO**

| Fase | Descripción | Duración | Entregables |
| ----- | ----- | ----- | ----- |
| Fase 0: Preparación | Configuración de entornos, repositorios, Supabase y claves API. | 1 semana | Entornos dev/staging listos, repositorio GitHub estructurado. |
| Fase 1: Autenticación | Login institucional, JWT, modelo de datos base. | 2 semanas | RF-01, RF-02 completos. Pruebas de autenticación pasando. |
| Fase 2: Bitácora \+ IA | Registro de entradas y análisis GPT-4o mini. | 3 semanas | RF-03, RF-04, RF-05. Análisis IA funcionando en staging. |
| Fase 3: Dashboard | Visualizaciones y tendencias emocionales. | 2 semanas | RF-06, RF-07. Dashboard con datos reales. |
| Fase 4: Alertas | Detección de riesgos y notificaciones. | 2 semanas | RF-08, RF-09. Alertas en todos los niveles de riesgo. |
| Fase 5: Recursos | Biblioteca de autoayuda y herramientas. | 2 semanas | RF-10, RF-11. Módulo de recursos completo. |
| Fase 6: PWA \+ QA | Service Worker, modo offline, pruebas de carga y seguridad. | 2 semanas | Aplicación instalable, pruebas OWASP, Lighthouse \>= 90\. |
| Fase 7: Piloto | Despliegue a grupo piloto de estudiantes y ajustes. | 2 semanas | Feedback incorporado, documentación final. |

| Duración Total Estimada del Proyecto 16 semanas (4 meses) desde el inicio de la Fase 0 hasta la liberación del piloto en producción. El equipo mínimo requerido es: 1 Tech Lead Full Stack, 1 Desarrollador Backend (Python/FastAPI), 1 Desarrollador Frontend (React), 1 QA Engineer. |
| :---- |

# **10\. GESTIÓN DE RIESGOS**

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
| ----- | ----- | ----- | ----- | ----- |
| R-01 | Costos de API OpenAI superiores al presupuesto. | Media | Alto | Implementar rate limiting por usuario. Monitorear uso en tiempo real con alertas de costo. |
| R-02 | Resistencia de estudiantes a compartir datos emocionales. | Alta | Alto | Comunicación transparente sobre privacidad. Consentimiento explito. Modo anónimo opcional. |
| R-03 | Falsos positivos en detección de crisis. | Media | Crítico | Validación de umbrales con psicólogos. Proceso de confirmación humana para alertas críticas. |
| R-04 | Latencia alta de la API de OpenAI. | Baja | Medio | Implementar caché de respuestas similares. Cola de procesamiento asíncrono. |
| R-05 | Incumplimiento de la Ley 19.628. | Baja | Crítico | Revisión legal antes del despliegue. DPA (Data Processing Agreement) con todos los proveedores. |
| R-06 | Baja adhesión de usuarios al sistema. | Alta | Alto | Gamificación (rachas de registro). Integración con actividades de bienestar institucionales. |

# **11\. CONTROL DE VERSIONES Y APROBACIONES**

## **11.1 Historial de Versiones**

| Versión | Fecha | Autor | Descripción del Cambio |
| ----- | ----- | ----- | ----- |
| 1.0.0 | Mayo 2025 | Equipo de Desarrollo MindCheck | Versión inicial del documento SRS. |

## **11.2 Firmas de Aprobación**

| Rol | Nombre | Firma | Fecha |
| ----- | ----- | ----- | ----- |
| Director de Bienestar Estudiantil |  | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |  |
| Jefe de Proyecto TI |  | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |  |
| Líder Técnico de Desarrollo |  | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |  |
| Representante Legal / Cumplimiento |  | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |  |

*Documento elaborado según el estándar IEEE 830-1998 e ISO/IEC 25010\.*

*Clasificación: CONFIDENCIAL — Uso interno exclusivo de Duoc UC. Prohibida su reproducción sin autorización.*