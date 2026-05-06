# ASDRUBAL — Backend

Backend del juego multijugador de dibujo **ASDRUBAL**, construido con **Node.js**, **Express**, **Socket.io** y **MongoDB**. Gestiona salas en tiempo real, el flujo completo de una partida, la lógica de votación y la persistencia de resultados.

---

## Stack tecnológico

| Paquete | Versión | Propósito |
|---|---|---|
| `express` | ^4.18.2 | Servidor HTTP y rutas REST |
| `socket.io` | ^4.7.2 | Comunicación en tiempo real (WebSockets) |
| `mongoose` | ^8.0.3 | ODM para MongoDB |
| `cors` | ^2.8.5 | Configuración de CORS |
| `dotenv` | ^16.3.1 | Variables de entorno desde `.env` |
| `uuid` | ^9.0.1 | Generación de IDs únicos |
| `nodemon` | ^3.0.2 | Auto-reinicio en desarrollo |

---

## Estructura del proyecto

```
Backend/
├── server.js                 # Punto de entrada — Express + Socket.io + arranque
├── config/
│   └── database.js           # Conexión a MongoDB
├── managers/
│   └── roomManager.js        # Lógica en memoria de salas y estado del juego
├── handlers/
│   └── socketHandlers.js     # Todos los eventos de Socket.io
├── models/
│   └── schemas.js            # Esquemas Mongoose y helper de persistencia
├── .env                      # Variables de entorno (no subir a git)
├── .env.example              # Plantilla de variables de entorno
├── package.json
└── .gitignore
```

---

## Instalación y ejecución

### Requisitos previos
- Node.js v14 o superior
- MongoDB (local o MongoDB Atlas)
- npm

### Pasos

```bash
# 1. Entrar al directorio
cd Backend

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de entorno
cp .env.example .env
```

### Variables de entorno (`.env`)

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/asdrubal
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Comandos

```bash
# Modo desarrollo (auto-reload con nodemon)
npm run dev

# Modo producción
npm start
```

El servidor arranca en `http://localhost:3000`.

---

## server.js — Punto de entrada

Configura y conecta todas las piezas del sistema:

1. Crea la aplicación **Express** y el servidor HTTP con `createServer(app)`.
2. Inicializa **Socket.io** sobre ese servidor HTTP, con CORS configurado desde `.env`.
3. Instancia un único `RoomManager` y lo adjunta al objeto `io` como `io.roomManager`, haciéndolo accesible a todos los handlers sin necesidad de imports adicionales.
4. Registra la ruta REST de salud (`GET /health`).
5. Llama a `connectDatabase()` para conectar MongoDB (si falla, el servidor sigue funcionando solo con memoria).
6. Llama a `setupSocketHandlers(io)` para registrar todos los eventos de Socket.io.
7. Escucha en el puerto definido en `.env` (default: `3000`).

### Endpoint REST

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Devuelve `{ status, timestamp }`. Útil para verificar que el servidor está vivo. |

---

## roomManager.js — Gestión de salas en memoria

`RoomManager` es la clase central del juego. Mantiene un `Map` de salas activas en memoria (no en base de datos) durante el ciclo de vida de la partida. Cada sala tiene su propio estado, jugadores, tema y temporizador de dibujo.

### Estados de una sala (`ROOM_STATES`)

```
waiting          → Esperando jugadores, sala recién creada
ready            → (reservado) Todos los jugadores listos
selecting_topic  → Un jugador aleatorio está eligiendo el tema
drawing          → Todos los jugadores están dibujando
voting           → Fase de votación activa
showing_results  → Resultados siendo mostrados
finished         → Partida terminada definitivamente
```

### Estructura de una sala

```js
{
  id: String,              // UUID único de la sala
  code: String,            // Código de 6 caracteres (ej: "ABC123")
  host: {
    id: String,            // UUID del host
    name: String,          // Nombre del host
    socketId: String       // Socket.id actual del host
  },
  players: [Player],       // Array de jugadores (incluye al host)
  state: ROOM_STATE,       // Estado actual de la sala
  maxPlayers: 8,           // Máximo de jugadores permitidos
  minPlayers: 2,           // Mínimo para iniciar la partida
  currentTopic: String,    // Tema de dibujo elegido (null hasta selección)
  topicSelector: Player,   // Jugador elegido para seleccionar el tema
  drawingStartTime: Date,  // Timestamp de inicio de la fase de dibujo
  drawingDuration: Number, // Duración del dibujo en ms (60000 / 120000 / 180000)
  drawingTimer: TimeoutId, // Referencia al setTimeout del temporizador automático
  votingDuration: Number,  // Duración de la votación en ms (10000 por defecto)
  roundNumber: Number,     // Número de ronda actual (empieza en 0)
  gameRound: {
    topicSetAt: Date,
    drawingStarted: Boolean,
    votingStarted: Boolean,
    results: null
  },
  createdAt: Date
}
```

