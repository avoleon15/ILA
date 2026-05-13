# ASDRUBAL — Frontend

Frontend del juego multijugador de dibujo **ASDRUBAL**, construido con **React 19** y **Vite**. Se comunica con el backend en tiempo real vía **Socket.io** y no usa un router de páginas convencional — la navegación se maneja internamente con un sistema de estado (`GameRouter`).

---

## Stack tecnológico

| Paquete | Versión | Propósito |
|---|---|---|
| `react` | ^19.2.5 | UI |
| `react-dom` | ^19.2.5 | Renderizado al DOM |
| `socket.io-client` | ^4.8.3 | Comunicación en tiempo real con el backend |
| `@phosphor-icons/react` | ^2.1.10 | Íconos |
| `vite` | ^8.0.9 | Bundler y servidor de desarrollo |

---

## Estructura del proyecto

```
Frontend/
├── src/
│   ├── main.jsx                  # Punto de entrada — monta <App />
│   ├── App.jsx                   # Estado global del juego (gameState)
│   ├── GameRouter.jsx            # Enruta entre pantallas según gameState.screen
│   ├── Screens.jsx               # Exporta todas las pantallas
│   ├── socket.js                 # Instancia única de Socket.io-client
│   ├── screens/
│   │   ├── MenuScreen/           # Pantalla principal — opciones de crear o unirse
│   │   ├── createGame/           # Configurar y crear una sala nueva
│   │   ├── JoinGame/             # Unirse a una sala con código de 6 caracteres
│   │   ├── LobbyScreen/          # Sala de espera antes de iniciar la partida
│   │   ├── SelecTopic/           # El jugador elegido selecciona el tema de dibujo
│   │   ├── GameLogic/            # Canvas de dibujo + temporizador
│   │   ├── VotingScreen/         # Votación de los dibujos (rating 1–5)
│   │   ├── WinnerScreen/         # Resultados y ranking final
│   │   └── Matches/              # Historial de partidas guardadas en MongoDB
│   └── components/
│       ├── BackButton/           # Botón de regreso reutilizable
│       ├── Gamemode/             # Selector de modo de juego (Classic/Rapid/Extended)
│       ├── NavBar/               # Barra de navegación
│       ├── NumberInput/          # Input numérico para seleccionar cantidad de jugadores
│       ├── OptionHolder/         # Botón de acción principal reutilizable
│       ├── TitleHolder/          # Componente de título de pantalla
│       ├── Adlg/                 # Ad display — large
│       ├── Admd/                 # Ad display — medium
│       └── Adsm/                 # Ad display — small
├── public/
├── .env                          # Variables de entorno (no subir a git)
├── .env.example                  # Plantilla de variables de entorno
├── index.html
├── vite.config.js
└── package.json
```

---

## Navegación

No se usa React Router. `App.jsx` mantiene un estado `gameState` con un campo `screen` que `GameRouter.jsx` usa para renderizar la pantalla correcta. Para navegar se llama a la función `navigate('nombre-de-pantalla')` que se pasa como prop.

### Pantallas y sus nombres de ruta

| Nombre | Pantalla |
|---|---|
| `menu` | Menú principal |
| `createGame` | Crear partida |
| `joinGame` | Unirse con código |
| `lobby` | Sala de espera |
| `selecTopic` | Selección de tema |
| `game` | Fase de dibujo |
| `voting` | Fase de votación |
| `winner` | Resultados |
| `matches` | Historial de partidas |

---

## Estado global (`gameState`)

`App.jsx` define el estado compartido entre todas las pantallas:

```js
{
  screen: 'menu',         // Pantalla actual
  playerName: '',         // Nombre del jugador
  roomCode: '',           // Código de 6 caracteres de la sala
  playerId: '',           // UUID del jugador (asignado por el backend)
  isHost: false,          // true si el jugador es el host de la sala
  players: [],            // Array de jugadores actuales en la sala
  maxPlayers: 8,          // Máximo de jugadores de la sala
  gameMode: 'classic',    // Modo de juego seleccionado al crear la sala
  topicSelector: null,    // Jugador designado para elegir el tema
  currentTopic: '',       // Tema de dibujo de la ronda actual
}
```

