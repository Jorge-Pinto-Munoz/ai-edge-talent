/** Estados en que la persona ya está inscrita y ve su journey (antes, ve su postulación). */
export const JOURNEY_STATUSES = ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"] as const;
export const inJourney = (status: string) => (JOURNEY_STATUSES as readonly string[]).includes(status);
