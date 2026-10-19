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
