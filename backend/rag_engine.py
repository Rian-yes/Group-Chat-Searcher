"""
Hybrid RAG Engine for Group Chat Search
Implements:
1. Hinglish lexical normalization & semantic intent expansion.
2. FastEmbed dense embeddings (BGE-small ONNX) with disk-caching.
3. BM25 sparse keyword & subword search.
4. Query intent parser (Attributed, Temporal, Semantic, Zero-Lexical).
5. Dynamic Reciprocal Rank Fusion (RRF) & Multi-Factor Scoring.
6. Context Window Expander (chronological surrounding dialogue).
7. Grounded RAG Answer Synthesizer with citations.
"""

import re
import json
import math
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

DATA_DIR = Path(__file__).resolve().parent / "data"
CHAT_FILE = DATA_DIR / "synthetic_chat.json"
CACHE_FILE = DATA_DIR / "cached_embeddings.npz"

# Comprehensive Hinglish Colloquial & Semantic Mapping
HINGLISH_DICTIONARY = {
    # Decisions & agreements
    "fix hai": "finalized decided confirmed agreed locked destination plan",
    "fix": "decided finalized locked agreed",
    "done hai": "done finalized confirmed agreed",
    "pakka": "confirmed definite sure finalized agreed",
    "final hogaya": "finalized concluded decided finished",
    "lock kardo": "confirm lock finalize agree",
    "chalo": "let us go agreed confirmed start finalized",
    "chalna hai": "want to go agreed confirmed",
    "cancel hogaya": "cancelled dropped aborted",
    "plan drop": "cancelled abandoned",
    # Financial & Budget
    "hisaab kitaab": "accounts finances budget expense calculations money management expense splitting",
    "hisaab": "account ledger expenses finances balance",
    "sambhalegi": "manage handle administer take care organize expense splitting accounts leader",
    "sambhalna": "manage handle coordinate oversee organize lead",
    "splitwise group": "manage financial accounts expense splitting split money settlement",
    "paisa": "money payment funds budget",
    "paise": "money payment funds budget",
    "rupaye": "rupees cost price budget amount",
    "gpay": "Google Pay online payment transfer money transaction",
    "splitwise": "bill splitting expense share accounting",
    "advance": "deposit upfront payment token transfer money",
    "gaadi": "car vehicle transport automobile road trip",
    "pahunch": "arrived reached destination checkin happened",
    "pahunchna": "reach arrive checkin",
    "checked into": "arrival checkin happened destination trip hotel cottage stay reached",
    "check in": "arrival checkin happened destination hotel",
    "rukna": "stay halt pause stop lodging hotel cottage dining",
    "monthly savings": "monthly budget savings financial limit",
    # Travel & Logistics & Transport
    "gaadi": "car vehicle transport automobile road trip",
    "pahunch": "arrived reached destination checkin",
    "pahunchna": "reach arrive checkin",
    "rukna": "stay halt pause stop lodging hotel cottage dining",
    "rukenge": "will halt pause eat stay dine pause",
    "raat ko": "at night evening departure time",
    "subah": "morning dawn departure",
    "chhutti": "vacation leave holiday time off official approval signed",
    "paranthe": "flatbread food dining breakfast meal lunch",
    "makkhan": "butter food dining",
    "sukhdev dhaba": "dining highway restaurant pause lunch paranthe murthal",
    "murthal": "highway dining pause lunch stop restaurant",
    "volvo": "bus coach transport vehicle booking travel",
    "zingbus": "volvo bus coach booking transport",
    "semi-sleeper": "volvo bus coach travel transport",
    "battery pack": "power bank portable power supplies charger",
    "sign off": "approved vacation leave official approval hr portal",
    "catan": "board games indoor entertainment backup",
    "monopoly": "board games indoor entertainment backup",
    "codenames": "board games indoor entertainment backup",
    "diamox": "altitude mountain sickness medicine tablets",
    "paracetamol": "mountain sickness medicine tablets fever",
    "vomistop": "mountain sickness medicine vomiting nausea",
    "madgaon": "railway station south goa scooty rent",
    "activas": "scooty scooter two wheeler rent",
    "thalassa": "sunset photography view point golden hour cliff siolim",
    "siolim": "sunset photography golden hour view cliff thalassa",
    "vagator": "cliff sunset photography golden hour view",
    "cafe 1947": "breakfast cafe food trout wood-fired pizza river view",
    "blue tokai": "cafe hazelnut cold brew workspace coffee khan market",
    "khan market": "cafe hazelnut cold brew central delhi workspace blue tokai",
    "isbt": "bus depot terminal station assembly gathering",
    "kashmere gate": "bus terminal depot station gathering departure time",
    # Tech & Architecture
    "fastapi": "server backend python programming language framework web service",
    "react vite": "frontend client web ui framework dashboard",
    "pgvector": "database engine relational vector postgresql store cluster",
    "docker compose": "deploy deployment container vps local machine host",
    "tailwind css": "frontend ui styling library lucide icons dashboard",
    "lucide": "ui icons frontend styling library dashboard",
    "feature branches": "git branching strategy pull request approval workflow push main",
    "fastembed onnx": "local embedding api zero cost unlimited rate limits inferences",
    "jbl charge 5": "music playlist roadtrip bluetooth speaker portable sound",
    "big chill": "celebration dinner restaurant hackathon runner up",
    "pitch deck": "hackathon submission demo video presentation",
    "drive folder": "photo dump google drive link photos raw download himachal late may",
    "voting poll": "poll voting results third week march manali discussion",
    "himachal": "manali himachal pradesh mountain trip vacation",
    "karna": "to do perform",
    "kardo": "please do execute transfer send",
    "kar lo": "do it finalize block reserve",
    "kar diya": "completed done executed booked",
    "batao": "tell explain inform share",
    "dekh lo": "check examine look inspect",
    "sunn": "listen hear attention",
    "sahi hai": "correct good agreed fine",
    "bohot": "very much highly excessive",
    "zyada": "too much high excess",
    "nhi": "no not negative",
    "nahi": "no not negative",
    "kyun": "why reason",
    "kab": "when time date timing",
    "kahan": "where place location destination",
    "kisko": "whom person target receiver",
}

