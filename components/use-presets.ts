"use client";
import { useEffect, useState } from "react";
import { emptyPresets, presetKey, readPresets, type Presets } from "../lib/presets";
export function usePresets() {
  const [presets, setPresets] = useState<Presets>(emptyPresets);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    function load() {
      try { setPresets(readPresets()); setError(""); }
      catch { setError("Não foi possível ler as configurações. Os dados existentes foram preservados."); }
      setLoaded(true);
    }
    load();
    const sync = (event: StorageEvent) => { if (!event.key || event.key === presetKey) load(); };
    window.addEventListener("storage", sync);
    window.addEventListener("ygprint:presets-changed", load);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("ygprint:presets-changed", load); };
  }, []);
  return { presets, loaded, error };
}