### Estructura de un jugador

```js
{
  id: String,              // UUID único del jugador
  name: String,            // Nombre del jugador
  socketId: String,        // Socket.id actual (cambia si se reconecta)
  readyStatus: Boolean,    // true si marcó listo en el lobby
  drawing: String | null,  // Imagen en base64 del dibujo enviado (null si no envió)
  votes: [                 // Votos que el jugador emitió
    { votedOn: String, rating: Number }  // votedOn = playerId del dibujante
  ],
  score: Number,           // Puntuación acumulada de votos recibidos
  joinedAt: Date
}
```

### Métodos de RoomManager

| Método | Descripción |
|---|---|
| `createRoom(hostName, drawingDuration)` | Crea una sala con código aleatorio de 6 caracteres. `drawingDuration` se asigna según el modo de juego elegido al crear la sala. |
| `addPlayerToRoom(roomCode, playerName, socketId)` | Agrega un jugador a la sala. Falla si la sala está llena, no existe, o la partida ya empezó. |
| `removePlayerFromRoom(roomCode, socketId)` | Elimina al jugador. Si la sala queda vacía, la borra del Map. |
| `setHostSocketId(roomCode, socketId)` | Guarda el socketId del host (se llama al crear sala). |
| `setPlayerReady(roomCode, socketId, readyStatus)` | Actualiza el `readyStatus` de un jugador. |
| `areAllPlayersReady(roomCode)` | Devuelve `true` si hay al menos `minPlayers` y todos tienen `readyStatus: true`. |
| `setRoomState(roomCode, newState)` | Transiciona la sala a un nuevo estado. |
| `selectTopicSelector(roomCode)` | Elige un jugador al azar para seleccionar el tema y lo guarda en `room.topicSelector`. |
| `setTopic(roomCode, topic)` | Guarda el tema elegido y registra `topicSetAt`. |
| `startDrawing(roomCode)` | Marca el inicio de la fase de dibujo con timestamp. |
| `savePlayerDrawing(roomCode, socketId, drawingData)` | Guarda el dibujo (base64 PNG) del jugador en `player.drawing`. |
| `startVoting(roomCode)` | Cambia estado a `VOTING` y resetea los `votes` de todos los jugadores. |
| `recordVote(roomCode, voterSocketId, votedOnSocketId, rating)` | Registra un voto (1-5) y suma el `rating` al `score` del dibujante. Un jugador no puede votarse a sí mismo. |
| `getVotingResults(roomCode)` | Devuelve el array de jugadores con sus scores, ordenado de mayor a menor. |
| `resetForNewRound(roomCode)` | Resetea tema, topicSelector, dibujos, votos y readyStatus. Incrementa `roundNumber`. El estado vuelve a `WAITING`. |
| `endGame(roomCode)` | Marca la sala como `FINISHED`. |
| `setDrawingTimer(roomCode, timerId)` | Guarda la referencia del `setTimeout` del temporizador. |
| `clearDrawingTimer(roomCode)` | Cancela el `setTimeout` activo (evita doble disparo si el host termina manualmente). |
| `getRoom(roomCode)` | Devuelve la sala por código. |
| `getRoomPlayers(roomCode)` | Devuelve el array de jugadores de una sala. |
| `getAllRooms()` | Devuelve todas las salas activas (usado en `disconnect` para limpiar). |
| `generateRoomCode()` | Genera un código alfanumérico de 6 caracteres único (no repite códigos activos). |

---

## socketHandlers.js — Eventos de Socket.io

Todos los eventos se registran dentro de `io.on('connection', ...)`, por lo que cada cliente conectado obtiene sus propios listeners. El acceso al `RoomManager` se hace via `io.roomManager`.

### Convención de callbacks

Los eventos que aceptan un callback responden con `{ success: true }` o `{ success: false, error: '...' }`.

---

### Eventos emitidos por el cliente → recibidos por el servidor

#### `create-room`
El host crea una nueva sala.

```js
// Emit
socket.emit('create-room', {
  hostName: 'Player1',
  gameMode: 'classic' // 'classic' | 'rapid' | 'extended'
}, (response) => {
  // { success: true, roomCode: 'ABC123', roomId: '...', hostId: '...' }
})
```