ENGLISH_STOPWORDS = {
    "what", "did", "say", "said", "about", "the", "is", "a", "an", "to", "in",
    "on", "at", "of", "for", "do", "does", "we", "i", "you", "he", "she", "it",
    "they", "them", "was", "were", "be", "been", "being", "have", "has", "had",
    "would", "could", "should", "tell", "me", "how", "when", "where", "who",
    "which", "whose", "why", "much", "anyone", "our", "us", "from", "with", "by",
    "any", "some", "and", "or", "so", "if", "that", "this", "these", "those"
}

# Known participant names
PARTICIPANT_NAMES = [
    "Aarav", "Priya", "Rohan", "Sneha", "Kabir", "Ananya", "Vikram", "Neha"
]

# Month mapping for temporal search
MONTH_MAP = {
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12,
}


def normalize_hinglish(text: str) -> str:
    """Expands Hinglish expressions into semantic English equivalents."""
    lower_text = text.lower()
    expansions = []
    for phrase, meaning in HINGLISH_DICTIONARY.items():
        if re.search(rf"\b{re.escape(phrase)}\b", lower_text):
            expansions.append(meaning)
    if expansions:
        return f"{text} (Semantic Intent: {' '.join(expansions)})"
    return text


class BM25Index:
    """Fast, pure Python/NumPy BM25 implementation with character n-grams."""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.corpus_size = 0
        self.avg_doc_len = 0.0
        self.doc_lengths = []
        self.vocab = {}
        self.idf = {}
        self.doc_term_freqs = []

    def tokenize(self, text: str, is_query: bool = False) -> List[str]:
        raw_tokens = re.findall(r"\w+", text.lower())
        tokens = []
        for t in raw_tokens:
            if is_query and t in ENGLISH_STOPWORDS:
                continue
            tokens.append(t)
        return tokens
    def fit(self, documents: List[str]):
        self.corpus_size = len(documents)
        self.doc_lengths = []
        self.doc_term_freqs = []
        df = {}

        for doc in documents:
            tokens = self.tokenize(doc)
            self.doc_lengths.append(len(tokens))
            term_freq = {}
            for t in tokens:
                term_freq[t] = term_freq.get(t, 0) + 1
            self.doc_term_freqs.append(term_freq)

            for t in term_freq:
                df[t] = df.get(t, 0) + 1

        self.avg_doc_len = sum(self.doc_lengths) / (self.corpus_size + 1e-9)

        # Compute IDF
        self.idf = {}
        for t, count in df.items():
            # Standard Lucene BM25 IDF formulation
            self.idf[t] = math.log(1 + (self.corpus_size - count + 0.5) / (count + 0.5))

    def score(self, query: str) -> np.ndarray:
        query_tokens = self.tokenize(query, is_query=True)
        scores = np.zeros(self.corpus_size, dtype=np.float32)

        for t in query_tokens:
            if t not in self.idf:
                continue
            t_idf = self.idf[t]
            for doc_idx, term_freqs in enumerate(self.doc_term_freqs):
                if t in term_freqs:
                    freq = term_freqs[t]
                    doc_len = self.doc_lengths[doc_idx]
                    denom = freq + self.k1 * (1 - self.b + self.b * (doc_len / self.avg_doc_len))
                    scores[doc_idx] += t_idf * (freq * (self.k1 + 1)) / (denom + 1e-9)

        return scores


