import docs from "@/content/documents.json";
import type { DocumentKind, VersionedDocument, Wave } from "./domain/types";

/**
 * Registro de documentos versionados. El contenido vive en content/documents.json:
 * para cambiar el texto o publicar una versión nueva basta con editar ese archivo
 * y actualizar la versión aplicable en la configuración de la Wave. No requiere cambiar código.
 */
const DOCUMENTS = docs as VersionedDocument[];

export function getDocument(kind: DocumentKind, version: string | null): VersionedDocument | null {
  if (!version) return null;
  return DOCUMENTS.find((d) => d.kind === kind && d.version === version) ?? null;
}

export function documentsForWave(wave: Wave) {
  return {
    acknowledgement: getDocument("PRE_APPLICATION_ACK", wave.rules.acknowledgementVersion),
    commitment: getDocument("COMMITMENT_LETTER", wave.rules.commitmentDocumentVersion),
    conditions: getDocument("CONDITIONS", wave.rules.conditionsVersion),
  };
}

export function allDocuments() {
  return DOCUMENTS;
}
