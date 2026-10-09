import { Suspense } from "react";
import { HelpCenter } from "@/components/HelpCenter";

export const metadata = { title: "Ayuda · AET Platform" };

export default function AyudaPage() {
  return (
    <Suspense>
      <HelpCenter />
    </Suspense>
  );
}
