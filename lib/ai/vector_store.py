"""
Sculptor Vector Store — Lightweight FAISS-based knowledge retrieval.
Replaces pgvector dependency with pure Python stack: FAISS + sentence-transformers.

Architecture:
  Knowledge Items → bge-m3 embeddings → FAISS index → cosine similarity search
"""

import json
import os
import pickle
import numpy as np
from typing import List, Optional, Dict, Any
from pathlib import Path

# ── Configuration ──────────────────────────────────────────────

VECTOR_STORE_DIR = Path(os.environ.get("SCULPTOR_VECTOR_DIR", os.path.expanduser("~/.sculptor/vectors")))
INDEX_FILE = VECTOR_STORE_DIR / "knowledge.index"
META_FILE = VECTOR_STORE_DIR / "knowledge.meta.json"
EMBEDDING_MODEL = "BAAI/bge-m3"  # Can be overridden with SCULPTOR_EMBEDDING_MODEL

# ── Knowledge Item ─────────────────────────────────────────────

class KnowledgeItem:
    """A single piece of knowledge with its embedding."""
    def __init__(self, text: str, source: str, domain: str, confidence: float, metadata: Optional[Dict] = None):
        self.text = text
        self.source = source
        self.domain = domain
        self.confidence = confidence
        self.metadata = metadata or {}
        self.embedding: Optional[np.ndarray] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "source": self.source,
            "domain": self.domain,
            "confidence": self.confidence,
            "metadata": self.metadata,
        }


class VectorStore:
    """FAISS-based vector store for Sculptor knowledge retrieval."""

    def __init__(self, model_name: str = EMBEDDING_MODEL):
        self.model_name = model_name
        self.model = None  # Lazy loaded
        self.index = None
        self.items: List[KnowledgeItem] = []
        self.dimension: Optional[int] = None

    def _load_model(self):
        """Lazy-load the embedding model."""
        if self.model is not None:
            return
        from sentence_transformers import SentenceTransformer
        print(f"[VectorStore] Loading embedding model: {self.model_name}")
        self.model = SentenceTransformer(self.model_name)
        print(f"[VectorStore] Model loaded. Dimension: {self.model.get_sentence_embedding_dimension()}")

    def _ensure_dir(self):
        """Ensure vector store directory exists."""
        VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)

    def embed(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for a list of texts."""
        self._load_model()
        embeddings = self.model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return np.array(embeddings).astype('float32')

    def add_items(self, items: List[KnowledgeItem]) -> int:
        """Add knowledge items to the index. Returns number of items added."""
        if not items:
            return 0

        self._ensure_dir()

        # Generate embeddings
        texts = [item.text for item in items]
        embeddings = self.embed(texts)

        # Store items with embeddings
        for item, emb in zip(items, embeddings):
            item.embedding = emb
            self.items.append(item)

        # Build or update FAISS index
        self._rebuild_index()
        self._save()

        return len(items)

    def _rebuild_index(self):
        """Rebuild FAISS index from all stored items."""
        import faiss

        if not self.items:
            return

        all_embeddings = np.stack([item.embedding for item in self.items if item.embedding is not None])
        if len(all_embeddings) == 0:
            return

        self.dimension = all_embeddings.shape[1]

        # Use IndexFlatIP for inner product (cosine similarity with normalized vectors)
        self.index = faiss.IndexFlatIP(self.dimension)
        self.index.add(all_embeddings)

    def search(self, query: str, k: int = 5, min_confidence: float = 0.0) -> List[Dict[str, Any]]:
        """
        Search for knowledge items relevant to the query.
        Returns list of {item, score} dicts sorted by relevance.
        """
        if not self.items or self.index is None:
            return []

        import faiss

        # Generate query embedding
        query_emb = self.embed([query])[0].reshape(1, -1)

        # Search
        scores, indices = self.index.search(query_emb, min(k, len(self.items)))

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.items):
                continue
            if score < min_confidence:
                continue
            item = self.items[idx]
            results.append({
                "text": item.text,
                "source": item.source,
                "domain": item.domain,
                "confidence": float(score),
                "original_confidence": item.confidence,
                "metadata": item.metadata,
            })

        return results

    def _save(self):
        """Persist index and metadata to disk."""
        import faiss

        self._ensure_dir()

        # Save FAISS index
        if self.index is not None:
            faiss.write_index(self.index, str(INDEX_FILE))

        # Save metadata
        meta = {
            "model_name": self.model_name,
            "dimension": self.dimension,
            "count": len(self.items),
            "items": [item.to_dict() for item in self.items],
        }
        with open(META_FILE, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

    def load(self) -> bool:
        """Load index and metadata from disk. Returns True if successful."""
        import faiss

        if not INDEX_FILE.exists() or not META_FILE.exists():
            return False

        try:
            # Load FAISS index
            self.index = faiss.read_index(str(INDEX_FILE))
            self.dimension = self.index.d

            # Load metadata
            with open(META_FILE, "r", encoding="utf-8") as f:
                meta = json.load(f)

            self.model_name = meta.get("model_name", EMBEDDING_MODEL)
            self.items = []
            for item_dict in meta.get("items", []):
                item = KnowledgeItem(
                    text=item_dict["text"],
                    source=item_dict["source"],
                    domain=item_dict["domain"],
                    confidence=item_dict.get("confidence", 0.8),
                    metadata=item_dict.get("metadata", {}),
                )
                self.items.append(item)

            print(f"[VectorStore] Loaded {len(self.items)} items from disk")
            return True
        except Exception as e:
            print(f"[VectorStore] Load failed: {e}")
            self.index = None
            self.items = []
            return False

    def get_stats(self) -> Dict[str, Any]:
        """Get store statistics."""
        domains = {}
        for item in self.items:
            domains[item.domain] = domains.get(item.domain, 0) + 1

        return {
            "total_items": len(self.items),
            "dimension": self.dimension,
            "model": self.model_name,
            "domains": domains,
        }


# ── Global store instance ──────────────────────────────────────

_store: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    """Get or create the global vector store instance."""
    global _store
    if _store is None:
        model = os.environ.get("SCULPTOR_EMBEDDING_MODEL", EMBEDDING_MODEL)
        _store = VectorStore(model_name=model)
        if not _store.load():
            print("[VectorStore] No existing index found. Run ingest_knowledge() to populate.")
    return _store
