# Pendientes

Lista corta para retomar sin repasar conversaciones. Actualizar al cerrar cada tarea.

## Abiertos
- Delivery en Journey/Talento sigue pudiendo revisar entregas, certificaciones y seguimientos (funciones propias de su rol); si eso también debe ser solo lectura, ajustar `submissions`/`certifications`/`follow_ups`.
- Rediseño Admisión (tabla 7 columnas + ficha de candidato a página completa con pestañas): pendiente; estados/colores nuevos ya en `lib/admission/queue.ts`.
- Cargar en Contenido las cápsulas de video y la cápsula del reto (plantilla + instrucciones) de AI First Mindset.
- **Grabadora de rescate en celulares reales**: probada solo con cámara simulada; falta probar en iPhone (Safari) y Android (Chrome).
- **Error React #418 (hidratación)** en páginas dinámicas de producción. Ya existía antes; no bloquea.
- **Prueba de navegación intermitente**: a veces lee el menú mientras la página cambia (falso fallo de la prueba, no de la app).

## Límites conocidos (decisión, no error)
- Cron diario (plan gratis de Vercel): el aviso de una apertura programada puede tardar hasta ~24 h si nadie entra antes. «Abrir etapa» avisa al instante.
- Storage de Supabase gratis: máximo 50 MB por archivo (alcanza para 3 min grabados en la plataforma).
- Waves con personas en el journey al publicar la apertura por Wave quedaron con AI First Mindset abierta; las nuevas parten cerradas.

