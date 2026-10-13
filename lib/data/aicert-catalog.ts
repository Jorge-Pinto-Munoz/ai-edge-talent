/**
 * Catálogo de certificaciones AI CERTs con malla disponible en Kibernum (fuente: Atlas consolidado AI CERTs,
 * corte 12-10-2026, a partir de los resúmenes ejecutivos oficiales). "Qué aprende" es una síntesis en español
 * de la malla; no reemplaza el material oficial. El catálogo de AI CERTs cambia: revalidar antes de comprometer una ruta.
 */
export type CertArea = "Fundamentos" | "Negocio y gestión" | "Seguridad" | "Cloud y arquitectura" | "Desarrollo" | "Agentes" | "Datos y calidad" | "Diseño y UX";
export type CertLevel = "Fundamentals" | "Practitioner" | "Expert" | "Strategist" | "Specialty";

export interface CatalogCert {
  slug: string;
  name: string;
  area: CertArea;
  level: CertLevel;
  /** Una o dos frases: qué aprende la persona. */
  learns: string;
  /** Roles de un equipo TI para los que tiene más sentido. */
  forWho: string[];
  modules: string[];
  /** Certificación que hoy usa AI Edge Talent en Role Enablement. */
  aet?: boolean;
}

export const CATALOG_SOURCE = { date: "12 de octubre de 2026", officialTotal: 79, officialAreas: 11 };

export const CERT_AREAS: { id: CertArea; blurb: string }[] = [
  { id: "Fundamentos", blurb: "Alfabetización en IA y prompting para cualquier rol." },
  { id: "Desarrollo", blurb: "Construir software y soluciones con IA." },
  { id: "Cloud y arquitectura", blurb: "Infraestructura, despliegue y diseño de modelos." },
  { id: "Datos y calidad", blurb: "Ciencia de datos, agentes de datos y QA con IA." },
  { id: "Agentes", blurb: "Diseñar y operar agentes de IA, también sin código." },
  { id: "Negocio y gestión", blurb: "Proyectos, producto, agilidad y ética." },
  { id: "Seguridad", blurb: "Ciberseguridad, cumplimiento y redes con IA." },
  { id: "Diseño y UX", blurb: "Diseño, investigación de usuarios y prototipos con IA." },
];

export const LEVEL_LABEL: Record<CertLevel, string> = {
  Fundamentals: "Fundamentos",
  Practitioner: "Practitioner",
  Expert: "Experto",
  Strategist: "Estratega",
  Specialty: "Especialidad",
};

