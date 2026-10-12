import { LoginForm } from "./LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Callout } from "@/components/ui";

export const metadata = { title: "Ingresar · AI Edge Talent" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="stack narrow" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="dark-band">
        <div className="eyebrow">AI Edge Talent</div>
        <h1 style={{ color: "#fff", marginBottom: 4 }}>Ingresar</h1>
        <p className="muted" style={{ margin: 0 }}>Te enviaremos un enlace de acceso a tu correo. Sin contraseñas.</p>
      </div>
      {!isSupabaseConfigured() ? (
        <Callout tone="warn" title="Base de datos no configurada">
          Este ambiente corre en modo demo. Configura Supabase (ver README) para habilitar el ingreso.
        </Callout>
      ) : (
        <>
          {error && <Callout tone="bad" title="El enlace expiró o no es válido">Solicita uno nuevo.</Callout>}
          <LoginForm next={next ?? "/inicio"} />
        </>
      )}
    </div>
  );
}
