"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markRescueStarted, requestRescueUpload, submitRescue } from "@/lib/admission/candidate-actions";
import { RESCUE_MAX_MINUTES, RESCUE_QUESTIONS, isAcceptableVideoUrl, timeLeft, type RescueState } from "@/lib/admission/rescue";
import { uploadSigned } from "@/lib/upload/signed-upload";
import { Callout } from "@/components/ui";

const MAX_SECONDS = RESCUE_MAX_MINUTES * 60;
/** Margen para archivos subidos (un video de 3:00 exportado puede durar unos segundos más). */
const FILE_MAX_SECONDS = MAX_SECONDS + 30;
const MAX_MB = 50;
const ACCEPTED = /^video\/(webm|mp4|quicktime|x-m4v|3gpp)$/;

type Rescue = { state: RescueState; open: boolean; expiresAt: string | null; serverNow: string; video: { at: string; reviewed: boolean } | null };
type Msg = { ok: boolean; message: string } | null;

/** Formatos en orden de preferencia: MP4 se reproduce en todos lados; WebM es lo que graban Chrome y Firefox. */
function pickMime(): string {
  const options = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
  return options.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * Video de rescate. Solo se muestra a quien Administración le ofreció el rescate; el plazo lo valida el servidor
 * (y la base de datos) con su propia hora. Opciones: grabar aquí (principal), pegar un enlace o subir un archivo.
 */
export function RescueForm({ token, rescue, preview = false }: { token: string; rescue: Rescue; preview?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"record" | "link" | "file">("record");
  const { expired, now } = useDeadline(rescue.expiresAt, rescue.serverNow, () => router.refresh());
  const startedRef = useRef(false);
  const started = () => {
    if (startedRef.current || preview) return;
    startedRef.current = true;
    void markRescueStarted(token);
  };

  const sent = rescue.video;
  const open = rescue.open && !expired;

  return (
    <div className="stack">
      <Deadline rescue={rescue} expired={expired} now={now} />

      <ol className="rescue-qs">
        {RESCUE_QUESTIONS.map((q) => (
          <li key={q.key}><strong>{q.question}</strong></li>
        ))}
      </ol>
      <p className="muted" style={{ margin: 0 }}>Máximo {RESCUE_MAX_MINUTES} minutos. No necesitas editarlo ni preparar una presentación: habla con naturalidad. No muestres datos confidenciales de tu cliente.</p>

      {sent && (
        <Callout tone="ok" title={sent.reviewed ? "Tu video ya fue revisado." : "Recibimos tu video."}>
          {sent.reviewed ? "Te escribiremos con el resultado." : open ? "Está pendiente de revisión. Si quieres, puedes reemplazarlo antes de que venza el plazo." : "Está pendiente de revisión. Te escribiremos con el resultado."}
        </Callout>
      )}

      {!sent && !open && (
        <Callout tone="warn" title="El plazo para enviar el video venció">
          Ya no es posible enviarlo. Si tuviste un problema técnico, responde el correo de invitación y el equipo evaluará si corresponde extender el plazo.
        </Callout>
      )}

      {open && (
        <div className="card rescue-card">
          <div className="rescue-tabs" role="tablist" aria-label="Cómo enviar tu video">
            <button type="button" role="tab" aria-selected={mode === "record"} className={mode === "record" ? "on" : ""} onClick={() => setMode("record")}>Grabar aquí</button>
            <button type="button" role="tab" aria-selected={mode === "link"} className={mode === "link" ? "on" : ""} onClick={() => setMode("link")}>Pegar enlace</button>
            <button type="button" role="tab" aria-selected={mode === "file"} className={mode === "file" ? "on" : ""} onClick={() => setMode("file")}>Subir archivo</button>
          </div>
          {preview && <p className="hint" role="note">Vista previa del administrador: puedes ver la pantalla, pero no se envía nada.</p>}
          {mode === "record" && <Recorder token={token} replacing={Boolean(sent)} preview={preview} onStart={started} onDone={() => router.refresh()} onUnsupported={() => setMode("file")} />}
          {mode === "link" && <LinkForm token={token} replacing={Boolean(sent)} preview={preview} onStart={started} onDone={() => router.refresh()} />}
          {mode === "file" && <FileForm token={token} replacing={Boolean(sent)} preview={preview} onStart={started} onDone={() => router.refresh()} />}
        </div>
      )}
    </div>
  );
}

/** Cuenta regresiva con la hora del servidor (corrige la diferencia con el reloj del dispositivo). */
function useDeadline(expiresAt: string | null, serverNow: string, onExpire: () => void): { expired: boolean; now: Date } {
  const offset = useRef(0);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;
  const [now, setNow] = useState(() => new Date(serverNow));
  useEffect(() => {
    offset.current = new Date(serverNow).getTime() - Date.now();
    if (!expiresAt) return;
    const end = new Date(expiresAt).getTime();
    let fired = Date.now() + offset.current >= end;
    const id = window.setInterval(() => {
      const t = Date.now() + offset.current;
      setNow(new Date(t));
      if (!fired && t >= end) {
        fired = true;
        expireRef.current();
      }
    }, 10_000);
    return () => window.clearInterval(id);
  }, [expiresAt, serverNow]);
  return { expired: Boolean(expiresAt && now.getTime() >= new Date(expiresAt).getTime()), now };
}

function Deadline({ rescue, expired, now }: { rescue: Rescue; expired: boolean; now: Date }) {
  if (!rescue.expiresAt) return null;
  const end = new Date(rescue.expiresAt);
  const left = end.getTime() - now.getTime();
  const close = !expired && left < 3 * 3_600_000;
  const when = end.toLocaleString("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`rescue-deadline${close ? " warn" : ""}${expired ? " over" : ""}`} role="status" aria-live="polite">
      <strong>{expired ? "Plazo vencido" : `Te quedan ${timeLeft(rescue.expiresAt, now)}`}</strong>
      <span>{expired ? "El plazo terminó el" : "Puedes enviarlo hasta el"} {when} (hora de Chile).</span>
    </div>
  );
}

interface FormProps { token: string; replacing: boolean; preview: boolean; onStart: () => void; onDone: () => void }

/** Sube el video a una URL firmada (privada) con avance real y lo registra. Conserva el archivo para reintentar. */
function useUploadAndSubmit(token: string) {
  const [progress, setProgress] = useState<number | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const run = async (blob: Blob, name: string, extra: { note?: string; recorded: boolean }): Promise<boolean> => {
    setBusy(true);
    setMsg(null);
    setProgress(0);
    try {
      const r = await requestRescueUpload(token, name, blob.size, blob.type);
      if (!r.ok || !r.path || !r.signedUrl) throw new Error(r.message);
      await uploadSigned(r.signedUrl, blob, setProgress);
      const s = await submitRescue(token, { path: r.path, note: extra.note, recorded: extra.recorded });
      if (!s.ok) throw new Error(s.message);
      setMsg({ ok: true, message: "Recibimos tu video. Te avisaremos cuando el equipo lo revise." });
      return true;
    } catch (e) {
      setMsg({ ok: false, message: `${e instanceof Error ? e.message : "No se pudo enviar el video."} Tu video sigue aquí: puedes reintentar.` });
      return false;
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };
  return { run, progress, msg, busy, setMsg };
}

function Progress({ value }: { value: number | null }) {
  if (value === null) return null;
  return (
    <div className="rescue-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label="Subiendo video">
      <span style={{ width: `${value}%` }} />
      <small>{value < 100 ? `Subiendo… ${value}%` : "Registrando tu envío…"}</small>
    </div>
  );
}

function NoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="field" style={{ marginTop: 14 }}>
      <label htmlFor="rv-note">Comentario (opcional)</label>
      <textarea id="rv-note" rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Algo que quieras agregar" maxLength={1000} />
    </div>
  );
}

/* ───────── Grabar aquí ───────── */

type RecState = "idle" | "asking" | "live" | "countdown" | "recording" | "review" | "sent";

function Recorder({ token, replacing, preview, onStart, onDone, onUnsupported }: FormProps & { onUnsupported: () => void }) {
  const [state, setState] = useState<RecState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [take, setTake] = useState<{ blob: Blob; url: string; seconds: number } | null>(null);
  const [note, setNote] = useState("");
  const live = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const up = useUploadAndSubmit(token);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined");
    return () => {
      stopStream();
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);
  useEffect(() => () => { if (take) URL.revokeObjectURL(take.url); }, [take]);
  useEffect(() => {
    if (live.current && stream.current && (state === "live" || state === "countdown" || state === "recording")) {
      if (live.current.srcObject !== stream.current) live.current.srcObject = stream.current;
    }
  }, [state]);

  function stopStream() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }

  async function enable() {
    onStart();
    setError(null);
    setState("asking");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      setState("live");
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setError(
        name === "NotAllowedError" ? "No diste permiso para usar la cámara o el micrófono. Actívalo en la configuración del navegador (ícono junto a la dirección) y vuelve a intentarlo."
        : name === "NotFoundError" ? "No encontramos una cámara o micrófono en este dispositivo. Puedes subir un archivo o pegar un enlace."
        : name === "NotReadableError" ? "Otra aplicación está usando la cámara. Ciérrala y vuelve a intentarlo."
        : "No pudimos acceder a la cámara. Puedes subir un archivo o pegar un enlace.",
      );
      setState("idle");
    }
  }

  function countdown() {
    setCount(3);
    setState("countdown");
    let n = 3;
    const id = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(id);
        begin();
      } else setCount(n);
    }, 1000);
  }

  function begin() {
    if (!stream.current) return;
    const mimeType = pickMime();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream.current, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 1_000_000, audioBitsPerSecond: 64_000 });
    } catch {
      setError("Este navegador no permite grabar video. Sube un archivo o pega un enlace.");
      setState("live");
      return;
    }
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      if (timer.current) window.clearInterval(timer.current);
      const seconds = Math.min(MAX_SECONDS, (Date.now() - startedAt.current) / 1000);
      const blob = new Blob(chunks, { type: (rec.mimeType || mimeType || "video/webm").split(";")[0] });
      stopStream();
      setTake({ blob, url: URL.createObjectURL(blob), seconds });
      setState("review");
    };
    recorder.current = rec;
    startedAt.current = Date.now();
    setElapsed(0);
    rec.start(1000);
    setState("recording");
    timer.current = window.setInterval(() => {
      const s = (Date.now() - startedAt.current) / 1000;
      setElapsed(s);
      if (s >= MAX_SECONDS && rec.state === "recording") rec.stop();
    }, 250);
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function retake() {
    setTake(null);
    up.setMsg(null);
    await enable();
  }

  async function send() {
    if (!take || preview) return;
    const ext = take.blob.type.includes("mp4") ? "mp4" : "webm";
    const ok = await up.run(take.blob, `grabacion.${ext}`, { note, recorded: true });
    if (ok) {
      setState("sent");
      onDone();
    }
  }

  if (!supported)
    return (
      <div className="stack">
        <Callout tone="warn" title="Este navegador no permite grabar aquí">
          Abre este enlace en Chrome, Edge, Firefox o Safari actualizado. Desde el celular también puedes grabar con la cámara y subir el archivo.
        </Callout>
        <button type="button" className="btn" onClick={onUnsupported}>Subir un archivo</button>
      </div>
    );

  const tooBig = take ? take.blob.size > MAX_MB * 1024 * 1024 : false;

  return (
    <div className="rescue-rec">
      {(state === "idle" || state === "asking") && (
        <div className="rescue-stage empty">
          <p><strong>Graba tu respuesta directamente aquí.</strong> Necesitamos permiso para usar tu cámara y micrófono; el video solo lo ve el equipo AI Edge Talent.</p>
          <button type="button" className="btn" onClick={enable} disabled={state === "asking"}>{state === "asking" ? "Esperando permiso…" : "Activar cámara y micrófono"}</button>
        </div>
      )}

      {(state === "live" || state === "countdown" || state === "recording") && (
        <div className="rescue-stage">
          <video ref={live} autoPlay muted playsInline className="mirror" aria-label="Vista previa de tu cámara" />
          {state === "countdown" && <div className="rescue-count" aria-live="assertive">{count}</div>}
          {state === "recording" && (
            <div className="rescue-timer" aria-live="off">
              <span className="dot" aria-hidden /> {mmss(elapsed)} / {mmss(MAX_SECONDS)}
              {MAX_SECONDS - elapsed <= 20 && <em> · quedan {Math.ceil(MAX_SECONDS - elapsed)} s</em>}
            </div>
          )}
        </div>
      )}
      {state === "live" && (
        <div className="row rescue-actions">
          <button type="button" className="btn" onClick={countdown}>Comenzar a grabar</button>
          <span className="hint">Partirá una cuenta regresiva de 3 segundos. Se detiene sola a los {RESCUE_MAX_MINUTES} minutos.</span>
        </div>
      )}
      {state === "recording" && (
        <div className="row rescue-actions">
          <button type="button" className="btn danger" onClick={stop}>Detener grabación</button>
        </div>
      )}

      {(state === "review" || state === "sent") && take && (
        <>
          <div className="rescue-stage">
            <video src={take.url} controls playsInline aria-label="Tu grabación" />
          </div>
          <p className="hint">Duración {mmss(take.seconds)} · {mb(take.blob.size)} · {take.blob.type.includes("mp4") ? "MP4" : "WebM"}</p>
          {tooBig && <p className="error" role="alert">La grabación pesa {mb(take.blob.size)} y el máximo es {MAX_MB} MB. Vuelve a grabarla un poco más corta.</p>}
          {state === "review" && (
            <>
              <NoteField value={note} onChange={setNote} />
              <Progress value={up.progress} />
              <div className="row rescue-actions">
                <button type="button" className="btn" onClick={send} disabled={up.busy || tooBig || preview}>{up.busy ? "Enviando…" : replacing ? "Confirmar y reemplazar mi video" : "Confirmar y enviar"}</button>
                <button type="button" className="btn ghost" onClick={retake} disabled={up.busy}>Grabar de nuevo</button>
              </div>
            </>
          )}
        </>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      {up.msg && <p className={up.msg.ok ? "ok-text" : "error"} role={up.msg.ok ? "status" : "alert"}>{up.msg.message}</p>}
    </div>
  );
}

/* ───────── Pegar enlace ───────── */

function LinkForm({ token, replacing, preview, onStart, onDone }: FormProps) {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const valid = isAcceptableVideoUrl(url);
  return (
    <div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="rv-url">Enlace al video</label>
        <input id="rv-url" type="url" inputMode="url" placeholder="https://… (YouTube no listado, Loom, Vimeo, Google Drive u OneDrive)" value={url} onFocus={onStart} onChange={(e) => { setUrl(e.target.value); setMsg(null); }} aria-invalid={url.trim() !== "" && !valid} aria-describedby="rv-url-note" />
        {url.trim() !== "" && !valid && <p className="error">Usa un enlace https de YouTube, Loom, Vimeo, Google Drive, OneDrive, SharePoint o Dropbox.</p>}
        <p className="hint" id="rv-url-note">Si compartes tu video desde Google Drive u OneDrive, configura el acceso como &quot;Cualquier persona con el enlace puede ver&quot; para que podamos revisarlo.</p>
      </div>
      <NoteField value={note} onChange={setNote} />
      <button
        type="button"
        className="btn"
        disabled={pending || !valid || preview}
        onClick={() => start(async () => {
          const r = await submitRescue(token, { url, note });
          setMsg(r.ok ? { ok: true, message: "Recibimos tu enlace. Te avisaremos cuando el equipo lo revise." } : r);
          if (r.ok) onDone();
        })}
      >
        {pending ? "Enviando…" : replacing ? "Reemplazar por este enlace" : "Enviar enlace"}
      </button>
      {msg && <p className={msg.ok ? "ok-text" : "error"} role={msg.ok ? "status" : "alert"} style={{ marginTop: 10 }}>{msg.message}</p>}
    </div>
  );
}

/* ───────── Subir archivo ───────── */

/** Duración real del archivo leyendo sus metadatos en el navegador (null si el navegador no puede leerlo). */
function videoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (d: number | null) => { URL.revokeObjectURL(url); resolve(d); };
    v.preload = "metadata";
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => done(null);
    window.setTimeout(() => done(null), 8000);
    v.src = url;
  });
}