export const CATALOG: CatalogCert[] = [
  // ── Fundamentos
  {
    slug: "everyone-fundamentals", name: "AI+ Everyone Fundamentals™", area: "Fundamentos", level: "Fundamentals",
    learns: "Qué es la IA, cómo funcionan sus tecnologías principales y cómo se aplica en casos reales, con ética y un plan de primeros pasos.",
    forWho: ["Cualquier rol", "Punto de partida de las rutas"],
    modules: ["Introducción a la inteligencia artificial", "Tecnologías de IA", "La IA en acción: aplicaciones y casos", "Flujo de trabajo de un proyecto de IA", "Ética e implicancias sociales", "IA generativa y creatividad", "Prepararse para un futuro con IA", "Primeros pasos y recursos"],
  },
  {
    slug: "prompting-fundamentals", name: "AI+ Prompting Fundamentals™", area: "Fundamentos", level: "Fundamentals",
    learns: "Escribir instrucciones efectivas para modelos de lenguaje e imagen, elegir la herramienta adecuada y aplicarlo en un proyecto práctico.",
    forWho: ["Cualquier rol", "Base para desarrollo, producto y diseño"],
    modules: ["Fundamentos de IA e ingeniería de prompts", "Principios de un buen prompt", "Herramientas y modelos de IA", "Técnicas avanzadas de prompting", "Técnicas para modelos de imagen", "Aprendizaje basado en proyectos", "Ética y futuro de la IA"],
  },
  // ── Desarrollo
  {
    slug: "developer", name: "AI+ Developer Practitioner™", area: "Desarrollo", level: "Practitioner", aet: true,
    learns: "IA en todo el ciclo de desarrollo: Python, machine learning, deep learning, visión, NLP, LLMs y despliegue en la nube.",
    forWho: ["Developer", "Backend", ".NET / Java", "Infraestructura"],
    modules: ["Fundamentos de IA", "Matemática para IA", "Python para desarrolladores", "Machine learning", "Deep learning", "Visión por computador", "Procesamiento de lenguaje natural", "Aprendizaje por refuerzo", "Cloud en el desarrollo de IA", "Modelos de lenguaje (LLM)", "Investigación de frontera", "Comunicación y documentación"],
  },
  {
    slug: "engineer", name: "AI+ Engineer™", area: "Desarrollo", level: "Practitioner", aet: true,
    learns: "Diseñar e integrar soluciones con IA: arquitectura, redes neuronales, LLMs, IA generativa, transfer learning e interfaces para ponerlas en producción.",
    forWho: ["Full stack", "Desarrollador/a senior", "Ingeniería de soluciones"],
    modules: ["Fundamentos de IA", "Arquitectura de IA", "Redes neuronales", "Aplicaciones de redes neuronales", "Modelos de lenguaje (LLM)", "IA generativa aplicada", "Procesamiento de lenguaje natural", "Transfer learning con Hugging Face", "Interfaces para soluciones de IA", "Comunicación y despliegue"],
  },
  {
    slug: "vibe-coding", name: "AI+ Vibe Coding Practitioner™", area: "Desarrollo", level: "Practitioner",
    learns: "Programar guiando a la IA con prompts: generar código, depurar y probar, y construir una app full stack con límites de seguridad claros.",
    forWho: ["Developer", "Product builders", "Prototipado rápido"],
    modules: ["Vibe coding y herramientas de IA", "Prompts para código: bases y buenas prácticas", "Depuración y pruebas con IA", "Una app full stack de ejemplo", "Ética, seguridad y límites de la IA", "Proyecto final: app guiada por prompts"],
  },
  {
    slug: "context-engineering", name: "AI+ Context Engineering Practitioner™", area: "Desarrollo", level: "Practitioner",
    learns: "Construir y gestionar el contexto que alimenta a los modelos: patrones, RAG, grounding, escalamiento y orquestación de varios agentes.",
    forWho: ["Developer", "Arquitectura", "Equipos que construyen asistentes"],
    modules: ["Fundamentos de context engineering", "Patrones de gestión de contexto", "Pipeline de contexto, RAG y grounding", "Optimización y escala empresarial", "Diseño de flujos para usuarios de negocio", "Aplicaciones por industria", "Orquestación multiagente", "Proyecto final"],
  },
  // ── Cloud y arquitectura
  {
    slug: "architect", name: "AI+ Architect™", area: "Cloud y arquitectura", level: "Practitioner", aet: true,
    learns: "Redes neuronales y su optimización, arquitecturas para lenguaje y visión, métricas, infraestructura y diseño responsable de IA.",
    forWho: ["Arquitectura de soluciones", "Arquitectura de software"],
    modules: ["Redes neuronales", "Optimización de redes", "Arquitecturas para NLP", "Arquitecturas para visión", "Evaluación y métricas de modelos", "Infraestructura y despliegue", "Diseño responsable", "Modelos generativos", "Diseño basado en investigación", "Proyecto final"],
  },
  {
    slug: "cloud", name: "AI+ Cloud Practitioner™", area: "Cloud y arquitectura", level: "Practitioner",
    learns: "Servicios de IA en la nube: desarrollar, desplegar e integrar modelos sobre infraestructura cloud, con ejemplos prácticos.",
    forWho: ["Cloud", "DevOps", "Infraestructura"],
    modules: ["IA y cloud: fundamentos", "Introducción a la IA", "Computación en la nube", "Servicios de IA en la nube", "Desarrollo de modelos en la nube", "Infraestructura para IA", "Despliegue e integración", "Tendencias IA + cloud", "Ejemplos prácticos"],
  },
  // ── Datos y calidad
  {
    slug: "data", name: "AI+ Data Practitioner™", area: "Datos y calidad", level: "Practitioner",
    learns: "Ciencia de datos de punta a punta: estadística, preparación y exploración, machine learning, IA generativa para insights y storytelling para decidir.",
    forWho: ["Data Analyst", "BI", "Data Engineer"],
    modules: ["Fundamentos de ciencia de datos", "Estadística", "Fuentes y tipos de datos", "Programación para datos", "Limpieza y preparación", "Análisis exploratorio (EDA)", "IA generativa para obtener insights", "Repaso de machine learning", "Machine learning avanzado", "Decisiones basadas en datos", "Storytelling con datos", "Proyecto final"],
  },
  {
    slug: "data-agent", name: "AI+ Data Agent Specialty™", area: "Datos y calidad", level: "Specialty",
    learns: "Agentes de IA aplicados a operaciones con datos: captura, preparación, modelos y cumplimiento.",
    forWho: ["Data Engineer", "BI", "Analítica"],
    modules: ["Introducción a los agentes de IA", "Agentes de datos y su rol", "Captura y adquisición de datos", "Preprocesamiento y features", "Modelos de IA y ML para datos", "Cumplimiento y ética", "Proyecto final"],
  },
  {
    slug: "qa", name: "AI+ Quality Assurance Practitioner™", area: "Datos y calidad", level: "Practitioner",
    learns: "QA con IA: automatización de pruebas, predicción de defectos, NLP para testing, pruebas de rendimiento, exploratorias y de seguridad, y testing continuo.",
    forWho: ["QA", "Automatización de pruebas", "Testing"],
    modules: ["QA e IA", "Fundamentos de IA, ML y deep learning", "Automatización de pruebas con IA", "Predicción y prevención de defectos", "NLP para QA", "Pruebas de rendimiento", "Pruebas exploratorias y de seguridad", "Testing continuo", "Técnicas avanzadas de QA", "Proyecto final"],
  },
  // ── Agentes
  {
    slug: "agent", name: "AI+ Agent Specialty™", area: "Agentes", level: "Specialty",
    learns: "Qué son los agentes de IA, sus tipos y cómo construirlos con herramientas sin código, integrarlos y monitorearlos con guardrails.",
    forWho: ["Cualquier rol técnico", "Producto", "Automatización"],
    modules: ["Introducción a los agentes", "Conceptos y tipos de agentes", "Herramientas sin código", "Construir agentes simples", "AI Agent Builder", "Integración y mapeo de aplicaciones", "Monitoreo, guardrails e IA responsable", "Proyecto final: tu propio agente"],
  },
  // ── Negocio y gestión
  {
    slug: "product-manager", name: "AI+ Product Manager Fundamentals™", area: "Negocio y gestión", level: "Fundamentals",
    learns: "Gestionar productos con IA: ciclo de vida, machine learning básico, métricas, sesgos, regulación y estrategia de implementación.",
    forWho: ["Product Owner", "Product Manager", "Business Analyst"],
    modules: ["IA para Product Managers", "Fundamentos de machine learning", "Ciclo de vida de un producto con IA", "Ética y sesgos", "Estrategias de implementación", "Métricas y desempeño", "Regulación y cumplimiento", "Tendencias de IA en producto"],
  },
  {
    slug: "project-manager", name: "AI+ Project Manager Fundamentals™", area: "Negocio y gestión", level: "Fundamentals",
    learns: "IA en la gestión de proyectos: herramientas, decisiones con datos, colaboración del equipo e implementación responsable.",
    forWho: ["Project Manager", "Scrum Master", "Líder de equipo"],
    modules: ["IA en la gestión de proyectos", "Herramientas de IA para proyectos", "Decisiones basadas en datos", "IA para la colaboración del equipo", "Ética e implicancias sociales", "Implementar IA en proyectos", "Futuro de la IA en proyectos"],
  },
  {
    slug: "project-management", name: "AI+ Project Management Practitioner™", area: "Negocio y gestión", level: "Practitioner",
    learns: "Gestión de proyectos completa con IA: costos, calidad, riesgos, planificación, presupuesto, personas, stakeholders y monitoreo.",
    forWho: ["Project Manager", "PMO", "Delivery"],
    modules: ["Gestión de proyectos", "IA y machine learning", "Costos y calidad", "Riesgos con IA", "Planificación y cronogramas", "Presupuesto con IA", "Planificación de personas", "Stakeholders con IA", "Monitoreo con IA", "El rol transformador de la IA"],
  },
  {
    slug: "agile-pm", name: "AI+ Agile Project Management Fundamentals™", area: "Negocio y gestión", level: "Fundamentals",
    learns: "IA en equipos ágiles: alfabetización de datos, gestión de equipo, analítica predictiva, reportes y evaluación de herramientas.",
    forWho: ["Scrum Master", "Agile Coach", "Product Owner"],
    modules: ["IA en la gestión ágil", "Alfabetización de datos", "IA para recursos y equipos", "Analítica predictiva", "Monitoreo y reportes", "Ética, sesgos y regulación", "Evaluar e implementar herramientas", "Tendencias en agilidad e IA"],
  },
  {
    slug: "ethics", name: "AI+ Ethics Fundamentals™", area: "Negocio y gestión", level: "Fundamentals",
    learns: "Sesgos, transparencia, privacidad, responsabilidad, regulación y marcos de gobierno para usar IA de forma responsable.",
    forWho: ["Cualquier rol", "Liderazgo", "Riesgo y cumplimiento"],
    modules: ["Ética de la IA e impacto social", "Sesgos y equidad", "Transparencia e IA explicable", "Privacidad y seguridad", "Responsabilidad", "Aspectos legales y regulatorios", "Marcos de decisión ética", "Gobierno y buenas prácticas", "Estándares globales"],
  },
  // ── Seguridad
  {
    slug: "security-practitioner", name: "AI+ Security Practitioner™", area: "Seguridad", level: "Practitioner",
    learns: "Bases de ciberseguridad con IA: sistemas, redes, amenazas, Python, respuesta a incidentes y herramientas open source.",
    forWho: ["Analista de ciberseguridad", "Infraestructura"],
    modules: ["Ciberseguridad", "Sistemas operativos", "Redes", "Amenazas, vulnerabilidades y exploits", "IA y machine learning", "Python", "IA aplicada a ciberseguridad", "Respuesta a incidentes y recuperación", "Herramientas open source", "Asegurar el futuro", "Proyecto final"],
  },
  {
    slug: "security-expert", name: "AI+ Security Expert™", area: "Seguridad", level: "Expert",
    learns: "Detección con IA de amenazas de correo, malware y anomalías de red, autenticación segura, GANs y pruebas de penetración.",
    forWho: ["Ciberseguridad", "SOC"],
    modules: ["IA y ciberseguridad", "Python para IA y seguridad", "Machine learning en ciberseguridad", "Amenazas de correo con IA", "Detección de malware", "Anomalías de red", "Autenticación de usuarios", "GANs para ciberseguridad", "Pentesting con IA", "Proyecto final"],
  },
  {
    slug: "security-strategist", name: "AI+ Security Strategist™", area: "Seguridad", level: "Strategist",
    learns: "Ingeniería de sistemas de seguridad con IA: IA adversaria, red, endpoint, cloud y contenedores, identidad, IoT y blockchain.",
    forWho: ["Arquitectura de seguridad", "Liderazgo de ciberseguridad"],
    modules: ["IA y machine learning", "ML para detección y respuesta", "Deep learning en seguridad", "IA adversaria", "Seguridad de red", "Seguridad de endpoints", "Ingeniería de sistemas de IA seguros", "Cloud y contenedores", "IA y blockchain", "Identidad y acceso (IAM)", "Seguridad física e IoT", "Proyecto final"],
  },
  {
    slug: "security-compliance", name: "AI+ Security Compliance Practitioner™", area: "Seguridad", level: "Practitioner",
    learns: "Cumplimiento en ciberseguridad apoyado por IA: riesgo, activos, arquitectura, redes, IAM, operaciones, auditoría y desarrollo seguro.",
    forWho: ["Cumplimiento", "Riesgo", "Auditoría TI"],
    modules: ["Cumplimiento e IA", "Seguridad y gestión de riesgo", "Seguridad de activos", "Arquitectura e ingeniería de seguridad", "Comunicaciones y redes", "Identidad y acceso (IAM)", "Evaluación y respuesta a incidentes", "Operaciones de seguridad", "Desarrollo seguro y auditoría", "Tendencias en cumplimiento"],
  },
  {
    slug: "network", name: "AI+ Network Practitioner™", area: "Seguridad", level: "Practitioner",
    learns: "Redes con IA: tecnologías avanzadas, automatización y orquestación, y seguridad de red potenciada por IA, con laboratorios.",
    forWho: ["Redes", "Infraestructura", "NOC"],
    modules: ["Fundamentos de redes", "Tecnologías avanzadas", "IA en redes", "Automatización y orquestación", "Seguridad de red con IA", "Laboratorios prácticos", "Tendencias"],
  },
  {
    slug: "ethical-hacker", name: "AI+ Ethical Hacker Practitioner™", area: "Seguridad", level: "Practitioner",
    learns: "Hacking ético con IA: reconocimiento, análisis de vulnerabilidades y pentesting, detección de anomalías, respuesta a incidentes y protección de sistemas de IA.",
    forWho: ["Pentester", "Red team", "Ciberseguridad"],
    modules: ["Hacking ético con IA", "IA en el hacking ético", "Herramientas y tecnologías", "Reconocimiento con IA", "Vulnerabilidades y pentesting", "ML para análisis de amenazas", "Análisis de comportamiento y anomalías", "Respuesta a incidentes", "Identidad y acceso (IAM)", "Asegurar sistemas de IA", "Ética", "Proyecto final"],
  },
  // ── Diseño y UX
  {
    slug: "design", name: "AI+ Design Practitioner™", area: "Diseño y UX", level: "Practitioner",
    learns: "Diseño asistido por IA: herramientas, personalización basada en datos, exploración generativa, prototipos y pruebas con usuarios.",
    forWho: ["Diseño", "Diseño de producto"],
    modules: ["IA en el diseño", "Herramientas para diseñadores", "Diseño basado en datos y personalización", "IA generativa para explorar", "Prototipos y pruebas con usuarios", "Implementación estratégica", "Tecnologías emergentes", "Aprendizaje continuo"],
  },
  {
    slug: "ux-designer", name: "AI+ UX Designer Practitioner™", area: "Diseño y UX", level: "Practitioner",
    learns: "UX con IA: contenido, investigación de usuarios con datos, diseño visual y prototipos, y cómo integrar la IA al proceso de diseño.",
    forWho: ["UX / UI", "Research", "Diseño de servicios"],
    modules: ["IA en el diseño", "Herramientas para diseñadores", "Contenido y estrategia con IA", "Investigación de usuarios con IA", "Diseño visual y prototipos", "Mejorar la UX con IA", "Tendencias UX/UI", "IA en tu proceso de diseño"],
  },
];

