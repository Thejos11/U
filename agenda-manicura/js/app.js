/* ═══════════════════════════════════════════
   app.js — Lógica principal de Agenda Manicura
   ═══════════════════════════════════════════ */

'use strict';

/* ───────────────────────────────────────────
   CONSTANTES DE JORNADA
   ─────────────────────────────────────────── */
const JORNADA = {
  mañanaInicio:  { h: 8,  m: 45 },
  mañanaFin:     { h: 12, m: 0  },
  tardeInicio:   { h: 13, m: 0  },
  tardeFin:      { h: 19, m: 0  },
  intervalo:     15,                    // minutos para discretizar la grilla
};

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_COMPLETOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

/* ───────────────────────────────────────────
   UTILIDADES
   ─────────────────────────────────────────── */
function pad(n) { return String(n).padStart(2, '0'); }
function hhmm(h, m) { return `${pad(h)}:${pad(m)}`; }
function toMin(h, m) { return h * 60 + m; }
function parseHHMM(str) { const [h, m] = str.split(':').map(Number); return { h, m }; }
function formatPrecio(n) { return '$' + Number(n).toLocaleString('es-CO'); }
function fechaBonita(iso) {
  // iso = 'YYYY-MM-DD'  — se parsea manualmente para evitar desfases de zona horaria
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS_COMPLETOS[dt.getDay()]} ${d} ${MESES[m - 1]} ${y}`;
}
function isoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}

function toast(msg, duracion = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.hidden = true, duracion);
}

/* ───────────────────────────────────────────
   MOTOR DE FRANJAS HORARIAS
   ─────────────────────────────────────────── */
function generarFranjas(duracionServicio) {
  /* Devuelve todas las franjas posibles de inicio para un servicio dado,
     respetando que no cruce 12:00, ni pase de 19:00, ni caiga en almuerzo. */
  const franjas = [];
  const dur = Number(duracionServicio);
  const paso = JORNADA.intervalo;

  // Turno mañana
  let t = toMin(JORNADA.mañanaInicio.h, JORNADA.mañanaInicio.m);
  const limMañana = toMin(JORNADA.mañanaFin.h, JORNADA.mañanaFin.m);
  while (t + dur <= limMañana) {
    franjas.push(hhmm(Math.floor(t/60), t%60));
    t += paso;
  }

  // Turno tarde
  t = toMin(JORNADA.tardeInicio.h, JORNADA.tardeInicio.m);
  const limTarde = toMin(JORNADA.tardeFin.h, JORNADA.tardeFin.m);
  while (t + dur <= limTarde) {
    franjas.push(hhmm(Math.floor(t/60), t%60));
    t += paso;
  }

  return franjas;
}

function franjasDisponibles(fecha, duracionServicio, citaIdExcluir) {
  /* Filtra las franjas que ya están ocupadas por citas activas. */
  const todas = generarFranjas(duracionServicio);
  const citas = Storage.getCitasPorFecha(fecha)
    .filter(c => (c.estado === 'pendiente' || c.estado === 'confirmada') && c.id !== citaIdExcluir);

  return todas.filter(franja => {
    const ini = toMin(...franja.split(':').map(Number));
    const fin = ini + Number(duracionServicio);
    return !citas.some(c => {
      const cIni = toMin(...c.hora.split(':').map(Number));
      const cFin = cIni + Number(c.duracion);
      return ini < cFin && fin > cIni;          // solapamiento
    });
  });
}

/* ───────────────────────────────────────────
   WHATSAPP
   ─────────────────────────────────────────── */
function generarMensajeWhatsApp(cita) {
  const servicio = Storage.getServicios().find(s => s.id === cita.servicioId);
  const nombreServ = servicio ? servicio.nombre : cita.servicioNombre || 'Servicio';
  const precio = servicio ? formatPrecio(servicio.precio) : '';
  const lineas = [
    `¡Hola ${cita.nombre}! 💅✨`,
    ``,
    `Tu cita ha sido agendada:`,
    `📌 Servicio: ${nombreServ}`,
    `📅 Fecha: ${fechaBonita(cita.fecha)}`,
    `🕐 Hora: ${cita.hora}`,
    precio ? `💰 Precio: ${precio}` : '',
    ``,
    `¡Te esperamos! Si necesitas reprogramar, avísanos con tiempo. 😊`,
  ];
  return lineas.filter(Boolean).join('\n');
}

function abrirWhatsApp(cita) {
  const numero = (cita.indicativo || '+57').replace(/\D/g, '') + cita.telefono.replace(/\D/g, '');
  const texto  = encodeURIComponent(generarMensajeWhatsApp(cita));
  window.open(`https://wa.me/${numero}?text=${texto}`, '_blank');
}

