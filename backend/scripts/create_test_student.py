"""
MindCheck — Create Test Student.

Creates a test student user in Supabase Auth with 'email_confirm=True'
so it can bypass verification and log in immediately.
"""

import os
import sys
from uuid import UUID

# Ensure the backend directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.repositories.supabase_client import get_supabase_client


def main():
    print("Conectando con Supabase...")
    client = get_supabase_client()

    email = "test.student@duocuc.cl"
    password = "Password123!"
    
    print(f"Buscando si el usuario {email} ya existe en la base de datos...")
    
    # Try to check in public.students
    try:
        res = client.table("students").select("id").eq("email", email).maybe_single().execute()
        if res.data:
            student_id = res.data["id"]
            print(f"Estudiante ya existe en la DB con ID: {student_id}. Eliminándolo para recrear...")
            # Delete student from DB and Auth to start clean
            client.table("students").delete().eq("id", student_id).execute()
            try:
                client.auth.admin.delete_user(student_id)
                print("Usuario borrado en Supabase Auth.")
            except Exception:
                print("No se pudo borrar de Supabase Auth (tal vez no existía).")
    except Exception as exc:
        print(f"Nota: No se pudo verificar si existía el estudiante ({exc}). Prosiguiendo...")

    print(f"Creando usuario {email} en Supabase Auth...")
    try:
        user = client.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "first_name": "Test",
                "last_name": "Student",
                "sede": "San Joaquín",
                "carrera": "Ingeniería en Informática"
            }
        })
        print(f"Usuario creado exitosamente. ID: {user.user.id}")
        
        # Verify the trigger created the student profile in public.students
        student_profile = client.table("students").select("*").eq("id", user.user.id).maybe_single().execute()
        if student_profile.data:
            print("Verificado: El trigger creó el perfil en public.students!")
            print(f"Datos del perfil: {student_profile.data}")
            
            # Update consent_given to TRUE so they bypass any consent screen
            client.table("students").update({
                "consent_given": True,
                "consent_given_at": "now()",
                "rut_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
            }).eq("id", user.user.id).execute()
            print("Consentimiento y hash de RUT actualizados.")
        else:
            print("Error: El trigger no creó el perfil en public.students.")
            
    except Exception as exc:
        print(f"Error al crear el usuario: {exc}")


if __name__ == "__main__":
    main()
