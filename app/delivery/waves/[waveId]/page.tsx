import { WaveDetail } from "@/components/WaveViews";
export const metadata = { title: "Wave · Delivery · AET Platform" };
export default async function Page({ params }: { params: Promise<{ waveId: string }> }) {
  const { waveId } = await params;
  return <WaveDetail waveId={waveId} />;
}
