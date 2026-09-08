"""
Automated Evaluation and Benchmark Suite for Group Chat RAG
Evaluates 40 Ground Truth queries across 4 categories:
1. Semantic
2. Attributed
3. Temporal
4. Zero Lexical Overlap (>= 8 queries, here 10)

Calculates:
- Top-1 Accuracy
- Recall@3 (Hit Rate @ 3)
- Recall@5 (Hit Rate @ 5)
- MRR (Mean Reciprocal Rank)
- Average Query Latency (ms)
"""

import json
import time
from pathlib import Path
from typing import Dict, Any, List

DATA_DIR = Path(__file__).resolve().parent / "data"
QUERIES_FILE = DATA_DIR / "ground_truth_queries.json"
RESULTS_FILE = DATA_DIR / "benchmark_results.json"


def evaluate_rag_engine(engine=None, top_k=5) -> Dict[str, Any]:
    if engine is None:
        from rag_engine import get_rag_engine
        engine = get_rag_engine()

    if not QUERIES_FILE.exists():
        raise FileNotFoundError(f"Queries file not found at {QUERIES_FILE}")

    with open(QUERIES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        queries = data["queries"]

    total_queries = len(queries)
    top1_hits = 0
    top3_hits = 0
    top5_hits = 0
    reciprocal_ranks = []
    latencies_ms = []

    category_stats = {
        "semantic": {"total": 0, "top1": 0, "top3": 0, "top5": 0, "rr": []},
        "attributed": {"total": 0, "top1": 0, "top3": 0, "top5": 0, "rr": []},
        "temporal": {"total": 0, "top1": 0, "top3": 0, "top5": 0, "rr": []},
        "zero_lexical_overlap": {"total": 0, "top1": 0, "top3": 0, "top5": 0, "rr": []},
    }

    eval_items = []

    print(f"\n=======================================================")
    print(f"  RUNNING BENCHMARK OVER {total_queries} GROUND TRUTH QUERIES")
    print(f"=======================================================\n")

    for idx, q_item in enumerate(queries):
        qid = q_item["id"]
        cat = q_item["category"]
        query_text = q_item["query"]
        target_id = q_item["target_message_id"]

        t0 = time.time()
        search_res = engine.search(query=query_text, top_k=top_k)
        elapsed_ms = (time.time() - t0) * 1000
        latencies_ms.append(elapsed_ms)

        retrieved_ids = [r["message"]["id"] for r in search_res["results"]]

        # Find target rank
        rank = -1
        if target_id in retrieved_ids:
            rank = retrieved_ids.index(target_id) + 1  # 1-indexed

        # Metrics
        is_top1 = (rank == 1)
        is_top3 = (1 <= rank <= 3)
        is_top5 = (1 <= rank <= 5)
        rr = (1.0 / rank) if rank > 0 else 0.0

        if is_top1:
            top1_hits += 1
        if is_top3:
            top3_hits += 1
        if is_top5:
            top5_hits += 1
        reciprocal_ranks.append(rr)

        # Update category stats
        if cat in category_stats:
            cs = category_stats[cat]
            cs["total"] += 1
            if is_top1:
                cs["top1"] += 1
            if is_top3:
                cs["top3"] += 1
            if is_top5:
                cs["top5"] += 1
            cs["rr"].append(rr)

        eval_items.append({
            "id": qid,
            "category": cat,
            "query": query_text,
            "target_message_id": target_id,
            "target_text": q_item["target_msg"],
            "rank": rank,
            "is_top1": is_top1,
            "is_top3": is_top3,
            "is_top5": is_top5,
            "reciprocal_rank": rr,
            "latency_ms": round(elapsed_ms, 2),
            "top_retrieved": [
                {
                    "rank": r["rank"],
                    "id": r["message"]["id"],
                    "sender": r["message"]["sender"],
                    "text": r["message"]["text"],
                    "score": round(r["score"], 4)
                }
                for r in search_res["results"][:3]
            ]
        })

        status_marker = "✓ [TOP-1]" if is_top1 else ("✓ [TOP-3]" if is_top3 else ("✓ [TOP-5]" if is_top5 else "✗ [MISS]"))
        print(f"[{idx+1:02d}/{total_queries}] {status_marker:10s} Rank: {rank if rank > 0 else '>5':3} | {cat:20s} | '{query_text}'")

    # Aggregate summaries
    overall_summary = {
        "total_queries": total_queries,
        "top1_accuracy": round(top1_hits / total_queries, 4),
        "recall_at_3": round(top3_hits / total_queries, 4),
        "recall_at_5": round(top5_hits / total_queries, 4),
        "mrr": round(sum(reciprocal_ranks) / total_queries, 4),
        "avg_latency_ms": round(sum(latencies_ms) / total_queries, 2),
        "categories": {
            cat: {
                "total": cs["total"],
                "top1_accuracy": round(cs["top1"] / cs["total"], 4) if cs["total"] > 0 else 0,
                "recall_at_3": round(cs["top3"] / cs["total"], 4) if cs["total"] > 0 else 0,
                "recall_at_5": round(cs["top5"] / cs["total"], 4) if cs["total"] > 0 else 0,
                "mrr": round(sum(cs["rr"]) / cs["total"], 4) if cs["total"] > 0 else 0,
            }
            for cat, cs in category_stats.items()
        },
        "query_evaluations": eval_items
    }

    print("\n=======================================================")
    print("                 BENCHMARK SCORECARD                   ")
    print("=======================================================")
    print(f"  Total Queries Tested:       {total_queries}")
    print(f"  Top-1 Accuracy:             {overall_summary['top1_accuracy'] * 100:.1f}% ({top1_hits}/{total_queries})")
    print(f"  Recall@3 (Hit Rate @ 3):    {overall_summary['recall_at_3'] * 100:.1f}% ({top3_hits}/{total_queries})")
    print(f"  Recall@5 (Hit Rate @ 5):    {overall_summary['recall_at_5'] * 100:.1f}% ({top5_hits}/{total_queries})")
    print(f"  Mean Reciprocal Rank (MRR): {overall_summary['mrr']:.4f}")
    print(f"  Average Query Latency:      {overall_summary['avg_latency_ms']:.2f} ms")
    print("-------------------------------------------------------")
    print("  Category Performance:")
    for cat, metrics in overall_summary["categories"].items():
        print(f"    {cat.replace('_', ' ').title():24s} -> Top-1: {metrics['top1_accuracy']*100:5.1f}% | Recall@5: {metrics['recall_at_5']*100:5.1f}% | MRR: {metrics['mrr']:.4f}")
    print("=======================================================\n")

    # Save to disk
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(overall_summary, f, indent=2)
    print(f"Benchmark results saved to {RESULTS_FILE}")

    return overall_summary


if __name__ == "__main__":
    evaluate_rag_engine()
