"""
Sculptor Vector Store — Zero-dependency knowledge retrieval.
Uses character-level n-gram TF-IDF + cosine similarity.
No models to download. No external services. Pure Python.

Architecture:
  Knowledge Items → char n-gram TF-IDF vectors → cosine similarity search
"""

import json
import os
import math
import pickle
from pathlib import Path
from typing import List, Optional, Dict, Any

# ── Configuration ──────────────────────────────────────────────

VECTOR_STORE_DIR = Path(os.environ.get("SCULPTOR_VECTOR_DIR", os.path.expanduser("~/.sculptor/vectors")))
INDEX_FILE = VECTOR_STORE_DIR / "knowledge.index"
META_FILE = VECTOR_STORE_DIR / "knowledge.meta.json"


# ── TF-IDF Vectorizer ──────────────────────────────────────────

class TfidfVectorizer:
    """
    Character n-gram TF-IDF vectorizer for Chinese text.
    No external dependencies — pure Python + numpy.
    """

    def __init__(self, ngram_range=(2, 4), max_features=5000):
        self.ngram_range = ngram_range
        self.max_features = max_features
        self.vocabulary: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self._fitted = False

    def _char_ngrams(self, text: str) -> List[str]:
        """Generate character n-grams from Chinese text."""
        # Strip punctuation and spaces
        cleaned = ""
        for ch in text:
            if ch.isalpha() or '\u4e00' <= ch <= '\u9fff' or '\u3400' <= ch <= '\u4dbf':
                cleaned += ch

        ngrams = []
        for n in range(self.ngram_range[0], min(self.ngram_range[1] + 1, len(cleaned) + 1)):
            for i in range(len(cleaned) - n + 1):
                ngrams.append(cleaned[i:i + n])
        return ngrams

    def fit(self, texts: List[str]):
        """Build vocabulary and compute IDF from corpus."""
        # Count document frequency for each n-gram
        df: Dict[str, int] = {}
        N = len(texts)

        for text in texts:
            seen = set()
            for gram in self._char_ngrams(text):
                if gram not in seen:
                    df[gram] = df.get(gram, 0) + 1
                    seen.add(gram)

        # Select top ngrams by document frequency
        sorted_grams = sorted(df.items(), key=lambda x: -x[1])
        selected = sorted_grams[:self.max_features]

        # Build vocabulary
        self.vocabulary = {gram: idx for idx, (gram, _) in enumerate(selected)}

        # Compute IDF
        self.idf = {}
        for gram, idx in self.vocabulary.items():
            self.idf[gram] = math.log((N + 1) / (df[gram] + 1)) + 1.0

        self._fitted = True

    def transform(self, texts: List[str]) -> 'np.ndarray':
        """Convert texts to TF-IDF vectors."""
        import numpy as np

        if not self._fitted:
            raise ValueError("Vectorizer not fitted. Call fit() first.")

        n = len(texts)
        m = len(self.vocabulary)
        result = np.zeros((n, m), dtype=np.float32)

        for i, text in enumerate(texts):
            ngrams = self._char_ngrams(text)
            # TF counts
            tf: Dict[int, int] = {}
            for gram in ngrams:
                idx = self.vocabulary.get(gram)
                if idx is not None:
                    tf[idx] = tf.get(idx, 0) + 1

            # TF-IDF
            max_tf = max(tf.values()) if tf else 1
            for idx, count in tf.items():
                gram = list(self.vocabulary.keys())[list(self.vocabulary.values()).index(idx)]
                result[i, idx] = (count / max_tf) * self.idf.get(gram, 1.0)

        # L2 normalize
        norms = np.linalg.norm(result, axis=1, keepdims=True)
        norms[norms == 0] = 1
        result = result / norms

        return result

    def save(self, filepath: Path):
        """Save vectorizer state."""
        data = {
            "ngram_range": self.ngram_range,
            "max_features": self.max_features,
            "vocabulary": self.vocabulary,
            "idf": self.idf,
        }
        with open(filepath, "wb") as f:
            pickle.dump(data, f)

    def load(self, filepath: Path) -> bool:
        """Load vectorizer state."""
        if not filepath.exists():
            return False
        try:
            with open(filepath, "rb") as f:
                data = pickle.load(f)
            self.ngram_range = data["ngram_range"]
            self.max_features = data["max_features"]
            self.vocabulary = data["vocabulary"]
            self.idf = data["idf"]
            self._fitted = True
            return True
        except Exception:
            return False


