/** Guía del Showcase para el profesional (AET_Guia_Showcase_Profesional). Una sola fuente para el sitio y Mi journey. */
export const SHOWCASE_IDEA = "El cliente debe salir del Showcase pensando: «esto le agrega valor real a mi operación y quiero más de esto».";

export const SHOWCASE_FORMAT = { slides: "Máximo 8 slides", duration: "15 a 20 minutos", demo: "Demo en vivo sobre el caso real" };

export const SHOWCASE_CRITERIA = [
  { title: "Habla del negocio, no de la herramienta", body: "El foco es el problema del cliente y cómo lo resolviste. El cliente quiere ver impacto en su operación, no un tutorial de IA." },
  { title: "Habla del valor para el cliente", body: "Conecta todo con lo que gana: tiempo, calidad, menos errores, procesos más ágiles." },
  { title: "Conecta tu aprendizaje", body: "Cuenta brevemente qué aprendiste y cómo lo aplicaste: de dónde partiste y qué eres capaz de hacer ahora." },
  { title: "Activa tu cámara", body: "Tu presencia genera confianza. Un Showcase se vive, no se lee." },
];

export const SHOWCASE_STRUCTURE = [
  { min: "2 min", title: "El problema del negocio", body: "El dolor real del cliente: qué problema existía, a quién afectaba y por qué importaba resolverlo." },
  { min: "2 min", title: "Tu enfoque con IA", body: "Cómo lo abordaste con IA, en lenguaje del negocio y sin tecnicismos innecesarios." },
  { min: "6–8 min", title: "La demostración en vivo", body: "El corazón del Showcase: tu solución funcionando sobre el caso real, con el antes y el después." },
  { min: "3 min", title: "El impacto y la eficiencia", body: "El resultado en números: cuánto tiempo se ahorra y qué gana el cliente." },
  { min: "2 min", title: "El contraste y el cierre", body: "Qué habría pasado sin esta mejora, tu aprendizaje del proceso y una invitación a lo que viene." },
];

export const SHOWCASE_CONTRAST = [
  "¿Qué hubiese pasado sin esta mejora? Cuánto tiempo tomaba, qué errores ocurrían, qué fricción existía.",
  "¿Qué ganamos con esto? Mejor calidad, más velocidad, menos retrabajo, mejor experiencia.",
  "¿Cuánta eficiencia en tiempo logramos? Un número simple y honesto vale más que mil adjetivos.",
];

export const SHOWCASE_CHECKLIST = [
  "Mi presentación habla del negocio, no solo de la tecnología.",
  "Conecté todo con el valor para el cliente: qué gana con esto.",
  "Incluí mi aprendizaje del proceso y mi evolución.",
  "Tengo máximo 8 slides y ensayé para durar entre 15 y 20 minutos.",
  "Verifiqué la demo completa: funciona, tengo los accesos y los datos listos.",
  "Probé pantalla compartida, sonido y conexión antes de la sesión.",
  "Voy a presentar con cámara activa.",
  "Preparé el contraste: qué hubiese pasado sin la mejora y qué ganamos.",
  "Calculé la eficiencia en tiempo (o el beneficio concreto) donde fue posible.",
  "Dejé espacio para preguntas del cliente al final.",
];

export const SHOWCASE_AVOID = "Improvisar sin ensayar, llegar sin verificar la demo, hablar solo de la herramienta o presentar sin cámara.";

/** "Antes 8 h, ahora 3 h, 4 veces al mes → 20 h al mes liberadas." */
export function efficiency(beforeH: number, afterH: number, perMonth: number): { savedPerTime: number; savedPerMonth: number; pct: number } | null {
  if (![beforeH, afterH, perMonth].every((x) => Number.isFinite(x) && x >= 0) || beforeH <= 0 || afterH > beforeH) return null;
  const savedPerTime = Math.round((beforeH - afterH) * 10) / 10;
  return { savedPerTime, savedPerMonth: Math.round(savedPerTime * perMonth * 10) / 10, pct: Math.round(((beforeH - afterH) / beforeH) * 100) };
}
