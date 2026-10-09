"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import { acceptCommitmentFor, currentCommitment, declineCommitmentFor, presentCommitmentFor } from "@/lib/store/state";
import { documentsForWave } from "@/lib/content";
import { isEnrolled } from "@/lib/domain/admission";
import { useCurrentApp } from "./useCurrentApp";
import { NoApplication } from "./NoApplication";
import { LifecycleRail } from "./journey";
import { Badge, BrandHero, Callout, DocumentView, fmtDate, fmtDay } from "./ui";

const CAN_REVIEW = ["SELECTED", "CONDITIONS_PENDING", "CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"];

export function KiberConditions() {
  const { app, wave, hydrated } = useCurrentApp();
  if (!hydrated) return <p className="muted">Cargando…</p>;
  if (!app || !wave) return <NoApplication />;
  const { conditions } = documentsForWave(wave);
  if (!CAN_REVIEW.includes(app.applicationStatus)) {
    return (
      <Callout title="Las condiciones de ingreso se presentan después de la selección">
        Mientras tanto, puedes revisar el <Link href="/programa">programa completo</Link>.
      </Callout>
    );
  }
  if (!conditions) return <Callout tone="warn" title="Condiciones no configuradas para esta Wave">PENDIENTE DE DEFINICIÓN</Callout>;
  return (
    <div className="stack narrow">
      <div className="eyebrow">Antes de comenzar</div>
      <h1>{conditions.title}</h1>
      <p className="lead">{conditions.descriptor}</p>
      <div className="card">
        <DocumentView doc={conditions} />
      </div>
      {isEnrolled(app.applicationStatus) ? (
        <Link className="btn ghost" href="/kiber/commitment">
          Ver el compromiso que acepté
        </Link>
      ) : (
        <Link className="btn" href="/kiber/commitment">
          {conditions.cta}
        </Link>
      )}
    </div>
  );
}

