/* ═══════════════════════════════════════════
   storage.js — Persistencia en localStorage
   y respaldos JSON (exportar / importar)
   ═══════════════════════════════════════════ */

'use strict';

const Storage = (() => {

  const KEYS = {
    citas:     'agenda_manicura_citas',
    servicios: 'agenda_manicura_servicios',
  };

  /* ── Servicios por defecto ────────────────── */
  const SERVICIOS_DEFAULT = [
    { id: _uid(), nombre: 'Manicura tradicional',  duracion: 45,  precio: 25000  },
    { id: _uid(), nombre: 'Semipermanente',         duracion: 60,  precio: 45000  },
    { id: _uid(), nombre: 'Uñas acrílicas',         duracion: 90,  precio: 70000  },
    { id: _uid(), nombre: 'Polygel',                 duracion: 90,  precio: 75000  },
    { id: _uid(), nombre: 'Retiro / Mantenimiento',  duracion: 30,  precio: 20000  },
  ];

  /* ── Helpers ──────────────────────────────── */
  function _uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function _read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function _write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  /* ── API Servicios ────────────────────────── */
  function getServicios() {
    let data = _read(KEYS.servicios);
    if (!data || !Array.isArray(data) || data.length === 0) {
      data = SERVICIOS_DEFAULT;
      _write(KEYS.servicios, data);
    }
    return data;
  }

  function saveServicios(lista) {
    _write(KEYS.servicios, lista);
  }

  function addServicio(s) {
    const lista = getServicios();
    s.id = _uid();
    lista.push(s);
    saveServicios(lista);
    return s;
  }

  function updateServicio(id, datos) {
    const lista = getServicios();
    const idx = lista.findIndex(s => s.id === id);
    if (idx === -1) return null;
    Object.assign(lista[idx], datos);
    saveServicios(lista);
    return lista[idx];
  }

  function deleteServicio(id) {
    let lista = getServicios();
    lista = lista.filter(s => s.id !== id);
    saveServicios(lista);
  }

  /* ── API Citas ────────────────────────────── */
  function getCitas() {
    return _read(KEYS.citas) || [];
  }

  function saveCitas(lista) {
    _write(KEYS.citas, lista);
  }

  function addCita(c) {
    const lista = getCitas();
    c.id = _uid();
    c.estado = c.estado || 'pendiente';
    lista.push(c);
    saveCitas(lista);
    return c;
  }

  function updateCita(id, datos) {
    const lista = getCitas();
    const idx = lista.findIndex(c => c.id === id);
    if (idx === -1) return null;
    Object.assign(lista[idx], datos);
    saveCitas(lista);
    return lista[idx];
  }

  function deleteCita(id) {
    let lista = getCitas();
    lista = lista.filter(c => c.id !== id);
    saveCitas(lista);
  }

  function getCitasPorFecha(fecha) {
    // fecha = 'YYYY-MM-DD'
    return getCitas().filter(c => c.fecha === fecha);
  }

  /* ── Exportar / Importar ──────────────────── */
  function exportar() {
    const payload = {
      version: 1,
      exportado: new Date().toISOString(),
      servicios: getServicios(),
      citas: getCitas(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `agenda_manicura_${payload.exportado.slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importar(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data.servicios || !data.citas) throw new Error('Formato inválido');
          saveServicios(data.servicios);
          saveCitas(data.citas);
          resolve(data);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    });
  }

  /* ── Utilidades públicas ──────────────────── */
  function uid() { return _uid(); }

  /* ── Interfaz pública ─────────────────────── */
  return {
    getServicios, saveServicios, addServicio, updateServicio, deleteServicio,
    getCitas, saveCitas, addCita, updateCita, deleteCita, getCitasPorFecha,
    exportar, importar, uid,
  };

})();
