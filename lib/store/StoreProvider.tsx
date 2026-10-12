"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initialState, STATE_VERSION, type AppState } from "./state";

/**
 * Persistencia DEMO en localStorage (por navegador). Es un caché/outbox local:
 * la fuente operacional definitiva debe ser Monday u otro backend (ver lib/integrations/monday.ts).
 */
const KEY = "aet-platform:state";

interface StoreCtx {
  state: AppState;
  hydrated: boolean;
  /** Ejecuta una acción pura. Devuelve un mensaje de error si la acción fue rechazada. */
  run: (fn: (s: AppState) => AppState) => string | null;
  reset: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

function load(): AppState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    return parsed.version === STATE_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function save(s: AppState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* almacenamiento no disponible: la demo sigue en memoria */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const ref = useRef(state);

  useEffect(() => {
    const loaded = load();
    if (loaded) {
      ref.current = loaded;
      setState(loaded);
    }
    setHydrated(true);
  }, []);

  const run = useCallback((fn: (s: AppState) => AppState) => {
    try {
      const next = fn(ref.current);
      ref.current = next;
      setState(next);
      save(next);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }, []);

  const reset = useCallback(() => {
    const s = initialState();
    ref.current = s;
    setState(s);
    save(s);
  }, []);

  return <Ctx.Provider value={{ state, hydrated, run, reset }}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore fuera de StoreProvider");
  return c;
}