**Lógica:**
- Mapea `gameMode` a duración: `classic → 60000ms`, `rapid → 120000ms`, `extended → 180000ms`.
- Crea la sala con `createRoom(hostName, drawingDuration)`.
- Agrega al host como jugador.
- El socket se une al room de Socket.io con el código como nombre.
- Responde con callback + emite `room-updated` al propio host.

---

#### `join-room`
Un jugador se une a una sala existente.

```js
socket.emit('join-room', {
  roomCode: 'ABC123',
  playerName: 'Player2'
}, (response) => {
  // { success: true, playerId: '...', roomCode: 'ABC123' }
  // Error: { success: false, error: 'Room is full' | 'Game already started' | 'Room not found' }
})
```

**Lógica:** Agrega el jugador a la sala y emite `room-updated` a **todos** los jugadores de la sala (incluido el que acaba de entrar).

---

#### `set-ready`
Un jugador marca su estado de listo en el lobby.

```js
socket.emit('set-ready', { roomCode: 'ABC123', readyStatus: true })
```

**Lógica:** Actualiza `readyStatus` del jugador. Emite `room-updated` a todos. Si **todos** los jugadores están listos, emite adicionalmente `all-players-ready` a toda la sala.

---

#### `start-game`
El host inicia la partida. Solo funciona si el emisor es el host.

```js
socket.emit('start-game', { roomCode: 'ABC123' }, (response) => {
  // { success: true }
  // Error si no es host o hay menos de minPlayers
})
```

**Lógica:** Selecciona un jugador aleatorio como `topicSelector`, cambia estado a `SELECTING_TOPIC`, emite `game-started` a toda la sala.

---

#### `select-topic`
El jugador designado como topic selector envía el tema de la ronda. Solo funciona si el emisor es el `topicSelector` actual.

```js
socket.emit('select-topic', { roomCode: 'ABC123', topic: 'Un dragón comiendo pizza' })
```

**Lógica:**
- Guarda el tema y cambia estado a `DRAWING`.
- Emite `topic-selected` a todos con el tema y la duración del dibujo.
- **Inicia un `setTimeout` en el servidor** con `drawingDuration + 2000ms` de gracia. Cuando expira, llama automáticamente a la lógica de `end-drawing`: transiciona a `VOTING` y emite `voting-started` con todos los dibujos recopilados hasta ese momento.
- Guarda la referencia del timer en `room.drawingTimer`.

---

#### `submit-drawing`
Un jugador envía su dibujo al terminar de pintar (o cuando el temporizador del frontend llega a 0).

```js
socket.emit('submit-drawing', {
  roomCode: 'ABC123',
  drawingData: 'data:image/png;base64,...'  // PNG capturado con canvas.toDataURL()
}, (response) => {
  // { success: true }
})
```

**Lógica:** Guarda el base64 en `player.drawing`. Notifica **solo al host** con `drawing-submitted` indicando cuántos jugadores han enviado de cuántos en total.

---

#### `end-drawing`
El host termina manualmente la fase de dibujo antes de que expire el temporizador.

```js
socket.emit('end-drawing', { roomCode: 'ABC123' })
```

**Lógica:** Cancela el `setTimeout` automático con `clearDrawingTimer()` para evitar doble disparo, transiciona a `VOTING` y emite `voting-started` con todos los dibujos recibidos hasta ese momento.

---

#### `submit-vote`
Un jugador vota el dibujo de otro jugador. No se puede votar el propio dibujo.

```js
socket.emit('submit-vote', {
  roomCode: 'ABC123',
  votedOnSocketId: 'socket-id-del-artista',
  rating: 4  // Entero del 1 al 5
}, (response) => {
  // { success: true }
})
```

**Lógica:** Registra el voto y suma el `rating` al `score` del dibujante. Si **todos** los jugadores han emitido al menos un voto, emite `all-votes-received` a toda la sala.

---

#### `end-voting`
El host cierra la fase de votación y solicita los resultados finales.

```js
socket.emit('end-voting', { roomCode: 'ABC123' })
```

**Lógica:** Calcula resultados con `getVotingResults()` (ordenados por score descendente), cambia estado a `SHOWING_RESULTS`, emite `voting-ended` con el ranking.

---

#### `next-round`
El host inicia una nueva ronda con los mismos jugadores.

```js
socket.emit('next-round', { roomCode: 'ABC123' })
```

