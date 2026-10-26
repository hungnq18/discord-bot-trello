import { useCallback, useEffect, useState } from 'react';

// Load data on mount (and on demand). Errors are returned, not thrown.
export function useAsync(fn, deps = []) {
  const [state, set] = useState({ data: null, error: null, loading: true });
  const run = useCallback(() => {
    set((s) => ({ ...s, loading: true }));
    return fn().then(
      (data) => set({ data, error: null, loading: false }),
      (error) => set({ data: null, error, loading: false }),
    );
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}
