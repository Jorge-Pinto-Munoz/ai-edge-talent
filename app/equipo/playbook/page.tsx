import { requireTeamPage } from "@/lib/staff/guard";
import { DELIVERY_FAQ, DELIVERY_STAGES, HANDOFFS } from "@/lib/data/delivery-guide";
import { DELIVERY_PLAYBOOK } from "@/lib/data/playbook";
import { PlaybookExplorer } from "@/components/staff/PlaybookExplorer";

export const metadata = { title: "Playbook de acompañamiento · Equipo AI Edge Talent" };
export const dynamic = "force-dynamic";

export default async function PlaybookPage() {
  await requireTeamPage("/equipo/playbook");
  const before = DELIVERY_PLAYBOOK.find((p) => p.id === "before")!;
  return (
    <PlaybookExplorer
      before={{ actions: before.mustDo, never: before.mustNotDo, milestones: before.evidence, escalate: before.escalateWhen, communicate: before.communicate }}
      stages={DELIVERY_STAGES}
      handoffs={HANDOFFS}
      faq={DELIVERY_FAQ}
    />
  );
}
