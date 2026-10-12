"use client";

import { useStore } from "@/lib/store/StoreProvider";

export function useCurrentApp() {
  const { state, hydrated } = useStore();
  const app = state.applications.find((a) => a.id === state.session.currentApplicationId) ?? null;
  const wave = app ? state.waves.find((w) => w.id === app.waveId) ?? null : null;
  return { app, wave, hydrated, state };
}
