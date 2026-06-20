-- ============================================
-- MindCheck — Push Subscriptions Table and Security
-- 
-- Ejecutar en el SQL Editor de Supabase.
--
-- Tabla para almacenar las suscripciones de notificaciones push
-- de los estudiantes para habilitar el envío de alertas de bienestar.
-- ============================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by student_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_student
    ON public.push_subscriptions(student_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 1. Policy for SELECT: Students can view only their own push subscriptions
CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

-- 2. Policy for INSERT: Students can register push subscriptions for themselves
CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

-- 3. Policy for DELETE: Students can remove their own push subscriptions
CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());