**Lógica:** Llama a `resetForNewRound()` — borra dibujos, votos, tema y topicSelector. Incrementa `roundNumber`. Emite `room-updated` a todos con el nuevo estado.

---

#### `end-game`
El host termina la partida definitivamente.

```js
socket.emit('end-game', { roomCode: 'ABC123' })
```

**Lógica:** Marca la sala como `FINISHED`. Emite `game-ended` a todos.

---

#### `leave-room`
Un jugador abandona la sala manualmente.

```js
socket.emit('leave-room', { roomCode: 'ABC123' })
```

**Lógica:** Elimina al jugador de la sala y la abandona en Socket.io. Si quedan jugadores, emite `room-updated` al resto. Si la sala queda vacía, se borra del Map.

---

#### `get-room-status` *(debug)*
Devuelve el estado actual de una sala sin modificar nada.

```js
socket.emit('get-room-status', { roomCode: 'ABC123' }, (response) => {
  // { success: true, room: { code, state, players (count), topic, roundNumber } }
})
```

---

#### `disconnect` *(automático)*
Se dispara automáticamente cuando el cliente pierde la conexión. Recorre todas las salas activas, elimina al jugador desconectado y notifica al resto si quedan jugadores.

---

### Eventos emitidos por el servidor → recibidos por el cliente

| Evento | Destinatario | Payload |
|---|---|---|
| `room-updated` | Todos en la sala | `{ state, players[], host }` — estado actualizado de la sala |
| `game-started` | Todos en la sala | `{ topicSelector: { id, name, socketId }, state }` |
| `all-players-ready` | Todos en la sala | *(sin payload)* — todos tienen `readyStatus: true` |
| `topic-selected` | Todos en la sala | `{ topic, drawingDuration, state }` |
| `drawing-submitted` | Solo el host | `{ playersSubmitted, totalPlayers }` — cuántos han enviado |
| `voting-started` | Todos en la sala | `{ drawings[], votingDuration, state }` — array con todos los dibujos |
| `all-votes-received` | Todos en la sala | *(sin payload)* — todos los jugadores emitieron al menos un voto |
| `voting-ended` | Todos en la sala | `{ results[], state }` — ranking ordenado por score |
| `game-ended` | Todos en la sala | `{ state: 'finished' }` |

#### Estructura del array `drawings` en `voting-started`

```js
{
  displayOrder: Number,  // Índice de orden de aparición
  socketId: String,      // Socket.id del artista
  playerId: String,      // UUID del artista
  playerName: String,    // Nombre del artista
  drawing: String        // base64 PNG (o null si no envió)
}
```

#### Estructura del array `results` en `voting-ended`

```js
{
  id: String,       // UUID del jugador
  name: String,     // Nombre del jugador
  score: Number,    // Puntuación total recibida (suma de todos los ratings)
  drawing: String   // base64 PNG del dibujo
}
// Ordenado de mayor a menor score
```

---

## Modos de juego

El modo se selecciona al crear la sala y determina cuánto tiempo tienen los jugadores para dibujar.

| Modo | `gameMode` | Duración |
|---|---|---|
| Clásico | `'classic'` | 60 segundos |
| Rápido | `'rapid'` | 120 segundos |
| Extendido | `'extended'` | 180 segundos |

El temporizador es **autoritativo en el servidor**: cuando expira, la fase de dibujo termina automáticamente sin depender del cliente. El frontend tiene 2 segundos adicionales de margen para enviar el dibujo antes de que el servidor recopile los resultados.

---

## Modelos de base de datos (MongoDB)

### `GameResult`
Persiste el resultado final de una partida completada.

```js
{
  gameId: String,       // ID único de la partida (generado si no se provee)
  roomCode: String,     // Código de la sala
  topic: String,        // Tema de la ronda
  roundNumber: Number,  // Número de ronda
  winner: {
    playerId: String,
    playerName: String,
    score: Number
  },
  players: [{
    playerId: String,
    playerName: String,
    score: Number,
    drawingSubmitted: Boolean,
    votesReceived: Number
  }],
  createdAt: Date,
  duration: Number       // Duración de la partida en segundos
}
```

### `GameSession`
Sesión de juego en curso o reciente. **Se auto-elimina después de 24 horas** mediante un índice TTL de MongoDB.

```js
{
  roomCode: String,
  hostId: String,
  hostName: String,
  state: String,         // Mismo enum que ROOM_STATES
  players: [{
    playerId: String,
    playerName: String,
    socketId: String,
    joinedAt: Date
  }],
  currentRound: Number,
  currentTopic: String,
  topicSelectedBy: String,
  startedAt: Date,
  endedAt: Date,
  createdAt: Date        // TTL index: expireAfterSeconds: 86400
}
```

