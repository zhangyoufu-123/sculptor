/**
 * Sculptor Python Retrieval Bridge
 *
 * Calls the Python vector store/search service via subprocess.
 * This bridges the TypeScript RetrieverAgent to the FAISS-based
 * knowledge store running in Python.
 */

import { execSync } from "child_process";
import path from "path";

const RETRIEVE_SCRIPT = path.join(
  process.cwd(),
  "lib/ai/retrieve.py"
);

export interface PythonSearchResult {
  text: string;
  source: string;
  domain: string;
  confidence: number;
  original_confidence: number;
  metadata?: Record<string, unknown>;
}

export interface PythonSearchResponse {
  results: PythonSearchResult[];
  count: number;
  query: string;
  error?: string;
}

/**
 * Search the FAISS vector store via Python subprocess.
 */
export function pythonSearch(
  query: string,
  k: number = 5,
  domain?: string
): PythonSearchResponse {
  try {
    const request = JSON.stringify({
      command: "search",
      query,
      k,
      domain,
    });

    const result = execSync(`python3 "${RETRIEVE_SCRIPT}"`, {
      input: request,
      encoding: "utf-8",
      timeout: 30000, // 30s timeout for embedding generation
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });

    return JSON.parse(result.trim());
  } catch (error: any) {
    console.error("[Retrieval Bridge] Python search failed:", error.message);
    return { results: [], count: 0, query, error: error.message };
  }
}

/**
 * Ingest mock knowledge into the vector store.
 */
export function pythonIngest(): { ingested: number; stats: any; error?: string } {
  try {
    const request = JSON.stringify({ command: "ingest" });

    const result = execSync(`python3 "${RETRIEVE_SCRIPT}"`, {
      input: request,
      encoding: "utf-8",
      timeout: 120000, // 2 min timeout for model loading + embedding
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });

    return JSON.parse(result.trim());
  } catch (error: any) {
    console.error("[Retrieval Bridge] Python ingest failed:", error.message);
    return { ingested: 0, stats: {}, error: error.message };
  }
}

/**
 * Get vector store statistics.
 */
export function pythonStats(): Record<string, any> {
  try {
    const request = JSON.stringify({ command: "stats" });

    const result = execSync(`python3 "${RETRIEVE_SCRIPT}"`, {
      input: request,
      encoding: "utf-8",
      timeout: 5000,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });

    return JSON.parse(result.trim());
  } catch (error: any) {
    console.error("[Retrieval Bridge] Python stats failed:", error.message);
    return { error: error.message };
  }
}
