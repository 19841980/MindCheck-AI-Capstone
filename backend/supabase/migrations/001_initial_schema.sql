-- ============================================
-- MindCheck — Initial Database Schema
-- Run in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: students
-- ============================================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    rut_hash TEXT NOT NULL, -- SHA-256 + salt, never plain RUT
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    sede TEXT NOT NULL,
    carrera TEXT NOT NULL,
    consent_given BOOLEAN DEFAULT FALSE, -- Ley 19.628 consent
    consent_given_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: journal_entries
-- Immutable once created (no UPDATE policy for students)
-- ============================================
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    content_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted at application layer
    sentiment_score FLOAT,
    dominant_emotion TEXT,
    risk_level TEXT CHECK (risk_level IN ('bajo', 'moderado', 'alto', 'critico')),
    keywords TEXT[] DEFAULT '{}',
    analysis_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for student queries (most common access pattern)
CREATE INDEX IF NOT EXISTS idx_journal_entries_student_date
    ON journal_entries(student_id, created_at DESC);

-- Index for alert detection (negative entries in time window)
CREATE INDEX IF NOT EXISTS idx_journal_entries_sentiment
    ON journal_entries(student_id, sentiment_score, created_at);

-- ============================================
-- Table: sentiment_analysis
-- Write-only (immutable after creation)
-- ============================================
CREATE TABLE IF NOT EXISTS sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID UNIQUE NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    sentiment_score FLOAT NOT NULL CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
    dominant_emotion TEXT NOT NULL,
    secondary_emotions TEXT[] DEFAULT '{}',
    risk_level TEXT NOT NULL CHECK (risk_level IN ('bajo', 'moderado', 'alto', 'critico')),
    risk_justification TEXT,
    keywords TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    crisis_indicators BOOLEAN DEFAULT FALSE,
    raw_response JSONB, -- Full AI response for auditing
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: alerts
-- Immutable. Can only be marked as acknowledged.
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('bajo', 'moderado', 'alto', 'critico')),
    risk_level TEXT NOT NULL,
    message TEXT NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID -- Staff member who acknowledged
);

CREATE INDEX IF NOT EXISTS idx_alerts_student
    ON alerts(student_id, triggered_at DESC);

-- ============================================
-- Table: resources
-- Self-help resources managed by the bienestar team
-- ============================================
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('exercise', 'meditation', 'article', 'video', 'contact')),
    duration TEXT,
    emotion_tags TEXT[] DEFAULT '{}',
    risk_level_tags TEXT[] DEFAULT '{}',
    url TEXT,
    icon TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS) — Non-Negotiable
-- ============================================

-- Enable RLS on all tables with student data
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Service-role policies (backend uses service_role key)
-- The service_role key bypasses RLS by default in Supabase,
-- so these policies apply only to anon/authenticated roles.
-- ============================================

-- Students can SELECT and INSERT their own entries
CREATE POLICY journal_entries_select_own ON journal_entries
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY journal_entries_insert_own ON journal_entries
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

CREATE POLICY journal_entries_delete_own ON journal_entries
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- Students can SELECT their own analysis
CREATE POLICY sentiment_analysis_select_own ON sentiment_analysis
    FOR SELECT TO authenticated
    USING (
        entry_id IN (
            SELECT id FROM journal_entries WHERE student_id = auth.uid()
        )
    );

-- Students can SELECT their own alerts
CREATE POLICY alerts_select_own ON alerts
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

-- Students can read own profile
CREATE POLICY students_select_own ON students
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- Resources are public (read-only for all authenticated users)
CREATE POLICY resources_public_read ON resources
    FOR SELECT TO authenticated
    USING (active = TRUE);

-- ============================================
-- Seed: demo student for development
-- ============================================
INSERT INTO students (id, email, rut_hash, first_name, last_name, sede, carrera, consent_given, consent_given_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'valentina.rojas@duocuc.cl',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', -- SHA-256 placeholder
    'Valentina',
    'Rojas',
    'Santiago',
    'Ingeniería',
    TRUE,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Seed: default self-help resources
-- ============================================
INSERT INTO resources (title, description, resource_type, duration, emotion_tags, icon, active) VALUES
('Respiración 4-7-8', 'Técnica de respiración para reducir ansiedad en 3 minutos.', 'exercise', '3 minutos', '{"ansiedad","estrés"}', '😮‍💨', TRUE),
('Mindfulness express', 'Meditación guiada breve para momentos de estrés.', 'meditation', '5 minutos', '{"estrés"}', '🧘', TRUE),
('Gestión académica', 'Artículo sobre técnicas para manejar la carga académica.', 'article', '4 min lectura', '{"estrés","ansiedad"}', '📚', TRUE),
('Ejercicio de gratitud', 'Escribe 3 cosas por las que estás agradecido/a hoy.', 'exercise', '5 minutos', '{"tristeza","calma"}', '🙏', TRUE),
('Respiración diafragmática', 'Aprende la técnica de respiración profunda para calmar tu cuerpo.', 'exercise', '4 minutos', '{"ansiedad","estrés"}', '💨', TRUE),
('Línea de apoyo Duoc UC', 'Contacto directo con el equipo de bienestar estudiantil.', 'contact', 'Disponible 24/7', '{"crisis"}', '📞', TRUE)
ON CONFLICT DO NOTHING;
