import { WaveDetail } from "@/components/WaveViews";
export const metadata = { title: "Wave · Admin · AET Platform" };
export default async function Page({ params }: { params: Promise<{ waveId: string }> }) {
  const { waveId } = await params;
  return <WaveDetail waveId={waveId} admin />;
}
