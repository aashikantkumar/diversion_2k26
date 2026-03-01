import { useState, useCallback } from "react";
import api from "../lib/api";
import type { AxiosRequestConfig } from "axios";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic reusable hook for API calls.
 * Returns { data, loading, error, execute, reset }.
 */
export function useApi<T = unknown>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (
      method: "get" | "post" | "put" | "delete",
      url: string,
      payload?: unknown,
      config?: AxiosRequestConfig
    ): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });
      try {
        const res =
          method === "get" || method === "delete"
            ? await api[method]<T>(url, config)
            : await api[method]<T>(url, payload, config);
        setState({ data: res.data, loading: false, error: null });
        return res.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState({ data: null, loading: false, error: message });
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
