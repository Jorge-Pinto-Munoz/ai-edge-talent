import { HelpPanel } from "@/components/site/Help";

export const metadata = { title: "Ayuda · AI Edge Talent", description: "Preguntas frecuentes y contacto con el equipo AI Edge Talent." };

export default function AyudaPage() {
  return (
    <div className="help-page">
      <div className="eyebrow">Ayuda</div>
      <h1>¿En qué te ayudamos?</h1>
      <p className="muted">Respuestas cortas a lo que más nos preguntan. Si no está aquí, escríbenos y te respondemos a tu correo.</p>
      <HelpPanel inline />
    </div>
  );
}