/* ───────────────────────────────────────────
   DOM: REFERENCIAS
   ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const dom = {
  // Tabs & vistas
  tabs:          document.querySelectorAll('.tab'),
  vistaLista:    $('vistaLista'),
  vistaCalendario: $('vistaCalendario'),

  // Lista
  listaCitas:  $('listaCitas'),
  filtroFecha: $('filtroFecha'),
  filtroEstado:$('filtroEstado'),

  // Calendario
  calGrid:  $('calGrid'),
  calRango: $('calRango'),
  calPrev:  $('calPrev'),
  calHoy:   $('calHoy'),
  calNext:  $('calNext'),

  // Modal cita
  modalCita:    $('modalCita'),
  formCita:     $('formCita'),
  modalCitaTitulo: $('modalCitaTitulo'),
  citaId:       $('citaId'),
  citaNombre:   $('citaNombre'),
  citaIndicativo: $('citaIndicativo'),
  citaTelefono: $('citaTelefono'),
  citaServicio: $('citaServicio'),
  infoServicio: $('infoServicio'),
  infoDuracion: $('infoDuracion'),
  infoPrecio:   $('infoPrecio'),
  citaFecha:    $('citaFecha'),
  citaHora:     $('citaHora'),
  citaNotas:    $('citaNotas'),
  btnGuardarYWhatsapp: $('btnGuardarYWhatsapp'),

  // Modal detalle
  modalDetalle:    $('modalDetalle'),
  detalleContenido:$('detalleContenido'),
  detalleAcciones: $('detalleAcciones'),

  // Modal servicios
  modalServicios:  $('modalServicios'),
  listaServicios:  $('listaServicios'),
  formServicio:    $('formServicio'),
  formServicioTitulo: $('formServicioTitulo'),
  servicioId:      $('servicioId'),
  servicioNombre:  $('servicioNombre'),
  servicioDuracion:$('servicioDuracion'),
  servicioPrecio:  $('servicioPrecio'),
  btnCancelarServicio: $('btnCancelarServicio'),

  // Acciones header
  btnNuevaCita:      $('btnNuevaCita'),
  btnConfigServicios:$('btnConfigServicios'),
  btnExportar:       $('btnExportar'),
  inputImportar:     $('inputImportar'),
};

/* ───────────────────────────────────────────
   ESTADO APP
   ─────────────────────────────────────────── */
let semanaActual = lunesDeSemana(new Date());
let enviarWhatsappAlGuardar = false;

function lunesDeSemana(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/* ───────────────────────────────────────────
   TABS
   ─────────────────────────────────────────── */
dom.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    dom.tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    dom.vistaLista.classList.toggle('active', target === 'lista');
    dom.vistaCalendario.classList.toggle('active', target === 'calendario');
    if (target === 'calendario') renderCalendario();
  });
});

/* ───────────────────────────────────────────
   MODALES: ABRIR / CERRAR
   ─────────────────────────────────────────── */
function abrirModal(el)  { el.hidden = false; }
function cerrarModal(el) { el.hidden = true; }

document.addEventListener('click', e => {
  if (e.target.matches('[data-close]')) {
    const modal = e.target.closest('.modal-overlay');
    if (modal) cerrarModal(modal);
  }
  if (e.target.classList.contains('modal-overlay')) {
    cerrarModal(e.target);
  }
});

/* ───────────────────────────────────────────
   SERVICIOS: CONFIGURACIÓN
   ─────────────────────────────────────────── */
function renderServicios() {
  const lista = Storage.getServicios();
  dom.listaServicios.innerHTML = lista.map(s => `
    <div class="servicio-item">
      <span class="s-name">${s.nombre}</span>
      <span class="s-meta">${s.duracion} min · ${formatPrecio(s.precio)}</span>
      <button class="btn btn-sm btn-primary" onclick="editarServicio('${s.id}')">✏</button>
      <button class="btn btn-sm btn-danger" onclick="eliminarServicio('${s.id}')">🗑</button>
    </div>
  `).join('');
}

function resetFormServicio() {
  dom.formServicio.reset();
  dom.servicioId.value = '';
  dom.formServicioTitulo.textContent = 'Agregar servicio';
}

window.editarServicio = function(id) {
  const s = Storage.getServicios().find(x => x.id === id);
  if (!s) return;
  dom.servicioId.value      = s.id;
  dom.servicioNombre.value  = s.nombre;
  dom.servicioDuracion.value= s.duracion;
  dom.servicioPrecio.value  = s.precio;
  dom.formServicioTitulo.textContent = 'Editar servicio';
};