export function KiberCommitment() {
  const { app, wave, hydrated, state } = useCurrentApp();
  const { run } = useStore();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!app) return;
    if (app.applicationStatus === "SELECTED" || (app.applicationStatus === "CONDITIONS_PENDING" && currentCommitment(state, app.id)?.status !== "PENDING")) {
      const err = run((s) => presentCommitmentFor(s, app.id));
      if (err) setError(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app?.id, app?.applicationStatus]);

  if (!hydrated) return <p className="muted">Cargando…</p>;
  if (!app || !wave) return <NoApplication />;
  const { commitment: doc } = documentsForWave(wave);
  if (!CAN_REVIEW.includes(app.applicationStatus)) {
    return <Callout title="La Carta de Compromiso se presenta solo a personas seleccionadas.">Revisa el estado de tu postulación en <Link href="/kiber">Mi proceso</Link>.</Callout>;
  }
  if (!doc) return <Callout tone="warn" title="Carta de Compromiso no configurada">PENDIENTE DE DEFINICIÓN</Callout>;
  const rec = currentCommitment(state, app.id);
  const accepted = rec?.status === "ACCEPTED";
  const today = new Date().toISOString();

  return (
    <div className="stack narrow">
      <div className="eyebrow">{wave.name} · Carta de compromiso</div>
      <h1>{doc.title}</h1>
      <p className="lead">{doc.descriptor}</p>
      <div className="card">
        <DocumentView doc={doc} />
      </div>
      <p>
        ¿Dudas antes de aceptar? Revisa las <Link href="/kiber/conditions">condiciones en simple</Link> o habla con tu Delivery.
      </p>

      {accepted && rec ? (
        <Callout tone="ok" title="Compromiso aceptado">
          Versión {rec.documentVersion} · condiciones {rec.conditionsVersion} · aceptado por {rec.acceptedBy} el {fmtDate(rec.acceptedAt!)}.
        </Callout>
      ) : rec?.status === "DECLINED" ? (
        <Callout tone="warn" title="Indicaste que no aceptas el compromiso por ahora">
          Tu Delivery se pondrá en contacto contigo. Sin aceptación no hay inscripción.
        </Callout>
      ) : (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            const err = run((s) => acceptCommitmentFor(s, app.id, { checked, fullName: name }));
            if (err) return setError(err);
            router.push("/kiber/bienvenida");
          }}
        >
          <div className="grid grid-3" style={{ marginBottom: 12 }}>
            <div>
              <small className="muted">Wave</small>
              <div>
                <strong>{wave.name.replace("AI Edge Talent · ", "")}</strong>
              </div>
            </div>
            <div>
              <small className="muted">Versión del compromiso</small>
              <div>
                <strong>{doc.version}</strong>
              </div>
            </div>
            <div>
              <small className="muted">Fecha</small>
              <div>
                <strong>{fmtDay(today)}</strong>
              </div>
            </div>
          </div>
          {doc.confirmations.map((c) => (
            <label key={c.id} className="check">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              <span>{c.text}</span>
            </label>
          ))}
          <div className="field">
            <label htmlFor="fullname">Nombre completo</label>
            <input id="fullname" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={app.participantName} />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="row">
            <button className="btn" type="submit" disabled={!checked || name.trim().length < 3}>
              {doc.cta}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                if (confirm("¿Confirmas que no aceptas el compromiso por ahora? Tu Delivery te contactará.")) run((s) => declineCommitmentFor(s, app.id));
              }}
            >
              No acepto por ahora
            </button>
          </div>
        </form>
      )}

      {state.commitments.filter((c) => c.participantId === app.id).length > 1 && (
        <div className="card">
          <h3>Historial de versiones</h3>
          <ul>
            {state.commitments
              .filter((c) => c.participantId === app.id)
              .map((c) => (
                <li key={c.id}>
                  {c.documentVersion} · <Badge>{c.status}</Badge> {c.acceptedAt && `· ${fmtDate(c.acceptedAt)}`}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function KiberWelcome() {
  const { app, wave, hydrated } = useCurrentApp();
  if (!hydrated) return <p className="muted">Cargando…</p>;
  if (!app || !wave) return <NoApplication />;
  if (!isEnrolled(app.applicationStatus)) {
    return <Callout title="Aún no estás inscrito/a">La inscripción ocurre después de aceptar tu compromiso. <Link href="/kiber">Ver mi proceso</Link></Callout>;
  }
  const short = wave.name.replace("AI Edge Talent · ", "");
  return (
    <div className="stack">
      <BrandHero
        image="profesional-tablet"
        eyebrow="Inscripción confirmada"
        title={`Ya eres parte de ${short}`}
        lead={`Bienvenido/a, ${app.participantName.split(" ")[0]}. Tu journey AI Edge Talent comienza ahora.`}
      >
        <Link className="btn" href="/kiber/onboarding">
          Comenzar mi journey
        </Link>
      </BrandHero>
      <div className="grid grid-3">
        <div className="card">
          <small className="muted">Cliente</small>
          <div><strong>{app.client}</strong></div>
        </div>
        <div className="card">
          <small className="muted">Rol</small>
          <div><strong>{app.role}</strong></div>
        </div>
        <div className="card">
          <small className="muted">Delivery</small>
          <div><strong>{app.deliveryOwner ?? "Se confirma en tu onboarding"}</strong></div>
        </div>
      </div>
      <div className="card">
        <h3>Tu journey</h3>
        <LifecycleRail current="MINDSET" only={["MINDSET", "AI_CERTS", "AI_LAB", "SHOWCASE", "CLOSURE"]} />
      </div>
      <SupportTeam />
      <div className="card">
        <h3>Primera etapa y próximo hito</h3>
        <p>
          <strong>AI First Mindset:</strong> demostrar que puedes rediseñar una actividad real integrando IA con criterio.
        </p>
        <p className="muted">Fecha del próximo hito: {wave.startDate ? fmtDay(wave.startDate) : "tu Delivery la confirmará en el calendario inicial."}</p>
      </div>
    </div>
  );
}

export function SupportTeam() {
  const { app, wave } = useCurrentApp();
  const people = [
    { role: "Delivery", who: app?.deliveryOwner ?? null, what: "Tu primer punto de contacto: coordina tiempos con el cliente y te ayuda ante bloqueos." },
    { role: "Hub AI", who: null, what: "Facilita AI First Mindset y AI Lab." },
    { role: "IT Academy", who: null, what: "Enrolamiento y cuenta de AI CERTs; asigna tu profesor." },
    { role: "Profesor/a AI CERTs", who: null, what: "Acompañamiento docente durante la certificación." },
    { role: "Product Lead", who: wave?.productLead ?? null, what: "Decisiones de producto y excepciones explícitas." },
  ];
  return (
    <div className="card">
      <h3>Quién te acompaña</h3>
      <ul>
        {people.map((p) => (
          <li key={p.role}>
            <strong>{p.role}</strong>
            {p.who ? ` · ${p.who}` : " · se confirma al inicio de la etapa"} — <span className="muted">{p.what}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