# ── Knowledge Item ─────────────────────────────────────────────

class KnowledgeItem:
    def __init__(self, text: str, source: str, domain: str, confidence: float, metadata: Optional[Dict] = None):
        self.text = text
        self.source = source
        self.domain = domain
        self.confidence = confidence
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "source": self.source,
            "domain": self.domain,
            "confidence": self.confidence,
            "metadata": self.metadata,
        }


# ── Vector Store ────────────────────────────────────────────────

class VectorStore:
    """TF-IDF based vector store for Sculptor knowledge retrieval."""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(ngram_range=(2, 4), max_features=3000)
        self.items: List[KnowledgeItem] = []
        self.matrix: Optional['np.ndarray'] = None

    def _ensure_dir(self):
        VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)

    def add_items(self, items: List[KnowledgeItem]) -> int:
        """Add knowledge items and rebuild index."""
        if not items:
            return 0

        self._ensure_dir()
        self.items.extend(items)

        # Fit vectorizer on all texts and transform
        import numpy as np
        all_texts = [item.text for item in self.items]

        if len(self.items) <= len(items):
            # First batch — fit from scratch
            self.vectorizer.fit(all_texts)
            self.matrix = self.vectorizer.transform(all_texts)
        else:
            # Additional batch — re-fit everything
            self.vectorizer.fit(all_texts)
            self.matrix = self.vectorizer.transform(all_texts)

        self._save()
        return len(items)

    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Search by cosine similarity. Returns top-k results."""
        import numpy as np

        if not self.items or self.matrix is None:
            return []

        # Transform query
        query_vec = self.vectorizer.transform([query])[0]

        # Cosine similarity (vectors are already L2-normalized)
        scores = np.dot(self.matrix, query_vec)

        # Get top-k indices
        if k >= len(scores):
            top_indices = np.argsort(-scores)
        else:
            top_indices = np.argpartition(-scores, k)[:k]
            top_indices = top_indices[np.argsort(-scores[top_indices])]

        results = []
        for idx in top_indices:
            score = float(scores[idx])
            if score < 0.05:  # Minimum similarity threshold
                continue
            item = self.items[idx]
            results.append({
                "text": item.text,
                "source": item.source,
                "domain": item.domain,
                "confidence": score,
                "original_confidence": item.confidence,
                "metadata": item.metadata,
            })

        return results[:k]

    def _save(self):
        """Persist to disk."""
        import numpy as np

        self._ensure_dir()

        # Save matrix
        if self.matrix is not None:
            np.save(str(INDEX_FILE).replace(".index", ".npy"), self.matrix)

        # Save vectorizer
        self.vectorizer.save(Path(str(INDEX_FILE).replace(".index", ".vec")))

        # Save metadata
        meta = {
            "count": len(self.items),
            "items": [item.to_dict() for item in self.items],
        }
        with open(META_FILE, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

    def load(self) -> bool:
        """Load from disk."""
        import numpy as np

        matrix_path = Path(str(INDEX_FILE).replace(".index", ".npy"))
        vec_path = Path(str(INDEX_FILE).replace(".index", ".vec"))

        if not matrix_path.exists() or not META_FILE.exists():
            return False

        try:
            # Load matrix
            self.matrix = np.load(str(matrix_path))

            # Load vectorizer
            if not self.vectorizer.load(vec_path):
                return False

            # Load metadata
            with open(META_FILE, "r", encoding="utf-8") as f:
                meta = json.load(f)

            self.items = []
            for item_dict in meta.get("items", []):
                self.items.append(KnowledgeItem(
                    text=item_dict["text"],
                    source=item_dict["source"],
                    domain=item_dict["domain"],
                    confidence=item_dict.get("confidence", 0.8),
                    metadata=item_dict.get("metadata", {}),
                ))

            return True
        except Exception as e:
            print(f"[VectorStore] Load failed: {e}")
            self.items = []
            self.matrix = None
            return False

    def get_stats(self) -> Dict[str, Any]:
        domains = {}
        for item in self.items:
            domains[item.domain] = domains.get(item.domain, 0) + 1

        return {
            "total_items": len(self.items),
            "feature_count": len(self.vectorizer.vocabulary),
            "ngram_range": self.vectorizer.ngram_range,
            "domains": domains,
        }


# ── Global store ───────────────────────────────────────────────

_store: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    global _store
    if _store is None:
        _store = VectorStore()
        if not _store.load():
            pass  # Will be populated by ingest
    return _store