/** Rutas sugeridas por rol (lectura del Atlas para AI Edge Talent; referencia, no política vigente). */
export const ROLE_ROUTES: { role: string; steps: string[] }[] = [
  { role: "Desarrollo", steps: ["everyone-fundamentals", "prompting-fundamentals", "developer", "context-engineering"] },
  { role: "Full stack", steps: ["everyone-fundamentals", "prompting-fundamentals", "engineer", "agent"] },
  { role: "QA", steps: ["everyone-fundamentals", "prompting-fundamentals", "qa"] },
  { role: "Producto y análisis", steps: ["everyone-fundamentals", "prompting-fundamentals", "product-manager"] },
  { role: "Proyectos y agilidad", steps: ["everyone-fundamentals", "prompting-fundamentals", "agile-pm", "project-manager"] },
  { role: "Datos", steps: ["everyone-fundamentals", "prompting-fundamentals", "data", "data-agent"] },
  { role: "Diseño y UX", steps: ["everyone-fundamentals", "prompting-fundamentals", "design", "ux-designer"] },
  { role: "Seguridad", steps: ["everyone-fundamentals", "ethics", "security-practitioner", "security-expert"] },
  { role: "Arquitectura", steps: ["everyone-fundamentals", "prompting-fundamentals", "cloud", "architect"] },
];

