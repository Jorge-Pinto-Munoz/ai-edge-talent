import { SelfRegisterForm } from "@/components/admission/SelfRegisterForm";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Callout } from "@/components/ui";
import { deliveryDirectory } from "@/lib/identity/directory";

export const dynamic = "force-dynamic";

export const metadata = { title: "Postular · AI Edge Talent" };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ wave?: string }> }) {
  const { wave } = await searchParams;
  if (!isSupabaseConfigured()) return <Callout tone="warn" title="Base de datos no configurada" />;
  return <SelfRegisterForm waveId={wave ?? "wave-3"} deliveries={await deliveryDirectory()} />;
}
