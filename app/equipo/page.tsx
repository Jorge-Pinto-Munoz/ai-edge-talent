import { requireTeamPage } from "@/lib/staff/guard";
import { TeamHome } from "@/components/staff/TeamHome";

export const metadata = { title: "Acompañamiento · Equipo AI Edge Talent" };
export const dynamic = "force-dynamic";

export default async function EquipoHome({ searchParams }: { searchParams: Promise<{ wave?: string }> }) {
  const { wave } = await searchParams;
  const viewer = await requireTeamPage("/equipo");
  return <TeamHome viewer={viewer} wave={wave} />;
}