/**
 * Familias de rol para explorar el catálogo. Cada relación sale del Atlas (rutas por rol de AI CERTs, secciones 4–6,
 * y "para quién" de cada malla); no se agregan certificaciones sin respaldo.
 */
export interface RoleFamily { id: string; name: string; roles: string; icon: "code" | "bug" | "target" | "cycle" | "cloud" | "shield" | "database" | "bot" | "pen" | "spark"; certs: string[] }
export const ROLE_FAMILIES: RoleFamily[] = [
  { id: "dev", name: "Desarrollo de software", roles: "Developer, backend, .NET, Java, full stack", icon: "code", certs: ["developer", "engineer", "vibe-coding", "context-engineering"] },
  { id: "qa", name: "QA y testing", roles: "QA, automatización de pruebas", icon: "bug", certs: ["qa"] },
  { id: "product", name: "Producto y análisis", roles: "Product Owner, Product Manager, Business Analyst", icon: "target", certs: ["product-manager"] },
  { id: "agile", name: "Agilidad y proyectos", roles: "Scrum Master, Agile Coach, Project Manager, PMO", icon: "cycle", certs: ["agile-pm", "project-manager", "project-management"] },
  { id: "arch", name: "Arquitectura y cloud", roles: "Arquitectura de soluciones, cloud, DevOps", icon: "cloud", certs: ["architect", "cloud", "engineer"] },
  { id: "sec", name: "Ciberseguridad", roles: "Seguridad, SOC, redes, cumplimiento", icon: "shield", certs: ["security-practitioner", "security-expert", "security-strategist", "security-compliance", "network", "ethical-hacker"] },
  { id: "data", name: "Datos e IA", roles: "Data Analyst, BI, Data Engineer", icon: "database", certs: ["data", "data-agent"] },
  { id: "agents", name: "Agentes de IA", roles: "Automatización y asistentes", icon: "bot", certs: ["agent", "data-agent", "context-engineering"] },
  { id: "design", name: "Diseño y UX", roles: "UX/UI, research, diseño de producto", icon: "pen", certs: ["design", "ux-designer"] },
  { id: "base", name: "Fundamentos para todos", roles: "Cualquier rol: punto de partida", icon: "spark", certs: ["everyone-fundamentals", "prompting-fundamentals", "ethics"] },
];

export const certBySlug = (slug: string) => CATALOG.find((c) => c.slug === slug);
