"use client";

import { useRouter } from "next/navigation";
import type { ShellWave } from "@/components/admin/AdminShell";
import { WavePicker } from "@/components/admin/WavePicker";

/** Selector de Wave del área de equipo (mismo orden y diseño que el portal). */
/** `hrefBase`: destino con sus parámetros (p. ej. la vista previa del admin); se le agrega la Wave. */
export function TeamWavePicker({ waves, value, hrefBase = "/equipo?" }: { waves: ShellWave[]; value: string; hrefBase?: string }) {
  const router = useRouter();
  return <WavePicker waves={waves} value={value} onChange={(id) => router.push(`${hrefBase}wave=${id}`)} />;
}
