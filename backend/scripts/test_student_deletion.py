"""
MindCheck — Test Student Deletion.
Verifies that deleting a student account cascadingly deletes records and purges the user from Supabase Auth.
"""
import os
import sys
from uuid import UUID

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.repositories.supabase_client import get_supabase_client
from app.services.student_service import StudentService

async def test_deletion():
    client = get_supabase_client()
    email = "test.student@duocuc.cl"
    
    print(f"Finding test student with email: {email}...")
    res = client.table("students").select("id").eq("email", email).maybe_single().execute()
    if not res.data:
        print(f"No student found with email: {email}. Creating a new test student first...")
        # Create user
        try:
            user = client.auth.admin.create_user({
                "email": email,
                "password": "Password123!",
                "email_confirm": True,
                "user_metadata": {
                    "first_name": "Test",
                    "last_name": "Student",
                    "sede": "San Joaquín",
                    "carrera": "Ingeniería en Informática"
                }
            })
            student_id = UUID(user.user.id)
            print(f"Student created with ID: {student_id}")
        except Exception as exc:
            print("Failed to create student:", exc)
            return
    else:
        student_id = UUID(res.data["id"])
        print(f"Found student ID: {student_id}")

    # Now let's create a dummy journal entry and alert for this student to test cascading deletes
    print("Creating mock journal entry for student...")
    entry_res = client.table("journal_entries").insert({
        "student_id": str(student_id),
        "content_encrypted": "GCM_encrypted_content_placeholder"
    }).execute()
    
    entry_id = entry_res.data[0]["id"] if entry_res.data else None
    print(f"Mock journal entry created: {entry_id}")

    print("Creating mock alert for student...")
    alert_res = client.table("alerts").insert({
        "student_id": str(student_id),
        "alert_type": "moderado",
        "message": "Mock alert message for deletion testing",
        "risk_level": "moderado"
    }).execute()
    alert_id = alert_res.data[0]["id"] if alert_res.data else None
    print(f"Mock alert created: {alert_id}")

    # Initialize StudentService and delete the student
    print("\nCalling StudentService to delete student account...")
    service = StudentService()
    success = await service.delete_student_account(student_id)
    print("Delete account success result:", success)

    # Verification phase
    print("\nVerifying deletion...")
    
    # 1. Verify profile is gone from public.students
    profile_check = client.table("students").select("*").eq("id", str(student_id)).execute()
    profile_exists = len(profile_check.data) > 0 if profile_check.data else False
    print(f"- Profile in public.students exists: {profile_exists} (Expected: False)")

    # 2. Verify journal entry was cascaded
    if entry_id:
        entry_check = client.table("journal_entries").select("*").eq("id", entry_id).execute()
        entry_exists = len(entry_check.data) > 0 if entry_check.data else False
        print(f"- Journal entry cascaded: {not entry_exists} (Expected: True)")

    # 3. Verify alert was cascaded
    if alert_id:
        alert_check = client.table("alerts").select("*").eq("id", alert_id).execute()
        alert_exists = len(alert_check.data) > 0 if alert_check.data else False
        print(f"- Alert cascaded: {not alert_exists} (Expected: True)")

    # 4. Verify auth user is gone from Supabase Auth
    auth_exists = True
    try:
        user_check = client.auth.admin.get_user_by_id(str(student_id))
        auth_exists = user_check is not None
    except Exception as exc:
        if "not found" in str(exc).lower() or "404" in str(exc).lower():
            auth_exists = False
        else:
            print("Error checking Auth user presence:", exc)
    print(f"- User in Supabase Auth exists: {auth_exists} (Expected: False)")

    if not profile_exists and not entry_exists and not alert_exists and not auth_exists:
        print("\n[SUCCESS] Deletion and cascade verification passed perfectly!")
    else:
        print("\n[FAILURE] One or more deletion checks failed.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_deletion())
