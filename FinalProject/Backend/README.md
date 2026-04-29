# ASDRUBAL Backend

Backend server for the multiplayer drawing game ASDRUBAL built with Node.js, Express, Socket.io, and MongoDB.

## Features

- Real-time multiplayer game rooms (2-8 players)
- Unique room codes for easy player joining
- Random topic selection by a player
- Real-time drawing synchronization via WebSockets
- 5-point voting system (very bad to very good)
- Game results persistence with MongoDB
- Player statistics and leaderboard

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud like MongoDB Atlas)
- npm

## Installation

1. Navigate to the backend directory:
```bash
cd Backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/asdrubal
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - Returns server status

## Socket.io Events

### Connection Events

#### Host creates a room
```javascript
socket.emit('create-room', { hostName: 'Player1' }, (response) => {
  // response: { success: true, roomCode: 'ABC123', roomId: '...', hostId: '...' }
})
```

#### Player joins a room
```javascript
socket.emit('join-room', { roomCode: 'ABC123', playerName: 'Player2' }, (response) => {
  // response: { success: true, playerId, roomCode }
})
```

### Game Flow Events

#### Player set ready status
```javascript
socket.emit('set-ready', { roomCode: 'ABC123', readyStatus: true })
```

#### Host starts the game
```javascript
socket.emit('start-game', { roomCode: 'ABC123' })
// Emits: 'game-started' - Notifies topic selector
```

#### Topic selector chooses topic
```javascript
socket.emit('select-topic', { roomCode: 'ABC123', topic: 'Ocean' })
// Emits: 'topic-selected' - Starts 1-minute drawing timer
```

#### Drawing actions (real-time sync)
```javascript
socket.emit('draw-action', {
  roomCode: 'ABC123',
  action: {
    tool: 'draw',
    x: 100,
    y: 200,
    color: '#000000',
    size: 6,
    timestamp: Date.now()
  }
})
// Broadcasts to other players: 'player-draw-action'
```

#### Undo action
```javascript
socket.emit('undo-action', { roomCode: 'ABC123' })
// Broadcasts to other players: 'player-undo-action'
```

#### Submit drawing (after 1 minute)
```javascript
socket.emit('submit-drawing', {
  roomCode: 'ABC123',
  drawingData: 'data:image/png;base64,...'
})
```

#### Host ends drawing phase
```javascript
socket.emit('end-drawing', { roomCode: 'ABC123' })
// Emits: 'voting-started' - Shows all drawings for 10 seconds
```

#### Player votes
```javascript
socket.emit('submit-vote', {
  roomCode: 'ABC123',
  votedOnSocketId: 'socket-id-of-artist',
  rating: 5 // 1-5 (very bad to very good)
})
```

#### Host ends voting
```javascript
socket.emit('end-voting', { roomCode: 'ABC123' })
// Emits: 'voting-ended' - Shows results
```

#### Start new round
```javascript
socket.emit('next-round', { roomCode: 'ABC123' })
```

#### End game
```javascript
socket.emit('end-game', { roomCode: 'ABC123' })
// Emits: 'game-ended'
```

#### Leave room
```javascript
socket.emit('leave-room', { roomCode: 'ABC123' })
```

## Room States

- `waiting` - Waiting for players to join
- `selecting_topic` - Topic selector choosing topic
- `drawing` - Drawing phase (1 minute)
- `voting` - Voting phase
- `showing_results` - Results displayed
- `finished` - Game finished

## Database Models

### PlayerStats
Tracks individual player statistics across all games
- `playerId` - Unique player identifier
- `playerName` - Display name
- `gamesPlayed` - Total games participated
- `gamesWon` - Games won
- `totalScore` - Cumulative score
- `averageScore` - Average score per game
- `bestScore` - Highest single-game score

### GameResult
Records completed game outcomes
- `roomCode` - Game room code
- `topic` - Drawing topic
- `winner` - Winner information
- `players` - Final standings
- `createdAt` - Game completion time

### GameSession
In-progress or recent game sessions (auto-deleted after 24 hours)

## Architecture

```
Backend/
├── server.js                 # Main entry point
├── config/
│   └── database.js          # MongoDB connection
├── managers/
│   └── roomManager.js       # Game room state management
├── handlers/
│   └── socketHandlers.js    # Socket.io event handlers
├── models/
│   └── schemas.js           # MongoDB schemas and helpers
├── package.json
├── .env
└── .gitignore
```

## Game Flow

1. **Host creates room** → Get room code
2. **Players join** → Enter room code
3. **Host starts game** → Random topic selector chosen
4. **Topic selector chooses topic** → 1-minute drawing timer starts
5. **All players draw** → Real-time sync via Socket.io
6. **Drawing time ends** → Enter voting phase
7. **Vote on paintings** → 5-point scale per artwork
8. **Show results** → Display rankings
9. **Repeat or end game**

## Performance Considerations

- Room data stored in-memory (can be moved to Redis for scaling)
- Drawing events broadcasted in real-time (consider throttling for large rooms)
- Supports up to 8 players per room (configurable)
- Game sessions auto-delete after 24 hours
- Results persisted to MongoDB for history/stats

## Troubleshooting

### Cannot connect to MongoDB
- Ensure MongoDB is running: `brew services start mongodb-community` (macOS)
- Check MONGODB_URI in .env
- Verify MongoDB is accessible at the specified URI

### Socket.io connection errors
- Check CORS_ORIGIN in .env matches frontend URL
- Ensure port 3000 is not in use
- Check firewall settings

### Room not found errors
- Verify room code is correct (6-character alphanumeric)
- Check that room hasn't expired (cleanup happens on disconnect)

## Future Enhancements

- [ ] WebRTC for voice chat
- [ ] Persistent leaderboards with rankings
- [ ] Custom drawing themes/backgrounds
- [ ] Replay feature for past games
- [ ] Anti-cheat validation of drawing events
- [ ] Mobile app support
- [ ] Spectator mode
- [ ] Clan/team support
- [ ] Achievement system

## License

ISC
