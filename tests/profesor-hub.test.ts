import { describe, expect, it } from "vitest";
import { attendanceByPerson, classDateLabel } from "@/lib/teacher/rules";
import { labDecisionLabel, labStatusLabel } from "@/lib/hub/rules";
import { advanceGate } from "@/lib/journey/rules";

describe("registro de clases del profesor", () => {
  const classes = [
    { id: "c1", held_on: "2026-09-30" },
    { id: "c2", held_on: "2026-10-07" },
    { id: "c3", held_on: "2026-10-14" },
    { id: "c4", held_on: "2026-10-21" },
  ];
  const mark = (cand: string, pattern: string) => pattern.split("").map((x, i) => ({ class_id: classes[i].id, candidate_id: cand, attended: x === "1" }));
  const rows = [...mark("ana", "1100"), ...mark("beto", "0101"), ...mark("caro", "1110"), ...mark("dani", "1111")];
  const by = (id: string) => attendanceByPerson([...classes].reverse(), rows, ["ana", "beto", "caro", "dani", "eva"]).find((p) => p.candidateId === id)!;

  it("dos clases seguidas sin asistir es alerta alta", () => {
    expect(by("ana").streak).toBe(2);
    expect(by("ana").alert).toEqual({ level: "high", reason: "2 clases seguidas sin asistir" });
  });
  it("asistencia bajo 75% con 3+ clases es alerta media", () => {
    expect(by("beto").rate).toBe(0.5);
    expect(by("beto").alert?.level).toBe("medium");
  });
  it("faltar solo a la última es aviso leve", () => {
    expect(by("caro").alert).toEqual({ level: "low", reason: "No asistió a la última clase" });
  });
  it("asistencia completa o sin registro no alerta", () => {
    expect(by("dani").alert).toBeNull();
    expect(by("eva")).toMatchObject({ recorded: 0, rate: null, alert: null });
  });
  it("rotula la fecha de la clase", () => {
    expect(classDateLabel("2026-10-14")).toBe("mié 14 oct");
  });
});

describe("AI Lab", () => {
  const ctx = { admissionStatus: "MINDSET_READY", requiredMindsetCapsules: [], approvedCapsules: [] };
  it("solo pasa al Lab con AI CERT aprobada y verificada", () => {
    expect(advanceGate("ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", { ...ctx, certification: { result: "PASSED", status: "VERIFIED" } }).ok).toBe(true);
    expect(advanceGate("ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", { ...ctx, certification: { result: "PASSED", status: "PENDING_REVIEW" } }).ok).toBe(false);
    expect(advanceGate("ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", { ...ctx, certification: null }).ok).toBe(false);
  });
  it("rotula estados y decisiones", () => {
    expect(labStatusLabel("READY")).toBe("Listo para Showcase");
    expect(labDecisionLabel("PILOTO")).toBe("Piloto con el cliente");
    expect(labDecisionLabel(null)).toBeNull();
  });
});
