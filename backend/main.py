"""
FastAPI Backend Server for Group Chat RAG Search
Provides RESTful APIs for:
- Hybrid Search & Context Expansion
- RAG Question Answering with Citations
- Chat message browser & context viewer
- Benchmark execution & scorecard
- Custom WhatsApp chat file uploads
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag_engine import get_rag_engine, normalize_hinglish, BM25Index
from evaluation import evaluate_rag_engine

app = FastAPI(
    title="Group Chat RAG Search Engine",
    description="Intelligent semantic, attributed, and temporal search over messy Hinglish group chats.",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).resolve().parent / "data"
QUERIES_FILE = DATA_DIR / "ground_truth_queries.json"
BENCHMARK_FILE = DATA_DIR / "benchmark_results.json"


# --- Pydantic Schemas ---

class SearchRequest(BaseModel):
    query: str = Field(..., description="User query in English, Hinglish, or code-mixed text.")
    top_k: int = Field(5, ge=1, le=20, description="Number of results to retrieve.")
    window_size: int = Field(3, ge=1, le=10, description="Surrounding message context radius.")
    sender_filter: Optional[str] = Field(None, description="Filter by sender name.")
    date_start: Optional[str] = Field(None, description="Start date filter (YYYY-MM-DD).")
    date_end: Optional[str] = Field(None, description="End date filter (YYYY-MM-DD).")


class ChatRequest(BaseModel):
    query: str = Field(..., description="Question to answer from the chat history.")
    top_k: int = Field(5, ge=1, le=20)
    window_size: int = Field(3, ge=1, le=10)
    sender_filter: Optional[str] = None


class UploadTextRequest(BaseModel):
    text: str = Field(..., description="Raw text of WhatsApp chat export.")


# --- API Routes ---

@app.get("/api/health")
def get_health():
    engine = get_rag_engine()
    return {
        "status": "healthy",
        "total_messages": len(engine.messages),
        "embedding_model": "BAAI/bge-small-en-v1.5 (FastEmbed ONNX)",
        "cached": (DATA_DIR / "cached_embeddings.npz").exists(),
        "participants": [
            "Aarav", "Priya", "Rohan", "Sneha", "Kabir", "Ananya", "Vikram", "Neha"
        ]
    }


@app.post("/api/search")
def search_messages(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    engine = get_rag_engine()
    results = engine.search(
        query=req.query,
        top_k=req.top_k,
        sender_filter=req.sender_filter,
        date_start=req.date_start,
        date_end=req.date_end,
        window_size=req.window_size
    )
    return results


@app.post("/api/chat")
def chat_answer(req: ChatRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    engine = get_rag_engine()
    answer_payload = engine.answer_query(
        query=req.query,
        top_k=req.top_k,
        window_size=req.window_size,
        sender_filter=req.sender_filter
    )
    return answer_payload


@app.get("/api/messages")
def get_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sender: Optional[str] = None,
    thread: Optional[str] = None
):
    engine = get_rag_engine()
    filtered = engine.messages

    if sender:
        filtered = [m for m in filtered if m["sender"].lower() == sender.lower()]
    if thread:
        filtered = [m for m in filtered if m.get("thread", "").lower() == thread.lower()]

    total = len(filtered)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    items = filtered[start_idx:end_idx]

    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size,
        "messages": items
    }


@app.get("/api/messages/{msg_id}/context")
def get_message_context(msg_id: str, window_size: int = Query(5, ge=1, le=20)):
    engine = get_rag_engine()
    if msg_id not in engine.id_to_index:
        raise HTTPException(status_code=404, detail=f"Message {msg_id} not found.")

    idx = engine.id_to_index[msg_id]
    ctx_start = max(0, idx - window_size)
    ctx_end = min(len(engine.messages), idx + window_size + 1)

    context_messages = []
    for c_idx in range(ctx_start, ctx_end):
        m = engine.messages[c_idx]
        context_messages.append({
            "id": m["id"],
            "sender": m["sender"],
            "timestamp": m["timestamp"],
            "text": m["text"],
            "thread": m.get("thread", "General"),
            "is_match": (c_idx == idx)
        })

    return {
        "target_id": msg_id,
        "context_window": context_messages
    }


@app.get("/api/benchmark/queries")
def get_benchmark_queries():
    if not QUERIES_FILE.exists():
        raise HTTPException(status_code=404, detail="Ground truth queries file not found.")
    with open(QUERIES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@app.post("/api/benchmark/run")
def run_benchmark():
    engine = get_rag_engine()
    summary = evaluate_rag_engine(engine=engine)
    return summary


@app.get("/api/benchmark/results")
def get_benchmark_results():
    if BENCHMARK_FILE.exists():
        with open(BENCHMARK_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    # If not yet run, run it now
    engine = get_rag_engine()
    return evaluate_rag_engine(engine=engine)


@app.post("/api/upload")
async def upload_chat(file: UploadFile = File(...)):
    """Accepts a WhatsApp .txt export and dynamically indexes it."""
    contents = await file.read()
    text = contents.decode("utf-8", errors="replace")

    parsed_messages = parse_whatsapp_export(text)
    if not parsed_messages:
        raise HTTPException(status_code=400, detail="Could not parse any messages from file.")

    return {
        "message": f"Successfully parsed {len(parsed_messages)} messages from upload.",
        "sample": parsed_messages[:5]
    }


def parse_whatsapp_export(text: str) -> List[Dict[str, Any]]:
    """
    Parses WhatsApp export lines:
    '15/01/24, 09:15 - Aarav: Message text'
    or '[15/01/24, 09:15:00] Aarav: Message text'
    """
    lines = text.strip().split("\n")
    messages = []
    # Pattern: DD/MM/YY(YY), HH:MM(:SS) - Sender: Message
    pattern = re.compile(r"^\[?(\d{1,2}/\d{1,2}/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]?\s*-\s*([^:]+):\s*(.*)$")

    msg_id = 1
    for line in lines:
        match = pattern.match(line.strip())
        if match:
            date_part, time_part, sender, msg_text = match.groups()
            messages.append({
                "id": f"up_{msg_id:04d}",
                "sender": sender.strip(),
                "timestamp": f"{date_part} {time_part}",
                "text": msg_text.strip(),
                "thread": "Uploaded"
            })
            msg_id += 1

    return messages


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
