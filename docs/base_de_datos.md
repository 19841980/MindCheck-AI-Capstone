Modelo de Datos: MindCheck AI
Usaremos una base de datos relacional (PostgreSQL) con las siguientes tablas principales:

1. Tabla usuarios
id: UUID (Primary Key)

nombre: Texto

correo_duoc: Texto (Único)

fecha_registro: Timestamp

2. Tabla bitacoras (El corazón de la App)
id: UUID (Primary Key)

usuario_id: FK (Relación con usuarios)

contenido_texto: Texto (Lo que escribe el alumno)

fecha_creacion: Timestamp

3. Tabla analisis_ia (Resultados de GPT-4o mini)
id: UUID

bitacora_id: FK (Relación con bitacoras)

puntaje_sentimiento: Decimal (0.0 a 1.0)

nivel_estres: Texto (Bajo, Medio, Alto)

alerta_riesgo: Booleano (True/False)

sugerencia_ia: Texto (Recomendación generada)