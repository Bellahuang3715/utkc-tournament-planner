import firebase_admin
from firebase_admin import credentials
import os
import base64
import json
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env.local")

if not firebase_admin._apps:
    # Decode the base64-encoded JSON string
    encoded_creds = os.getenv('FIREBASE_CREDENTIALS')
    if not encoded_creds:
        raise ValueError("Missing FIREBASE_CREDENTIALS environment variable")

    decoded_creds = json.loads(base64.b64decode(encoded_creds))
    cred = credentials.Certificate(decoded_creds)
    firebase_admin.initialize_app(cred)

# if not firebase_admin._apps:
#     cred = credentials.Certificate("./firebase-adminsdk.json")
#     firebase_admin.initialize_app(cred)

print("Firebase initialized.")
