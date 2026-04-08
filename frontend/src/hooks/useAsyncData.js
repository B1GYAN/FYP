import { useEffect, useState } from "react";

export default function useAsyncData(loader) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        setLoading(true);
        setError("");
        const result = await loader();
        if (active) {
          setData(result);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Failed to load data");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [loader]);

  return {
    data,
    setData,
    loading,
    error,
  };
}
