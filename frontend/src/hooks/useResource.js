import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

// Fetches a family-scoped (or any) resource. Re-fetches when path changes.
export function useResource(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      const r = await api.get(path);
      setData(r.data);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    if (path) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  return { data, loading, reload, setData };
}
