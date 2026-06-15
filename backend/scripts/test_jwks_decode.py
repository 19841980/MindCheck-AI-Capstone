"""
Scratch script to test Supabase JWKS fetching and python-jose key construction for ES256.
"""
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from jose import jwk, jwt

def test_jwks():
    supabase_url = "https://wldtlewahskdpoogwejq.supabase.co"
    jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
    
    print("Fetching JWKS from:", jwks_url)
    res = httpx.get(jwks_url)
    res.raise_for_status()
    jwks = res.json()
    print("Fetched JWKS:", jwks)
    
    for key_data in jwks["keys"]:
        print(f"Constructing key for kid: {key_data.get('kid')}")
        key = jwk.construct(key_data)
        print("Key constructed successfully! Type:", type(key))
        
        # Test if we can retrieve parameters
        print("Key algorithm:", key_data.get("alg"))
        
if __name__ == "__main__":
    test_jwks()