function FileForm({ token, replacing, preview, onStart, onDone }: FormProps) {
  const [file, setFile] = useState<{ file: File; seconds: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const up = useUploadAndSubmit(token);

  async function pick(f: File | undefined) {
    setError(null);
    up.setMsg(null);
    setFile(null);
    if (!f) return;
    onStart();
    const type = f.type.split(";")[0];
    if (type && !ACCEPTED.test(type)) return setError("Formato no compatible. Usa MP4, MOV o WebM.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`El archivo pesa ${mb(f.size)} y el máximo es ${MAX_MB} MB. Grábalo aquí (queda más liviano) o comparte un enlace.`);
    const seconds = await videoDuration(f);
    if (seconds !== null && seconds > FILE_MAX_SECONDS) return setError(`El video dura ${mmss(seconds)} y el máximo es ${RESCUE_MAX_MINUTES}:00 minutos.`);
    setFile({ file: f, seconds });
  }

  return (
    <div>
      <label className="btn ghost" style={{ display: "inline-flex", cursor: up.busy ? "wait" : "pointer", marginBottom: 0 }}>
        {file ? "Elegir otro video" : "Elegir video"}
        <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/3gpp,video/*" hidden disabled={up.busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void pick(f); }} />
      </label>
      <p className="hint">MP4, MOV o WebM · hasta {MAX_MB} MB · máximo {RESCUE_MAX_MINUTES} minutos.</p>
      {file && <p>✓ {file.file.name} · {mb(file.file.size)}{file.seconds !== null ? ` · ${mmss(file.seconds)}` : ""}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <NoteField value={note} onChange={setNote} />
      <Progress value={up.progress} />
      <button
        type="button"
        className="btn"
        disabled={!file || up.busy || preview}
        onClick={async () => { if (file && (await up.run(file.file, file.file.name, { note, recorded: false }))) onDone(); }}
      >
        {up.busy ? "Enviando…" : replacing ? "Confirmar y reemplazar mi video" : "Confirmar y enviar"}
      </button>
      {up.msg && <p className={up.msg.ok ? "ok-text" : "error"} role={up.msg.ok ? "status" : "alert"} style={{ marginTop: 10 }}>{up.msg.message}</p>}
    </div>
  );
}
