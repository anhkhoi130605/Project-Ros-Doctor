import os
import uvicorn
from src.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", os.environ.get("WEBSITES_PORT", 8000)))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