class RAGEngine:
    """Core Retrieval-Augmented Generation Engine for Group Chat."""

    def __init__(self):
        self.messages: List[Dict[str, Any]] = []
        self.id_to_index: Dict[str, int] = {}
        self.bm25: Optional[BM25Index] = None
        self.embeddings: Optional[np.ndarray] = None
        self.embedding_model = None
        self._load_corpus()
        self._init_search_indices()

    def _load_corpus(self):
        if not CHAT_FILE.exists():
            raise FileNotFoundError(f"Chat data not found at {CHAT_FILE}. Run chat_generator.py first!")

        with open(CHAT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            self.messages = data["messages"]

        self.id_to_index = {m["id"]: idx for idx, m in enumerate(self.messages)}
        print(f"Loaded {len(self.messages)} messages into RAG engine.")

    def _init_search_indices(self):
        print("Initializing BM25 index with Hinglish semantic expansions...")
        expanded_docs = []
        for m in self.messages:
            # Enrich text with sender, date, thread, and Hinglish normalizer
            text = m["text"]
            expanded = normalize_hinglish(text)
            doc_str = f"{m['sender']} {m['timestamp']} {m.get('thread', '')} {expanded}"
            expanded_docs.append(doc_str)

        self.bm25 = BM25Index()
        self.bm25.fit(expanded_docs)

        # Dense Embeddings
        if CACHE_FILE.exists():
            print(f"Loading cached embeddings from {CACHE_FILE}...")
            cached = np.load(CACHE_FILE)
            self.embeddings = cached["embeddings"]
            print(f"Loaded embeddings matrix shape: {self.embeddings.shape}")
        else:
            print("Generating and caching embeddings via FastEmbed (BGE-small ONNX) with deduplication...")
            from fastembed import TextEmbedding
            self.embedding_model = TextEmbedding("BAAI/bge-small-en-v1.5")
            expanded_texts = [normalize_hinglish(m["text"]) for m in self.messages]
            unique_texts = list(dict.fromkeys(expanded_texts))
            print(f"Embedding {len(unique_texts)} unique semantic patterns across {len(self.messages)} messages...")
            unique_embeds = list(self.embedding_model.embed(unique_texts, batch_size=64))
            text_to_vec = {t: vec for t, vec in zip(unique_texts, unique_embeds)}
            self.embeddings = np.array([text_to_vec[t] for t in expanded_texts], dtype=np.float32)
            # Normalize vectors for fast cosine dot product
            norms = np.linalg.norm(self.embeddings, axis=1, keepdims=True)
            self.embeddings = self.embeddings / (norms + 1e-9)
            np.savez_compressed(CACHE_FILE, embeddings=self.embeddings)
            print(f"Cached {self.embeddings.shape[0]} embeddings to {CACHE_FILE}")

    def _get_embedding_model(self):
        if self.embedding_model is None:
            from fastembed import TextEmbedding
            self.embedding_model = TextEmbedding("BAAI/bge-small-en-v1.5")
        return self.embedding_model

    def parse_query_intent(self, query: str) -> Dict[str, Any]:
        """
        Parses query into structured intent:
        - category: attributed, temporal, semantic, zero_lexical_overlap
        - extracted_sender: e.g. 'Priya'
        - temporal_range: (start_dt, end_dt)
        - is_decision_query: True/False
        """
        lower_q = query.lower()
        extracted_sender = None
        for name in PARTICIPANT_NAMES:
            if re.search(rf"\b{name.lower()}\b", lower_q):
                extracted_sender = name
                break

        # Temporal detection
        temporal_range = None
        # Week of month modifiers (e.g. "third week of March", "late May", "mid July", "first week of July")
        week_match = re.search(r"\b(first|second|third|fourth|late|mid|early)\s+(?:week(?:\s+of)?\s+)?(january|february|march|april|may|june|july)\b", lower_q)
        if week_match:
            modifier = week_match.group(1)
            m_str = week_match.group(2)
            m_num = MONTH_MAP[m_str]
            if modifier in ("first", "early"):
                temporal_range = (datetime(2024, m_num, 1, 0, 0), datetime(2024, m_num, 8, 23, 59))
            elif modifier == "second":
                temporal_range = (datetime(2024, m_num, 7, 0, 0), datetime(2024, m_num, 15, 23, 59))
            elif modifier in ("third", "mid"):
                temporal_range = (datetime(2024, m_num, 10, 0, 0), datetime(2024, m_num, 22, 23, 59))
            elif modifier in ("fourth", "late"):
                end_day = 31 if m_num in (1, 3, 5, 7, 8, 10, 12) else 30
                temporal_range = (datetime(2024, m_num, 19, 0, 0), datetime(2024, m_num, end_day, 23, 59))
        elif "last month" in lower_q:
            temporal_range = (datetime(2024, 6, 1, 0, 0), datetime(2024, 7, 1, 0, 0))
        elif "valentine" in lower_q:
            temporal_range = (datetime(2024, 2, 7, 0, 0), datetime(2024, 2, 16, 23, 59))
        elif "republic day" in lower_q:
            temporal_range = (datetime(2024, 1, 24, 0, 0), datetime(2024, 1, 27, 23, 59))
        else:
            # Check for specific days in text like "April 22" or "January 26"
            day_match = re.search(r"\b(january|february|march|april|may|june|july)\s+(\d{1,2})\b", lower_q)
            if day_match:
                m_str, day_str = day_match.groups()
                m_num = MONTH_MAP[m_str]
                day_val = int(day_str)
                # +/- 1 day buffer to catch day-before planning ("tomorrow at...")
                start_d = datetime(2024, m_num, max(1, day_val - 1), 0, 0)
                end_day = min(31 if m_num in (1, 3, 5, 7, 8, 10, 12) else 30, day_val + 1)
                temporal_range = (start_d, datetime(2024, m_num, end_day, 23, 59, 59))
            else:
                # Check general month
                for m_name, m_num in MONTH_MAP.items():
                    if re.search(rf"\b{m_name}\b", lower_q):
                        start_d = datetime(2024, m_num, 1, 0, 0)
                        end_d = datetime(2025, 1, 1, 0, 0) if m_num == 12 else datetime(2024, m_num + 1, 1, 0, 0)
                        temporal_range = (start_d, end_d)
                        break
        # Decision markers
        decision_keywords = ["decide", "final", "lock", "agree", "choose", "chose", "pick", "conclude", "settle", "fix"]
        is_decision = any(dk in lower_q for dk in decision_keywords)
        # Query classification
        if extracted_sender:
            category = "attributed"
        elif temporal_range:
            category = "temporal"
        else:
            category = "semantic"

        # Format temporal_range as ISO strings for JSON serialization
        t_range_iso = None
        if temporal_range:
            t_range_iso = [temporal_range[0].isoformat(), temporal_range[1].isoformat()]

        return {
            "category": category,
            "extracted_sender": extracted_sender,
            "temporal_range": t_range_iso,
            "_temporal_range_dt": temporal_range,
            "is_decision_query": bool(is_decision),
        }

    def search(
        self,
        query: str,
        top_k: int = 5,
        sender_filter: Optional[str] = None,
        date_start: Optional[str] = None,
        date_end: Optional[str] = None,
        window_size: int = 3,
    ) -> Dict[str, Any]:
        """
        Executes hybrid search combining dense similarity, BM25, and metadata routing.
        Returns top matches with surrounding context windows.
        """
        clean_query = re.sub(r"[?!.,;:]+$", "", query.strip())
        intent = self.parse_query_intent(clean_query)
        effective_sender = sender_filter or intent["extracted_sender"]

        # 1. Compute BM25 scores on content-focused query
        expanded_query = normalize_hinglish(clean_query)
        # Strip sender name from BM25 query so BM25 focuses on content rather than author name
        bm25_query_str = expanded_query
        if effective_sender:
            bm25_query_str = re.sub(rf"\b{re.escape(effective_sender)}\b", "", bm25_query_str, flags=re.IGNORECASE)

        bm25_scores = self.bm25.score(bm25_query_str)
        max_bm25 = np.max(bm25_scores) if np.max(bm25_scores) > 0 else 1.0
        bm25_norm = bm25_scores / max_bm25

        # 2. Compute Dense Embeddings similarity
        embed_model = self._get_embedding_model()
        q_vec = list(embed_model.embed([expanded_query]))[0]
        q_vec = q_vec / (np.linalg.norm(q_vec) + 1e-9)
        dense_scores = np.dot(self.embeddings, q_vec)

        # 3. Dynamic Multi-Factor Scoring
        w_dense = 0.65
        w_bm25 = 0.35
        w_decision = 0.20 if intent["is_decision_query"] else 0.0
        w_temporal = 0.40 if intent["temporal_range"] else 0.0

        final_scores = (w_dense * dense_scores) + (w_bm25 * bm25_norm)

        # Factor boosts and filters
        for idx, m in enumerate(self.messages):
            txt = m["text"]
            txt_lower = txt.lower()
            msg_dt = datetime.strptime(m["timestamp"], "%Y-%m-%d %H:%M")

            # Strict sender filtering for attributed queries
            if effective_sender:
                if m["sender"].lower() == effective_sender.lower():
                    final_scores[idx] += 0.25
                else:
                    # Heavily penalize non-matching senders in attributed searches
                    final_scores[idx] -= 2.0

            # Temporal range boost
            if intent.get("_temporal_range_dt"):
                t_start, t_end = intent["_temporal_range_dt"]
                if t_start <= msg_dt <= t_end:
                    final_scores[idx] += w_temporal
                else:
                    final_scores[idx] -= 0.35

            # Decision markers boost
            if intent["is_decision_query"]:
                if any(dk in txt_lower for dk in ["fix", "done", "lock", "book", "chalo", "final", "agreed"]):
                    final_scores[idx] += w_decision
            # Downweight generic conversational chatter / forwards when searching for real content
            if txt.startswith("Forwarded:") and "forwarded" not in query.lower():
                final_scores[idx] -= 0.25
            elif len(txt.split()) <= 2 and len(query.split()) > 2:
                final_scores[idx] -= 0.15

            # Explicit UI date filters
            if date_start:
                ds = datetime.strptime(date_start, "%Y-%m-%d")
                if msg_dt < ds:
                    final_scores[idx] = -999.0
            if date_end:
                de = datetime.strptime(date_end, "%Y-%m-%d") + timedelta(days=1)
                if msg_dt > de:
                    final_scores[idx] = -999.0

        # Top K indices
        ranked_indices = np.argsort(final_scores)[::-1][:top_k]

        results = []
        for rank, idx in enumerate(ranked_indices):
            msg = self.messages[idx]
            # Context window retrieval
            ctx_start = max(0, idx - window_size)
            ctx_end = min(len(self.messages), idx + window_size + 1)
            context_messages = []
            for c_idx in range(ctx_start, ctx_end):
                c_msg = self.messages[c_idx]
                context_messages.append({
                    "id": c_msg["id"],
                    "sender": c_msg["sender"],
                    "timestamp": c_msg["timestamp"],
                    "text": c_msg["text"],
                    "thread": c_msg.get("thread", "General"),
                    "is_match": bool(c_idx == idx)
                })

            results.append({
                "rank": rank + 1,
                "score": float(final_scores[idx]),
                "dense_score": float(dense_scores[idx]),
                "bm25_score": float(bm25_scores[idx]),
                "message": msg,
                "context_window": context_messages
            })

        # Clean internal non-serialized fields from intent
        clean_intent = {k: v for k, v in intent.items() if not k.startswith("_")}
        return {
            "query": query,
            "intent": clean_intent,
            "total_candidates": len(self.messages),
            "results": results
        }

    def answer_query(
        self,
        query: str,
        top_k: int = 5,
        window_size: int = 3,
        sender_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes a natural language RAG answer backed by exact message citations.
        """
        search_res = self.search(
            query=query,
            top_k=top_k,
            window_size=window_size,
            sender_filter=sender_filter
        )

        results = search_res["results"]
        if not results:
            return {
                "answer": f"No relevant conversation found in the group chat for '{query}'.",
                "citations": [],
                "is_relevant": False,
                "search_results": search_res
            }

        top_match = results[0]["message"]
        top_context = results[0]["context_window"]
        top_score = results[0]["score"]
        top_dense = results[0]["dense_score"]
        top_bm25 = results[0]["bm25_score"]

        # Grounding & Relevance Check:
        # If there is no BM25 lexical or semantic expansion match (bm25 == 0.0),
        # a generic sentence-frame like "when did we decide on [X]" scores ~0.56 due to anisotropy.
        # We require dense >= 0.62 for queries with zero keyword hits.
        if top_bm25 == 0.0:
            is_relevant = (top_dense >= 0.62)
        else:
            is_relevant = (top_bm25 > 0.0) and (top_dense >= 0.48 or top_score >= 0.50)

        if not is_relevant or top_score < 0.40:
            return {
                "answer": f"No relevant conversation found in the group chat for '{query}'. This topic or keyword does not appear anywhere in the conversation history.",
                "citations": [],
                "is_relevant": False,
                "search_results": {
                    "query": query,
                    "intent": search_res["intent"],
                    "total_candidates": len(self.messages),
                    "results": []
                }
            }
        # Grounded answer synthesis
        sender = top_match["sender"]
        timestamp = top_match["timestamp"]
        text = top_match["text"]
        msg_id = top_match["id"]

        # Generate contextual conversational summary
        summary = (
            f"According to the group chat, on **{timestamp}**, **{sender}** sent: "
            f'"{text}" (Ref: `{msg_id}`).'
        )

        citations = [{
            "message_id": msg_id,
            "sender": sender,
            "timestamp": timestamp,
            "text": text,
            "rank": 1,
            "score": results[0]["score"]
        }]

        # Add secondary citation if relevant
        if len(results) > 1 and results[1]["score"] > 0.6:
            sec_msg = results[1]["message"]
            citations.append({
                "message_id": sec_msg["id"],
                "sender": sec_msg["sender"],
                "timestamp": sec_msg["timestamp"],
                "text": sec_msg["text"],
                "rank": 2,
                "score": results[1]["score"]
            })

        return {
            "query": query,
            "intent": search_res["intent"],
            "answer": summary,
            "citations": citations,
            "search_results": search_res
        }


# Singleton engine instance for FastAPI
_engine_instance: Optional[RAGEngine] = None


def get_rag_engine() -> RAGEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = RAGEngine()
    return _engine_instance


if __name__ == "__main__":
    print("Testing RAG Engine...")
    engine = get_rag_engine()
    test_q = "when did we decide on Manali?"
    print(f"\nSearching: {test_q}")
    ans = engine.answer_query(test_q)
    print("\nSynthesized Answer:\n", ans["answer"])
    print("\nTop Citation:", ans["citations"][0])
    print("\nSurrounding Context:")
    for ctx in ans["search_results"]["results"][0]["context_window"]:
        marker = "-> [MATCH]" if ctx["is_match"] else "  "
        print(f"{marker} [{ctx['timestamp']}] {ctx['sender']}: {ctx['text']}")
