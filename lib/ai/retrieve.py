"""
Sculptor Retrieval Service — Python-side search API for the vector store.
Called by the TypeScript RetrieverAgent via subprocess.
"""

import json
import sys
import os
from pathlib import Path

# Add project root
_project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_project_root))

from lib.ai.vector_store import get_vector_store
from lib.ai.ingest import search as vs_search, ingest_mock_knowledge


def search(args: dict) -> dict:
    """Search vector store. Called via JSON on stdin."""
    query = args.get("query", "")
    k = args.get("k", 5)
    domain_filter = args.get("domain", None)

    results = vs_search(query, k=k)

    # Filter by domain if specified
    if domain_filter:
        results = [r for r in results if r.get("domain") == domain_filter]

    return {
        "results": results,
        "count": len(results),
        "query": query,
    }


def ingest(args: dict) -> dict:
    """Ingest mock knowledge into the store."""
    count = ingest_mock_knowledge()
    store = get_vector_store()
    stats = store.get_stats()
    return {"ingested": count, "stats": stats}


def stats(args: dict) -> dict:
    """Return store statistics."""
    store = get_vector_store()
    return store.get_stats()


COMMANDS = {
    "search": search,
    "ingest": ingest,
    "stats": stats,
}


if __name__ == "__main__":
    # Read JSON command from stdin
    raw = sys.stdin.read()
    if not raw:
        print(json.dumps({"error": "No input"}))
        sys.exit(1)

    try:
        request = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}))
        sys.exit(1)

    command = request.get("command", "search")
    handler = COMMANDS.get(command)

    if handler is None:
        print(json.dumps({"error": f"Unknown command: {command}"}))
        sys.exit(1)

    try:
        result = handler(request)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
