"use client";

import { useState, useRef, useCallback } from "react";
import type { ArchitectNode } from "@/types/architect";

interface AutocompleteState {
  suggestions: string[];
  loading: boolean;
  visible: boolean;
}

/**
 * useArchitectAutocomplete — 800ms 打字暂停后触发补全请求
 *
 * Usage:
 *   const { suggestions, loading, visible, trigger, accept, dismiss } = useArchitectAutocomplete();
 *
 *   // In input onChange:
 *   trigger(partialText, nodeId, nodes);
 *
 *   // Tab key:
 *   const accepted = accept();
 *   if (accepted) fillInput(accepted);
 */
export function useArchitectAutocomplete() {
  const [state, setState] = useState<AutocompleteState>({
    suggestions: [],
    loading: false,
    visible: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const trigger = useCallback(
    (partialText: string, nodeId: string, allNodes: ArchitectNode[]) => {
      // Clear previous timer
      if (timerRef.current) clearTimeout(timerRef.current);
      // Cancel previous request
      if (controllerRef.current) controllerRef.current.abort();

      // Hide if text too short
      if (!partialText || partialText.length < 2) {
        setState({ suggestions: [], loading: false, visible: false });
        return;
      }

      setState((prev) => ({ ...prev, loading: true, visible: false }));

      timerRef.current = setTimeout(async () => {
        const target = allNodes.find((n) => n.id === nodeId);
        if (!target) {
          setState({ suggestions: [], loading: false, visible: false });
          return;
        }

        // Find parent
        const parent = allNodes.find((n) =>
          n.children?.includes(nodeId)
        );

        // Find siblings
        const parentChildren = parent?.children || [];
        const siblingTitles = parentChildren
          .filter((cid) => cid !== nodeId)
          .map((cid) => allNodes.find((n) => n.id === cid)?.label || "")
          .filter(Boolean);

        // Find article theme from root node
        const rootNode = allNodes.find(
          (n) => n.type === "thesis" || !allNodes.some((o) => o.children?.includes(n.id))
        );
        const articleTheme = rootNode?.label || "";

        controllerRef.current = new AbortController();
        try {
          const r = await fetch("/api/architect/autocomplete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              partialText,
              nodeType: target.type,
              parentTitle: parent?.label || "",
              siblingTitles,
              articleTheme,
            }),
            signal: controllerRef.current.signal,
          });
          if (r.ok) {
            const d = await r.json();
            setState({
              suggestions: d.suggestions || [],
              loading: false,
              visible: !!(d.suggestions?.length),
            });
          } else {
            setState({ suggestions: [], loading: false, visible: false });
          }
        } catch {
          // Aborted or network error — don't update
        }
      }, 800);
    },
    []
  );

  const accept = useCallback((): string | null => {
    const first = state.suggestions[0] || null;
    setState({ suggestions: [], loading: false, visible: false });
    return first;
  }, [state.suggestions]);

  const dismiss = useCallback(() => {
    setState({ suggestions: [], loading: false, visible: false });
  }, []);

  return {
    suggestions: state.suggestions,
    firstSuggestion: state.suggestions[0] || "",
    loading: state.loading,
    visible: state.visible,
    trigger,
    accept,
    dismiss,
  };
}
