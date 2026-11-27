import base64
import json
import os
import sys

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials

load_dotenv(dotenv_path=".env.local")


def _allow_stub_firebase() -> bool:
    """CI / pytest never need real Firebase Admin credentials (verify is mocked)."""
    env = os.getenv("ENVIRONMENT", "").upper()
    return env == "CI" or "pytest" in sys.modules


if not firebase_admin._apps:
    encoded_creds = os.getenv("FIREBASE_CREDENTIALS")
    if encoded_creds:
        decoded_creds = json.loads(base64.b64decode(encoded_creds))
        cred = credentials.Certificate(decoded_creds)
        firebase_admin.initialize_app(cred)
    elif _allow_stub_firebase():
        # App must exist so `firebase_admin.auth` imports succeed; token verify is
        # patched in tests/integration_tests/conftest.py.
        firebase_admin.initialize_app(options={"projectId": "kenmanage-test"})
    else:
        raise ValueError("Missing FIREBASE_CREDENTIALS environment variable")

print("Firebase initialized.")