---

## Variables de entorno (`.env`)

```env
VITE_BACKEND_URL=http://localhost:3000
```

`socket.js` usa esta variable para conectarse al backend. Si no está definida, cae en `http://localhost:3000` por defecto.

---

## Instalación y ejecución local

### Requisitos
- Node.js v18 o superior
- Backend corriendo en `http://localhost:3000`

### Pasos

```bash
# 1. Entrar al directorio
cd Frontend

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de entorno
cp .env.example .env

# 4. Iniciar el servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5173`.

### Comandos

```bash
npm run dev       # Servidor de desarrollo con HMR
npm run build     # Build de producción (genera dist/)
npm run preview   # Preview del build de producción
npm run lint      # Linter con ESLint
```

---

## GameLogic — Canvas Drawing Screen

The drawing screen uses the **Canvas API**, a native browser API built into HTML5. No external drawing library was installed.

### Grid-based pixel art, not freehand drawing

Instead of a freehand canvas, the drawing area is divided into a fixed grid of cells:

```js
const COLS = 80   // 80 columns
const ROWS = 45   // 45 rows
const CELL = 10   // each cell = 10×10 px on screen
```

The actual canvas is **800×450px**, but the player draws cell by cell, giving it a pixel-art feel.

### The 3 Canvas API pieces used

**1. `canvas.getContext('2d')`** — gets the drawing context (the "brush"):
```js
const ctx = canvas.getContext('2d')
```

**2. `ctx.fillRect()`** — paints each cell with a color:
```js
ctx.fillStyle = color
ctx.fillRect(col * CELL, row * CELL, CELL, CELL)
```
On every mouse click or drag, the code converts the cursor position into a grid cell and fills that rectangle.

**3. `canvas.toDataURL('image/png')`** — exports the drawing as an image:
```js
const dataUrl = canvasRef.current.toDataURL('image/png')
```
When the timer runs out, the entire canvas is converted into a base64-encoded PNG string and sent to the server via socket as the player's submission.

### Flood fill (paint bucket tool)

The fill tool was implemented manually using a classic **stack-based flood fill** algorithm — it is not a Canvas API feature:

```js
const stack = [[startCol, startRow]]
while (stack.length) {
    // expands to 4 neighbors if they share the original color
}
```

### Grid state lives in memory, not the canvas

The most important design decision: the grid is stored as a flat array in a React ref, not in the canvas itself:

```js
const gridRef = useRef(Array(COLS * ROWS).fill('#ffffff'))
```

The canvas is only the **visual representation** of that array. This makes undo possible — before every stroke, a copy of the array is pushed onto `undoStack`. Undoing means popping the last snapshot and redrawing the whole canvas from it (up to 30 undo steps).

---

## Deployment — Vercel

El frontend está desplegado en **Vercel**, conectado al repositorio de GitHub.

**URL de producción:** `https://asdrubal-dun.vercel.app`

### Configuración en Vercel

| Campo | Valor |
|---|---|
| Root Directory | `FinalProject/Frontend` |
| Build Command | `npm run build` (detectado automáticamente) |
| Output Directory | `dist` (detectado automáticamente) |

### Variable de entorno en Vercel

| Variable | Valor |
|---|---|
| `VITE_BACKEND_URL` | `https://ila-production.up.railway.app` |

### Redeploy manual

Vercel redespliega automáticamente en cada push a `main`. Para forzar un redeploy manual, ve al dashboard de Vercel → proyecto → **Deployments** → **Redeploy**.

---

## Troubleshooting

**La app carga pero no conecta al backend**
- Verificar que `VITE_BACKEND_URL` apunta a la URL correcta de Railway.
- Verificar que el backend está corriendo (`/health` debe responder).

**Cambios en `.env` no se reflejan**
- Vite cachea variables de entorno. Reiniciar el servidor de desarrollo después de cambiar `.env`.

**Build falla en Vercel**
- Verificar que el Root Directory está bien configurado como `FinalProject/Frontend`.
- Verificar que `VITE_BACKEND_URL` está agregada como variable de entorno en el proyecto de Vercel.
