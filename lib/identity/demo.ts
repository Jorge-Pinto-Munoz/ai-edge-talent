/**
 * Cuentas de demostración (ficticias, ver supabase/seed.sql): ingresan como un profesional real, pero son de solo
 * lectura. Su dominio es .invalid, así que nunca reciben correo.
 */
export const DEMO_DOMAIN = "demo-aet.invalid";
export const isDemoEmail = (email: string | null | undefined) => Boolean(email) && email!.toLowerCase().endsWith(`@${DEMO_DOMAIN}`);
export const DEMO_READONLY = "Cuenta de demostración: puedes recorrer todo, pero los envíos están desactivados.";
