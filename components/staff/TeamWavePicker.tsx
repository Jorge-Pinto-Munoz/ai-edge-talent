"use client";

import { useRouter } from "next/navigation";
import type { ShellWave } from "@/components/admin/AdminShell";
import { WavePicker } from "@/components/admin/WavePicker";

/** Selector de Wave del área de equipo (mismo orden y diseño que el portal). */
export function TeamWavePicker({ waves, value }: { waves: ShellWave[]; value: string }) {
  const router = useRouter();
  return <WavePicker waves={waves} value={value} onChange={(id) => router.push(`/equipo?wave=${id}`)} />;
}
