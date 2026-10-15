"use client";

import { normalizeKey } from "@/lib/supabase/normalize";

const key = normalizeKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * Sube un archivo a una URL firmada de Storage (la entrega el servidor) informando el avance real.
 * Mismo protocolo que storage-js `uploadToSignedUrl`, pero con XMLHttpRequest para tener progreso.
 */
export function uploadSigned(signedUrl: string, body: Blob, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    if (key) {
      xhr.setRequestHeader("apikey", key);
      xhr.setRequestHeader("authorization", `Bearer ${key}`);
    }
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("content-type", body.type.split(";")[0] || "application/octet-stream");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`La subida falló (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Se perdió la conexión durante la subida."));
    xhr.ontimeout = () => reject(new Error("La subida tardó demasiado."));
    xhr.send(body);
  });
}
