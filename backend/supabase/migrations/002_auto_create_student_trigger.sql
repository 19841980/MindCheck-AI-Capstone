-- ============================================
-- MindCheck — Auto-Create Student Profile on Auth Signup
-- 
-- Ejecutar en el SQL Editor de Supabase.
--
-- Cuando un usuario se registra en auth.users (vía signUp),
-- este trigger crea automáticamente su registro en la tabla
-- public.students, resolviendo la FK student_id → students.id
-- que requieren journal_entries, alerts, etc.
--
-- Extrae first_name, last_name, sede y carrera de user_metadata
-- si están disponibles. Si no, parsea el email (nombre.apellido@duocuc.cl).
-- ============================================

-- 1. Crear la función del trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT;
    v_meta JSONB;
    v_first_name TEXT;
    v_last_name TEXT;
    v_sede TEXT;
    v_carrera TEXT;
    v_email_prefix TEXT;
    v_parts TEXT[];
BEGIN
    v_email := NEW.email;
    v_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

    -- Intentar extraer nombres de user_metadata (enviados desde el frontend signUp)
    v_first_name := COALESCE(
        v_meta->>'first_name',
        v_meta->>'firstName',
        NULL
    );
    v_last_name := COALESCE(
        v_meta->>'last_name',
        v_meta->>'lastName',
        NULL
    );

    -- Fallback: parsear el email (nombre.apellido@duocuc.cl)
    IF v_first_name IS NULL OR v_first_name = '' THEN
        v_email_prefix := SPLIT_PART(v_email, '@', 1);
        v_parts := STRING_TO_ARRAY(v_email_prefix, '.');
        v_first_name := INITCAP(COALESCE(v_parts[1], 'Estudiante'));
        v_last_name := COALESCE(
            v_last_name,
            INITCAP(COALESCE(v_parts[2], ''))
        );
    END IF;

    -- Sede y carrera desde metadata, con defaults
    v_sede := COALESCE(v_meta->>'sede', 'Sin asignar');
    v_carrera := COALESCE(v_meta->>'carrera', 'Sin asignar');

    -- Insertar en students con el mismo UUID que auth.users
    -- ON CONFLICT evita errores si el registro ya existe (idempotencia)
    INSERT INTO public.students (
        id,
        email,
        rut_hash,
        first_name,
        last_name,
        sede,
        carrera,
        consent_given,
        consent_given_at,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_email,
        'pending', -- RUT hash se completa en el perfil del estudiante
        v_first_name,
        COALESCE(v_last_name, ''),
        v_sede,
        v_carrera,
        FALSE,
        NULL,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- 2. Crear el trigger que ejecuta la función después de cada INSERT en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Nota: Para usuarios que YA existen en auth.users pero NO en students,
-- ejecutar esta query una vez para sincronizar retroactivamente:
-- ============================================
-- INSERT INTO public.students (id, email, rut_hash, first_name, last_name, sede, carrera, consent_given, created_at, updated_at)
-- SELECT 
--     au.id,
--     au.email,
--     'pending',
--     INITCAP(COALESCE(SPLIT_PART(SPLIT_PART(au.email, '@', 1), '.', 1), 'Estudiante')),
--     INITCAP(COALESCE(SPLIT_PART(SPLIT_PART(au.email, '@', 1), '.', 2), '')),
--     COALESCE(au.raw_user_meta_data->>'sede', 'Sin asignar'),
--     COALESCE(au.raw_user_meta_data->>'carrera', 'Sin asignar'),
--     FALSE,
--     NOW(),
--     NOW()
-- FROM auth.users au
-- WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = au.id)
-- ON CONFLICT (id) DO NOTHING;