### Helper `saveGameResult(gameData)`
Función exportada de `schemas.js` que recibe los datos del juego y los persiste en la colección `GameResult`. Lanza error si la inserción falla.

---

## Flujo completo de una partida

```
1. Host crea sala         → create-room(hostName, gameMode)
                          ← room-updated

2. Jugadores se unen      → join-room(roomCode, playerName)
                          ← room-updated (a todos)

3. Jugadores se alistan   → set-ready(roomCode, true)
                          ← room-updated
                          ← all-players-ready (cuando todos están listos)

4. Host inicia partida    → start-game(roomCode)
                          ← game-started (con topicSelector)

5. Selector elige tema    → select-topic(roomCode, topic)
                          ← topic-selected (con tema y drawingDuration)
                          [Temporizador del servidor inicia]

6. Jugadores dibujan
   Al terminar tiempo     → submit-drawing(roomCode, drawingData)
                          ← drawing-submitted (solo al host)

7. Tiempo agotado         [Servidor dispara automáticamente]
   O host termina antes   → end-drawing(roomCode)
                          ← voting-started (con todos los dibujos)

8. Jugadores votan        → submit-vote(roomCode, votedOnSocketId, rating)
                          ← all-votes-received (cuando todos votaron)

9. Host cierra votación   → end-voting(roomCode)
                          ← voting-ended (con resultados ordenados)

10a. Nueva ronda          → next-round(roomCode)
                          ← room-updated (vuelve a paso 3)

10b. Fin del juego        → end-game(roomCode)
                          ← game-ended
```

---

## Consideraciones técnicas

- **Estado en memoria**: Las salas viven en un `Map` de Node.js. Si el servidor se reinicia, se pierden las partidas activas. Para escalar horizontalmente se podría migrar a Redis.
- **Sin sincronización de lienzo**: Cada jugador dibuja en su propio canvas local. Solo el dibujo final (base64 PNG) se transmite al servidor, no los trazos intermedios.
- **Temporizador autoritativo**: El servidor controla el fin de la fase de dibujo, evitando que clientes manipulen el tiempo. El frontend muestra una cuenta regresiva local sincronizada con `drawingDuration`.
- **Capacidad por sala**: 2 a 8 jugadores (configurable en `roomManager.js`).
- **Limpieza automática**: Al desconectarse un jugador, se limpia de todas las salas activas.

---

## Troubleshooting

**No conecta a MongoDB**
```bash
brew services start mongodb-community  # macOS
# Verificar MONGODB_URI en .env
```

**Error de CORS**
- Asegurarse de que `CORS_ORIGIN` en `.env` coincide exactamente con la URL del frontend (incluyendo puerto).

**"Room not found"**
- El código de sala es case-sensitive y tiene 6 caracteres alfanuméricos.
- La sala se elimina cuando todos los jugadores se desconectan.

**El temporizador no dispara `voting-started`**
- Verificar que `select-topic` fue emitido correctamente (solo el `topicSelector` puede hacerlo).
- Revisar consola del servidor por el log `⏰ Timer expired`.

---

## Comandos de MongoDB

### Gestionar el servicio

```bash
brew services start mongodb-community    # iniciar
brew services stop mongodb-community     # detener
brew services restart mongodb-community  # reiniciar
```

### Abrir la shell de MongoDB

```bash
mongosh
```

### Navegar dentro de mongosh

```js
show dbs                    // ver todas las bases de datos
use asdrubal                // cambiar a la base del juego
show collections            // ver colecciones en la base actual
```

### Consultar resultados

```js
db.gameresults.find().pretty()           // ver todos los resultados
db.gameresults.find().sort({ _id: -1 }) // más recientes primero
db.gameresults.countDocuments()         // cuántos resultados hay guardados
db.gameresults.findOne()                // ver solo el primero
```

### Limpiar datos

```js
db.gameresults.deleteMany({})  // borrar todos los resultados
db.dropDatabase()              // borrar toda la base de datos
```

### Salir de mongosh

```js
exit
```

### Flujo de verificación rápida

```bash
brew services start mongodb-community   # 1. iniciar servicio
mongosh                                 # 2. abrir shell
```

```js
use asdrubal                            // 3. seleccionar base de datos
db.gameresults.find().pretty()          // 4. ver resultados guardados
```

---

## License

ISC
