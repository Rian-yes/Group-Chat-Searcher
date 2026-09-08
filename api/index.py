import os
import sys
from pathlib import Path

# Configure writable cache directories for Vercel's read-only serverless environment
os.environ.setdefault("FASTEMBED_CACHE_PATH", "/tmp/fastembed_cache")
os.environ.setdefault("HF_HOME", "/tmp/hf_cache")

# Add project root and backend directory to sys.path so modules resolve seamlessly
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

for path in [str(BACKEND_DIR), str(ROOT_DIR)]:
    if path not in sys.path:
        sys.path.insert(0, path)

# Import the existing FastAPI application instance
from backend.main import app
