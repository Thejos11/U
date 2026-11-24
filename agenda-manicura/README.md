# 💅 Agenda Manicura

Aplicación web completa para agendar citas de manicura. Funciona **100% offline**, sin servidor ni frameworks — solo HTML5, CSS3 y JavaScript puro.

---

## 🚀 Uso Rápido

### Opción 1 — Abrir directamente
Haz doble clic en `index.html` y se abrirá en tu navegador. ¡Listo!

### Opción 2 — Servidor local (opcional)
Si prefieres usar un servidor local:

```bash
# Con Python 3
cd agenda-manicura
python -m http.server 8080

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8080
```
Luego abre `http://localhost:8080` en tu navegador.

---

## 📦 Empaquetar como ZIP

### Windows (PowerShell)
```powershell
Compress-Archive -Path agenda-manicura\* -DestinationPath agenda-manicura.zip
```

### Linux / macOS
```bash
zip -r agenda-manicura.zip agenda-manicura/
```

---

## 📂 Estructura del Proyecto

```
agenda-manicura/
├── index.html          ← Página principal
├── css/
│   └── styles.css      ← Estilos (responsive, colores por estado)
├── js/
│   ├── storage.js      ← Persistencia localStorage + export/import JSON
│   └── app.js          ← Lógica: franjas horarias, calendario, WhatsApp
└── README.md           ← Este archivo
```

---

## ✨ Funcionalidades

### 🎨 Gestión de Servicios
- 5 servicios precargados (Manicura tradicional, Semipermanente, Acrílicas, Polygel, Retiro)
- Panel para agregar, editar y eliminar servicios con nombre, duración y precio en COP

### 📅 Motor de Horarios Inteligente
- **Turno mañana:** 08:45 – 12:00
- **Almuerzo bloqueado:** 12:00 – 13:00
- **Turno tarde:** 13:00 – 19:00
- Calcula franjas disponibles según la duración del servicio
- Previene solapamientos automáticamente
- Ningún turno cruza las 12:00 ni pasa de las 19:00

### 💬 Confirmación por WhatsApp
- Genera enlace `wa.me` con mensaje personalizado (nombre, servicio, fecha, hora, precio)
- Disponible al crear la cita y desde el detalle de cada cita
- Indicativo `+57` por defecto, editable

### 👁 Vista Doble
- **Vista de Lista:** filtrable por fecha y estado
- **Calendario Semanal:** navegación semana anterior / hoy / semana siguiente, franja de almuerzo visible, citas con colores por estado

### 🏷 Estados de Citas
| Estado | Color |
|---|---|
| Pendiente | 🟡 Amarillo |
| Confirmada | 🟢 Verde |
| Completada | 🔵 Azul |
| Cancelada | 🔴 Rojo |

### 💾 Persistencia y Respaldos
- Guardado automático en `localStorage`
- Botón **Exportar** → descarga archivo `.json`
- Botón **Importar** → carga un respaldo `.json`
- Portabilidad total: lleva tu agenda a otro PC con el archivo JSON

---

## 🌐 Compatibilidad
- Chrome, Edge, Firefox, Safari (versiones modernas)
- Responsive: funciona en escritorio, tablet y móvil
- No requiere internet (excepto para enviar WhatsApp)

---

## 📝 Licencia
Uso libre. Hecho con 💅 y ☕.
