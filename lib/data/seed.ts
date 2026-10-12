import type { AdmissionEvent, ApplicationRecord, Nomination } from "@/lib/domain/types";

/** Participantes y nominaciones DEMO para Wave 3. Nombres ficticios. */
const t = "2026-10-05T10:00:00-03:00";

export const SEED_NOMINATIONS: Nomination[] = [
  {
    id: "nom-001",
    waveId: "wave-3",
    clientId: "cli-alfa",
    nomineeName: "Camila Demo Rojas",
    nomineeEmail: "camila.demo@kibernum.example",
    role: "QA Analyst",
    team: "Canales digitales",
    reason: "Ya automatiza casos de prueba con IA y comparte prácticas con el equipo.",
    applicationOpportunity: "Generación de datos sintéticos para regresión.",
    estimatedAvailability: "2–3 h/semana",
    nominatedBy: "Sponsor Demo Alfa",
    nominatedAt: t,
    status: "INVITED",
    reviewedBy: "Delivery Demo 1",
    invitationToken: "demo-camila-7f3a",
    invitedAt: t,
  },
  {
    id: "nom-002",
    waveId: "wave-3",
    clientId: "cli-alfa",
    nomineeName: "Diego Demo Fuentes",
    nomineeEmail: "diego.demo@kibernum.example",
    role: "Developer",
    reason: "Interés en IA aplicada a code review.",
    applicationOpportunity: "Reducir tiempo de revisión de PRs.",
    estimatedAvailability: "2 h/semana",
    nominatedBy: "Sponsor Demo Alfa",
    nominatedAt: t,
    status: "NOMINATED",
  },
  {
    id: "nom-003",
    waveId: "wave-3",
    clientId: "cli-beta",
    nomineeName: "Valentina Demo Soto",
    nomineeEmail: "valentina.demo@kibernum.example",
    role: "Scrum Master",
    reason: "Lidera la adopción de métricas predictivas en su equipo.",
    applicationOpportunity: "Automatizar reportes de flujo.",
    estimatedAvailability: "3 h/semana",
    nominatedBy: "Sponsor Demo Beta",
    nominatedAt: t,
    status: "INVITED",
    reviewedBy: "Delivery Demo 2",
    invitationToken: "demo-valentina-21bc",
    invitedAt: t,
  },
];

const app = (p: Partial<ApplicationRecord> & Pick<ApplicationRecord, "id" | "participantName" | "applicationStatus" | "client" | "role">): ApplicationRecord => ({
  waveId: "wave-3",
  corporateEmail: `${p.id}@kibernum.example`,
  journeyStage: null,
  createdAt: t,
  updatedAt: t,
  ...p,
});

export const SEED_APPLICATIONS: ApplicationRecord[] = [
  app({ id: "app-101", participantName: "Valentina Demo Soto", applicationStatus: "APPLICATION_STARTED", client: "Cliente Demo Beta", role: "Scrum Master", nominationId: "nom-003", deliveryOwner: "Delivery Demo 2" }),
  app({
    id: "app-102",
    participantName: "Tomás Demo Vera",
    applicationStatus: "APPLICATION_SUBMITTED",
    client: "Cliente Demo Alfa",
    role: "Data Analyst",
    deliveryOwner: "Delivery Demo 1",
  }),
  app({
    id: "app-103",
    participantName: "Ignacia Demo Pérez",
    applicationStatus: "RESCUE_REQUIRED",
    client: "Cliente Demo Beta",
    role: "Developer",
    deliveryOwner: "Delivery Demo 2",
    evaluation: { outcome: "RESCUE_REQUIRED", evaluatedBy: "Hub AI (demo)", evaluatedAt: t, scores: { "real-use": 18, depth: 14, reframe: 15, autonomy: 8, disposition: 7 }, total: 62 },
  }),
  app({
    id: "app-104",
    participantName: "Martín Demo Lagos",
    applicationStatus: "CONDITIONS_PENDING",
    client: "Cliente Demo Alfa",
    role: "Developer",
    deliveryOwner: "Delivery Demo 1",
    evaluation: { outcome: "SELECTED", evaluatedBy: "Hub AI (demo)", evaluatedAt: t, scores: { "real-use": 22, depth: 25, reframe: 20, autonomy: 10, disposition: 7 }, total: 84 },
  }),
];

export const SEED_EVENTS: AdmissionEvent[] = SEED_APPLICATIONS.map((a) => ({
  id: `evt-seed-${a.id}`,
  applicationId: a.id,
  waveId: a.waveId,
  from: null,
  to: a.applicationStatus,
  at: t,
  by: "seed (demo)",
  note: "Estado inicial de demostración",
}));