## Hecho recientemente
- AI First Mindset: los profesionales solo ven sus cápsulas si la etapa está ABIERTA para su Wave (RLS + wave_stage_openings). La vista previa del admin ahora oculta lo mismo y lo avisa; Contenido muestra «AI First Mindset está cerrada» con botón «Abrir o programar la etapa».
- Admin: «Mover de etapa» en la ficha del participante (y enlace desde Journey → participantes): cualquier etapa, adelante o atrás, sin requisitos; si no estaba inscrito lo inscribe y crea su cuenta; registra evento + auditoría y envía STAGE_MOVED con CC a su Delivery (opcional). Móvil: casillas del código sin desborde (6 dígitos se mantienen), menú hamburguesa del admin, archivos se descargan al dispositivo con su nombre real (SignedLink descarga; `view` para abrir), barrido 390 px + axe sin violaciones (contraste KPI corregido, casillas 20 px, enlaces de regreso más altos, plazo y descargas apilados en el módulo).
- Mi journey: las cápsulas son módulos desplegables en el camino (comprimidos: número, ~min, estado). Al abrir: video principal (modal centrado), reto/tarea con plazo (día, mes, año, hora de Chile + «quedan N días»), entrega con arrastrar y soltar (formatos y 50 MB visibles; validado en cliente y servidor), material, insumos complementarios (descarga sin abrir pestañas) y recursos complementarios (videos en modal; podcasts/enlaces en pestaña nueva). Abrir = visto. `/mi-journey/capsula/[id]` redirige a `/mi-journey?m=<id>`. Admin → Contenido: botón «Editar» por cápsula (también publicadas), secciones 1–4, plazo con hora y formatos aceptados. Migración 20261104 (links, extras, due_at, submission_formats).
- Cápsulas (profesional): al abrirla queda «Vista» sola (sin casilla); estado en la cabecera: Vista · falta tu entrega / Entregada · en revisión / Aprobada / No aprobada. La entrega se hace dentro de la cápsula; la pestaña Entregas lista «Por entregar» con enlace a cada cápsula. Plazo con selector de fecha y errores legibles (antes «[object Object]»). Aprobar: admin o Delivery (reviewSubmission) — confirmar si solo admin.
- Sitio público `/programa/[etapa]`: «Video de la etapa» ahora se carga desde Admin → Contenido → «Video de la etapa en el sitio público» (enlace por etapa, común a todas las Waves; `app_settings.public_stage_videos`). Sin enlace se muestra la tarjeta de reserva.
- Admisión → «Descargar contactos» (Excel, solo admin): nombre, cliente y rol homologados, correo, teléfono (candidato o su perfil), Delivery a cargo, puntaje, estado y video de rescate (envió / no envió-vencido / plazo vigente / no aplica). Ruta `/admin/admision/[waveId]/exportar/contactos`.
- Rescate: «Pasar a siguiente fase (n)» en la barra de marcados para todo candidato en rescate (video enviado, plazo vencido o vigente con video recibido por otro medio) → selección con correo de bienvenida + CC Delivery; «No seleccionar» también los incluye. En la ficha, bloque «Decisión tras el rescate» siempre visible en rescate (antes exigía video y revisión guardada y no enviaba correo).
- Admisión: cada fila tiene «Detalles»; el siguiente paso recomendado (Seleccionar / Ofrecer rescate / No seleccionar / Reintentar evaluación) va en la barra de lo marcado, cada botón solo para quienes tienen ese paso, con confirmación; filtro «siguiente paso»; Eliminar y Quitar selección en «···». Rescate en lote con el foco sugerido por la rúbrica (`offerSuggestedRescue`).
- RLS: Delivery solo lee sus asignados (`is_delivery_of`, migración 20261103) en candidatos, postulación, historial, compromiso, rescate, correos y asignaciones; no puede insertar/modificar/borrar candidatos. Importar candidatos: solo admin. Sus totales en Equipo ahora cuentan solo a sus asignados.
- Cliente como columna propia (ordenable: clic en «Cliente» o «Cliente (A–Z)»; sin cliente al final, luego puntaje) en Admisión y en Equipo (Delivery); rol bajo el nombre. Clientes homologados (`lib/text/org.ts`) también en el filtro.
- Admisión: botón verde «Seleccionar» por fila (abre la confirmación) y en lote «Seleccionar (N)» con resumen de qué pasará y resultado por persona. «Evaluar con IA» solo como «Reintentar evaluación» si falta la evaluación automática.
- Equipo (Delivery): tabla de sus profesionales con estado real, puntaje, recomendación y «Detalles» (ficha completa en lectura).
- Rescate: recuadro «Lo que queremos conocer de ti» (foco por dimensión baja de la rúbrica) visible al profesional, Delivery y admin; también en el correo.
- Delivery: en Admisión ve solo sus candidatos asignados, con puntaje, recomendación y «Detalles» (evaluación IA, respuestas, video de rescate, historial) en solo lectura. Admisión: filtro por cliente y orden por mayor puntaje por defecto.
- Menos correos: el Delivery recibe la copia del correo al profesional; aviso aparte solo si no hubo correo al profesional (no selección) o si ese correo falló. (E2E sDec no re-ejecutado tras este ajuste.)
- Baja de inscritos (escribir ELIMINAR) con aviso opcional al profesional + CC Delivery. Todo correo informativo al profesional va con CC a su Delivery (nunca los de código). Confirmación de video de rescate recibido. Sección Admin → Comunicaciones: registro, detalle, CC y reenvío.
- Admisión: control de postulaciones (abrir/cerrar ahora, rango inicio–cierre en hora de Chile, ocultar fecha a postulantes).
- Aviso al Delivery asignado en cada decisión: seleccionado, rescate (con plazo 24 h), no seleccionado y resultado tras rescate. Uno por decisión.
- Videos embebidos desde YouTube (incl. Shorts), Vimeo (también privado con hash), Loom y Google Drive.
- Correos: banner de marca en HTML, 640 px y responsive. Portal del candidato más ancho (1160 px). Explicación del rescate: máx. 3 dimensiones y siglas intactas.
- AI First Mindset: cápsula con plantilla + tarea = reto en 3 pasos (descargar, completar, subir la misma plantilla); archivo obligatorio.
- Antes de postular: 5 etapas en slider con lo esperado en cada una, compromisos del ciclo y aceptación en un clic. Assessment con más aire.
- Admisión en 4 columnas, panel «Evaluar», decisiones con confirmación y correo único.
- Rescate por invitación (24 h) con grabación en la plataforma, enlace o archivo.
- Apertura de AI First Mindset por Wave (abrir / programar / cancelar) y vista previa del profesional.