window.eliminarServicio = function(id) {
  if (!confirm('¿Eliminar este servicio?')) return;
  Storage.deleteServicio(id);
  renderServicios();
  toast('Servicio eliminado');
};

dom.formServicio.addEventListener('submit', e => {
  e.preventDefault();
  const datos = {
    nombre:   dom.servicioNombre.value.trim(),
    duracion: Number(dom.servicioDuracion.value),
    precio:   Number(dom.servicioPrecio.value),
  };
  const id = dom.servicioId.value;
  if (id) {
    Storage.updateServicio(id, datos);
    toast('Servicio actualizado');
  } else {
    Storage.addServicio(datos);
    toast('Servicio agregado');
  }
  resetFormServicio();
  renderServicios();
  poblarSelectServicios();
});

dom.btnCancelarServicio.addEventListener('click', resetFormServicio);

dom.btnConfigServicios.addEventListener('click', () => {
  renderServicios();
  resetFormServicio();
  abrirModal(dom.modalServicios);
});

/* ───────────────────────────────────────────
   SELECT DE SERVICIOS EN FORMULARIO CITA
   ─────────────────────────────────────────── */
function poblarSelectServicios() {
  const servicios = Storage.getServicios();
  dom.citaServicio.innerHTML = '<option value="">Seleccionar…</option>' +
    servicios.map(s => `<option value="${s.id}">${s.nombre} (${s.duracion} min)</option>`).join('');
}

dom.citaServicio.addEventListener('change', () => {
  const s = Storage.getServicios().find(x => x.id === dom.citaServicio.value);
  if (s) {
    dom.infoServicio.hidden = false;
    dom.infoDuracion.textContent = `⏱ ${s.duracion} min`;
    dom.infoPrecio.textContent   = `💰 ${formatPrecio(s.precio)}`;
  } else {
    dom.infoServicio.hidden = true;
  }
  recalcularHoras();
});

dom.citaFecha.addEventListener('change', recalcularHoras);

function recalcularHoras() {
  const servicio = Storage.getServicios().find(s => s.id === dom.citaServicio.value);
  const fecha    = dom.citaFecha.value;
  dom.citaHora.innerHTML = '<option value="">Elige servicio y fecha primero</option>';
  if (!servicio || !fecha) return;

  const citaIdActual = dom.citaId.value || null;
  const disponibles = franjasDisponibles(fecha, servicio.duracion, citaIdActual);

  if (disponibles.length === 0) {
    dom.citaHora.innerHTML = '<option value="">Sin horarios disponibles</option>';
    return;
  }
  dom.citaHora.innerHTML = '<option value="">Seleccionar hora…</option>' +
    disponibles.map(h => `<option value="${h}">${h}</option>`).join('');
}

/* ───────────────────────────────────────────
   MODAL: NUEVA / EDITAR CITA
   ─────────────────────────────────────────── */
dom.btnNuevaCita.addEventListener('click', () => abrirFormCita());

function abrirFormCita(cita) {
  dom.formCita.reset();
  dom.citaId.value = '';
  dom.infoServicio.hidden = true;
  poblarSelectServicios();

  if (cita) {
    dom.modalCitaTitulo.textContent = 'Editar Cita';
    dom.citaId.value          = cita.id;
    dom.citaNombre.value      = cita.nombre;
    dom.citaIndicativo.value  = cita.indicativo || '+57';
    dom.citaTelefono.value    = cita.telefono;
    dom.citaServicio.value    = cita.servicioId;
    dom.citaServicio.dispatchEvent(new Event('change'));
    dom.citaFecha.value       = cita.fecha;
    recalcularHoras();
    // Dar un tick para que se llene el select de horas
    setTimeout(() => { dom.citaHora.value = cita.hora; }, 50);
    dom.citaNotas.value       = cita.notas || '';
  } else {
    dom.modalCitaTitulo.textContent = 'Nueva Cita';
    dom.citaFecha.value = isoDate(new Date());
  }

  abrirModal(dom.modalCita);
}

