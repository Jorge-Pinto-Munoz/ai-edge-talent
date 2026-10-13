# Sistema de diseño AET

Un solo lenguaje visual para el sitio público, el área de equipo (Delivery), el portal del profesional y el admin.
Archivos: `app/globals.css` (tokens y base), `app/site.css` (sitio público), `app/ds.css` (componentes compartidos).

## Fundamentos

| Token | Valor | Uso |
|---|---|---|
| Color de marca | `--obsidian #080b10`, `--cyan #3dc9d4`, `--magenta #c765c0`, `--deep-teal #1e6e78` | Fondos oscuros, acento, degradado de marca (solo en titulares) |
| Superficies | `--bg`, `--surface`, `--surface-2`, `--border` | Fondo, tarjetas, bloques secundarios, bordes (con modo oscuro) |
| Texto | `--text`, `--muted`, `--brand` | Cuerpo, secundario, enlaces y acentos de texto |
| Semánticos | `--ok-*`, `--warn-*`, `--bad-*`, `--info-soft`, `--review-soft` | Estados (ver Status Indicator) |
| Tipografía | Gilroy · `--fs-display`, `--fs-h1`, `--fs-h2`, `--fs-h3`, `--fs-lead` (fluidas con `clamp`) | H1 una por página; H2 por sección; H3 en tarjetas |
| Espaciado | múltiplos de 4/8 · `--sp-section` entre secciones | Ritmo vertical consistente |
| Radios | 12 (controles) · 20 (`--r-lg`, tarjetas) · 28 (`--r-xl`, paneles) · 999 (píldoras) | |
| Elevación | `--e1` (reposo), `--e2` (hover/flotante) | Nunca más de dos niveles |
| Movimiento | 150–250 ms (`--dur`, `--ease`) en interacciones; 300–700 ms en apariciones | Siempre con `prefers-reduced-motion` |
| Grid | contenedor 1200 px, gutter 24 px (16 px en celular) | |
| Iconos | `components/site/Icon.tsx`: línea 24×24, trazo 1,75, puntas redondeadas | Sin íconos rellenos ni de terceros |

## Componentes

| Componente | Dónde | Notas |
|---|---|---|
| Certification Card | `CertCatalog` · `.cx-card` | Misma estructura y alto (subgrid): área + nivel, nombre (2 líneas), aprendizaje (3 líneas), roles (máx. 2 + n), "Ver detalle" |
| Role Selector | `CertCatalog` · `.cx-role` | Multi-selección, conteo, estados hover/selected/focus; en celular, 2 columnas sin hover |
| Detail Drawer | `components/site/Sheet.tsx` | Detalle sin sobrecargar la tarjeta; foco atrapado, Esc cierra |
| Filter Bar | `.cx-bar` | Conteo vivo, búsqueda, limpiar filtros, ver todas |
| Journey Step | `DeliveryJourney` (`.dj-rail`) y Mi journey (`.jr-step`) | Estados del sistema |
| Status Indicator | `components/ds/Status.tsx` · `.ds-status` | Pendiente · En curso · Completado · Requiere atención · Bloqueado |
| KPI Card | `Kpi` · `.ds-kpi` | Cifra real o "—"; nunca cifras inventadas |
| Action Checklist | `.ds-checklist` | Acciones concretas, sin casillas decorativas |
| Milestone | `.ds-milestones` | Hitos numerados con línea |
| Playbook Navigation | `PlaybookExplorer` | Índice por etapa + búsqueda transversal |
| Login / OTP | `StaffLogin` · `.auth-card`, `.otp` | 4 casillas numéricas, pegar el código funciona, reenvío con espera |

## Reglas

- Una idea por sección y revelado progresivo: visión general → filtro → detalle en panel.
- Cifras: solo datos reales y agregados; bajo 5 personas, estado vacío explicado.
- Accesibilidad: contraste AA, foco visible (`--cyan`), navegación por teclado, áreas táctiles ≥ 44 px, `aria-pressed` en selectores.
- Nada de botones que sugieran funciones no implementadas.
