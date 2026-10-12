import { ApplyByInvitation } from "@/components/ApplyByInvitation";

export const metadata = { title: "Tu invitación · AI Edge Talent" };

export default async function ApplyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ApplyByInvitation token={token} />;
}