function guardarCita() {
  const servicio = Storage.getServicios().find(s => s.id === dom.citaServicio.value);
  if (!servicio) { toast('Selecciona un servicio'); return null; }
  if (!dom.citaHora.value) { toast('Selecciona una hora disponible'); return null; }

  const datos = {
    nombre:        dom.citaNombre.value.trim(),
    indicativo:    dom.citaIndicativo.value.trim(),
    telefono:      dom.citaTelefono.value.trim(),
    servicioId:    servicio.id,
    servicioNombre:servicio.nombre,
    duracion:      servicio.duracion,
    precio:        servicio.precio,
    fecha:         dom.citaFecha.value,
    hora:          dom.citaHora.value,
    notas:         dom.citaNotas.value.trim(),
  };

  let cita;
  const id = dom.citaId.value;
  if (id) {
    cita = Storage.updateCita(id, datos);
    toast('Cita actualizada ✅');
  } else {
    cita = Storage.addCita(datos);
    toast('Cita creada ✅');
  }
  return cita;
}

dom.formCita.addEventListener('submit', e => {
  e.preventDefault();
  enviarWhatsappAlGuardar = false;
  const cita = guardarCita();
  if (!cita) return;
  cerrarModal(dom.modalCita);
  refrescarVistas();
});

dom.btnGuardarYWhatsapp.addEventListener('click', () => {
  // Validar el formulario manualmente
  if (!dom.formCita.reportValidity()) return;
  const cita = guardarCita();
  if (!cita) return;
  cerrarModal(dom.modalCita);
  refrescarVistas();
  abrirWhatsApp(cita);
});

/* ───────────────────────────────────────────
   MODAL: DETALLE DE CITA
   ─────────────────────────────────────────── */
function abrirDetalle(id) {
  const cita = Storage.getCitas().find(c => c.id === id);
  if (!cita) return;
  const servicio = Storage.getServicios().find(s => s.id === cita.servicioId);

  dom.detalleContenido.innerHTML = `
    <dl class="detalle-grid">
      <dt>Clienta</dt><dd>${cita.nombre}</dd>
      <dt>WhatsApp</dt><dd>${cita.indicativo} ${cita.telefono}</dd>
      <dt>Servicio</dt><dd>${cita.servicioNombre || (servicio ? servicio.nombre : '—')}</dd>
      <dt>Duración</dt><dd>${cita.duracion} min</dd>
      <dt>Precio</dt><dd>${formatPrecio(cita.precio)}</dd>
      <dt>Fecha</dt><dd>${fechaBonita(cita.fecha)}</dd>
      <dt>Hora</dt><dd>${cita.hora}</dd>
      <dt>Estado</dt><dd><span class="badge ${cita.estado}">${cita.estado}</span></dd>
      ${cita.notas ? `<dt>Notas</dt><dd>${cita.notas}</dd>` : ''}
    </dl>
  `;

  const estados = ['pendiente', 'confirmada', 'completada', 'cancelada'];
  const botonesEstado = estados
    .filter(e => e !== cita.estado)
    .map(e => `<button class="btn btn-sm badge ${e}" onclick="cambiarEstado('${cita.id}','${e}')">${e}</button>`)
    .join('');

  dom.detalleAcciones.innerHTML = `
    ${botonesEstado}
    <button class="btn btn-sm btn-whatsapp" onclick="whatsappDesdeDetalle('${cita.id}')">💬 WhatsApp</button>
    <button class="btn btn-sm btn-primary" onclick="editarCitaDesdeDetalle('${cita.id}')">✏ Editar</button>
  `;

  abrirModal(dom.modalDetalle);
}

window.cambiarEstado = function(id, estado) {
  Storage.updateCita(id, { estado });
  toast(`Estado → ${estado}`);
  cerrarModal(dom.modalDetalle);
  refrescarVistas();
};

window.whatsappDesdeDetalle = function(id) {
  const cita = Storage.getCitas().find(c => c.id === id);
  if (cita) abrirWhatsApp(cita);
};

window.editarCitaDesdeDetalle = function(id) {
  const cita = Storage.getCitas().find(c => c.id === id);
  if (!cita) return;
  cerrarModal(dom.modalDetalle);
  abrirFormCita(cita);
};

/* ───────────────────────────────────────────
   VISTA LISTA
   ─────────────────────────────────────────── */
function renderLista() {
  let citas = Storage.getCitas();
  const fecha  = dom.filtroFecha.value;
  const estado = dom.filtroEstado.value;
  if (fecha)  citas = citas.filter(c => c.fecha === fecha);
  if (estado) citas = citas.filter(c => c.estado === estado);

  // Ordenar por fecha y hora
  citas.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

  if (citas.length === 0) {
    dom.listaCitas.innerHTML = '<div class="lista-vacia">No hay citas para mostrar 📭</div>';
    return;
  }

  dom.listaCitas.innerHTML = citas.map(c => `
    <div class="cita-card ${c.estado}" onclick="abrirDetalle('${c.id}')">
      <span class="nombre">${c.nombre}</span>
      <span class="servicio">${c.servicioNombre || '—'}</span>
      <span class="fecha-hora">📅 ${c.fecha} 🕐 ${c.hora}</span>
      <span class="badge ${c.estado}">${c.estado}</span>
    </div>
  `).join('');
}

// Exponer para onclick
window.abrirDetalle = abrirDetalle;

dom.filtroFecha.addEventListener('change', renderLista);
dom.filtroEstado.addEventListener('change', renderLista);

/* ───────────────────────────────────────────
   VISTA CALENDARIO SEMANAL
   ─────────────────────────────────────────── */
function renderCalendario() {
  const lunes = semanaActual;
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(d.getDate() + i);
    dias.push(d);
  }

  const hoyISO = isoDate(new Date());
  const domStr = isoDate(dias[6]);
  dom.calRango.textContent = `${dias[0].getDate()} ${MESES[dias[0].getMonth()]} – ${dias[6].getDate()} ${MESES[dias[6].getMonth()]} ${dias[6].getFullYear()}`;

  // Generar filas de horas (cada 15 min de 08:45 a 19:00)
  const filas = [];
  let t = toMin(8, 45);
  const fin = toMin(19, 0);
  while (t < fin) {
    filas.push({ h: Math.floor(t/60), m: t%60 });
    t += JORNADA.intervalo;
  }

  // Cargar citas de la semana
  const citasSemana = {};
  dias.forEach(d => {
    const iso = isoDate(d);
    citasSemana[iso] = Storage.getCitasPorFecha(iso);
  });

  let html = '';

  // Fila de headers
  html += '<div class="cal-cell cal-header corner">Hora</div>';
  dias.forEach(d => {
    const iso = isoDate(d);
    const isHoy = iso === hoyISO;
    html += `<div class="cal-cell cal-header${isHoy ? ' today' : ''}">${DIAS_SEMANA[d.getDay()]}<br>${d.getDate()}/${pad(d.getMonth()+1)}</div>`;
  });

  // Filas horarias
  filas.forEach(slot => {
    const slotMin = toMin(slot.h, slot.m);
    const esAlmuerzo = slotMin >= toMin(12,0) && slotMin < toMin(13,0);
    const horaStr = hhmm(slot.h, slot.m);

    html += `<div class="cal-cell cal-hora${esAlmuerzo ? ' almuerzo' : ''}">${horaStr}</div>`;

    dias.forEach(d => {
      const iso = isoDate(d);
      const isHoy = iso === hoyISO;
      let cellClass = `cal-cell${esAlmuerzo ? ' almuerzo' : ''}${isHoy ? ' today' : ''}`;

      // Buscar citas que empiezan en este slot
      const citasAqui = (citasSemana[iso] || []).filter(c => c.hora === horaStr);
      let inner = '';
      citasAqui.forEach(c => {
        inner += `<div class="cal-event ${c.estado}" onclick="abrirDetalle('${c.id}')" title="${c.nombre} — ${c.servicioNombre}">${c.nombre}</div>`;
      });

      html += `<div class="${cellClass}">${inner}</div>`;
    });
  });

  dom.calGrid.innerHTML = html;
}

dom.calPrev.addEventListener('click', () => {
  semanaActual.setDate(semanaActual.getDate() - 7);
  renderCalendario();
});
dom.calNext.addEventListener('click', () => {
  semanaActual.setDate(semanaActual.getDate() + 7);
  renderCalendario();
});
dom.calHoy.addEventListener('click', () => {
  semanaActual = lunesDeSemana(new Date());
  renderCalendario();
});

/* ───────────────────────────────────────────
   EXPORTAR / IMPORTAR
   ─────────────────────────────────────────── */
dom.btnExportar.addEventListener('click', () => {
  Storage.exportar();
  toast('Respaldo exportado 📥');
});

dom.inputImportar.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await Storage.importar(file);
    toast('Respaldo importado correctamente ✅');
    refrescarVistas();
  } catch (err) {
    toast('Error al importar: ' + err.message);
  }
  e.target.value = '';     // reset para permitir re-importar mismo archivo
});

/* ───────────────────────────────────────────
   REFRESH GLOBAL
   ─────────────────────────────────────────── */
function refrescarVistas() {
  renderLista();
  if (dom.vistaCalendario.classList.contains('active')) renderCalendario();
}

/* ───────────────────────────────────────────
   INICIO
   ─────────────────────────────────────────── */
(function init() {
  poblarSelectServicios();
  renderLista();
})();
