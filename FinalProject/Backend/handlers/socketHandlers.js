/**
 * socketHandlers.js — Manejadores de eventos de Socket.io.
 * Registra todos los eventos que el cliente puede emitir y define la respuesta del servidor.
 * Cada evento representa una accion del juego: crear sala, unirse, dibujar, votar, etc.
 * setupSocketHandlers recibe el objeto io y configura los listeners por cada conexion nueva.
 */

import { ROOM_STATES } from '../managers/roomManager.js'
import { saveGameResult } from '../models/schemas.js'

export const setupSocketHandlers = (io) => {
  // Se ejecuta cada vez que un cliente se conecta via Socket.io
  io.on('connection', (socket) => {
    console.log(`👤 Player connected: ${socket.id}`)

    // El host emite este evento para crear una nueva sala con un codigo unico
    socket.on('create-room', (data, callback) => {
      const { hostName, gameMode } = data
      const roomManager = io.roomManager

      const DURATIONS = { classic: 60000, rapid: 120000, extended: 180000 }
      const drawingDuration = DURATIONS[gameMode] ?? 60000

      const newRoom = roomManager.createRoom(hostName, drawingDuration)
      roomManager.setHostSocketId(newRoom.code, socket.id)
      // El host tambien es jugador — se agrega al array de players
      roomManager.addPlayerToRoom(newRoom.code, hostName, socket.id)

      socket.join(newRoom.code)

      const room = roomManager.getRoom(newRoom.code)
      console.log(`🏠 Room created: ${newRoom.code} by ${hostName}`)

      callback({
        success: true,
        roomCode: newRoom.code,
        roomId: newRoom.id,
        hostId: newRoom.host.id,
        players: room.players
      })

      socket.emit('room-updated', {
        state: room.state,
        players: room.players,
        host: room.host
      })
    })

    // Un jugador se une a una sala existente usando el codigo de 6 caracteres
    socket.on('join-room', (data, callback) => {
      const { roomCode, playerName } = data
      const roomManager = io.roomManager

      const result = roomManager.addPlayerToRoom(roomCode, playerName, socket.id)

      if (!result.success) {
        callback({ success: false, error: result.error })
        return
      }

      socket.join(roomCode)
      console.log(`✅ Player ${playerName} joined room ${roomCode}`)

      callback({
        success: true,
        playerId: result.player.id,
        roomCode: roomCode,
        players: result.room.players
      })

      // Notify all players in room that a new player joined
      io.to(roomCode).emit('room-updated', {
        state: result.room.state,
        players: result.room.players,
        host: result.room.host
      })
    })

    // El jugador marca si esta listo; cuando todos esten listos se emite 'all-players-ready'
    socket.on('set-ready', (data, callback) => {
      const { roomCode, readyStatus } = data
      const roomManager = io.roomManager

      roomManager.setPlayerReady(roomCode, socket.id, readyStatus)
      const room = roomManager.getRoom(roomCode)

      if (!room) return

      io.to(roomCode).emit('room-updated', {
        state: room.state,
        players: room.players,
        host: room.host
      })

      // Check if all players are ready
      if (roomManager.areAllPlayersReady(roomCode)) {
        io.to(roomCode).emit('all-players-ready')
      }

      if (callback) callback({ success: true })
    })

    // El host inicia la partida; elige aleatoriamente quien seleccionara el tema
    socket.on('start-game', (data, callback) => {
      const { roomCode } = data
      const roomManager = io.roomManager
      const room = roomManager.getRoom(roomCode)

      if (!room || room.host.socketId !== socket.id) {
        if (callback) callback({ success: false, error: 'Only host can start the game' })
        return
      }

      if (room.players.length < room.minPlayers) {
        if (callback) callback({ success: false, error: `Need at least ${room.minPlayers} players` })
        return
      }

      // Select a random player to choose the topic
      const topicSelector = roomManager.selectTopicSelector(roomCode)
      roomManager.setRoomState(roomCode, ROOM_STATES.SELECTING_TOPIC)

      console.log(`🎮 Game started in room ${roomCode}. ${topicSelector.name} will select topic.`)

      io.to(roomCode).emit('game-started', {
        topicSelector: {
          id: topicSelector.id,
          name: topicSelector.name,
          socketId: topicSelector.socketId
        },
        state: ROOM_STATES.SELECTING_TOPIC
      })

      if (callback) callback({ success: true })
    })

    // El jugador seleccionado como topic selector envia el tema que dibujaran todos
    socket.on('select-topic', (data, callback) => {
      const { roomCode, topic } = data
      const roomManager = io.roomManager
      const room = roomManager.getRoom(roomCode)

      if (!room) {
        if (callback) callback({ success: false, error: 'Room not found' })
        return
      }

      if (!room.topicSelector || room.topicSelector.socketId !== socket.id) {
        if (callback) callback({ success: false, error: 'Only topic selector can choose topic' })
        return
      }

      roomManager.setTopic(roomCode, topic)
      roomManager.setRoomState(roomCode, ROOM_STATES.DRAWING)

      console.log(`📝 Topic selected in room ${roomCode}: "${topic}"`)

      io.to(roomCode).emit('topic-selected', {
        topic: topic,
        drawingDuration: room.drawingDuration,
        state: ROOM_STATES.DRAWING
      })

      // Auto-end drawing phase when timer expires (2s grace period for submissions)
      const timerId = setTimeout(() => {
        const currentRoom = roomManager.getRoom(roomCode)
        if (!currentRoom || currentRoom.state !== ROOM_STATES.DRAWING) return

        roomManager.startVoting(roomCode)
        console.log(`⏰ Timer expired — voting started in room ${roomCode}`)

        const drawingsToVote = currentRoom.players.map((p, index) => ({
          displayOrder: index,
          socketId: p.socketId,
          playerId: p.id,
          playerName: p.name,
          drawing: p.drawing
        }))

        io.to(roomCode).emit('voting-started', {
          drawings: drawingsToVote,
          votingDuration: currentRoom.votingDuration,
          state: ROOM_STATES.VOTING
        })
      }, room.drawingDuration + 2000)

      roomManager.setDrawingTimer(roomCode, timerId)

      if (callback) callback({ success: true })
    })

    // Guarda el dibujo final del jugador (imagen en base64) y notifica al host cuantos han enviado
    socket.on('submit-drawing', (data, callback) => {
      const { roomCode, drawingData } = data
      const roomManager = io.roomManager

      roomManager.savePlayerDrawing(roomCode, socket.id, drawingData)
      const room = roomManager.getRoom(roomCode)

      console.log(`🎨 Player submitted drawing in room ${roomCode}`)

      if (callback) callback({ success: true })

      // Notify host that a drawing was submitted
      if (room && room.host.socketId) {
        io.to(room.host.socketId).emit('drawing-submitted', {
          playersSubmitted: room.players.filter(p => p.drawing !== null).length,
          totalPlayers: room.players.length
        })
      }
    })

    // El host termina la fase de dibujo y envia todos los dibujos a los jugadores para votar
    socket.on('end-drawing', (data, callback) => {
      const { roomCode } = data
      const roomManager = io.roomManager
      const room = roomManager.getRoom(roomCode)

      if (!room || room.host.socketId !== socket.id) {
        if (callback) callback({ success: false, error: 'Only host can end drawing' })
        return
      }

      roomManager.clearDrawingTimer(roomCode)
      roomManager.startVoting(roomCode)

      console.log(`🗳️ Voting started in room ${roomCode}`)

      // Send all drawings to voting clients (without revealing who drew what initially)
      const drawingsToVote = room.players.map((p, index) => ({
        displayOrder: index,
        socketId: p.socketId,
        playerId: p.id,
        playerName: p.name,
        drawing: p.drawing
      }))

      io.to(roomCode).emit('voting-started', {
        drawings: drawingsToVote,
        votingDuration: room.votingDuration,
        state: ROOM_STATES.VOTING
      })

      if (callback) callback({ success: true })
    })

    // El jugador envia su calificacion (1-5) al dibujo de otro jugador; un jugador no puede votarse a si mismo
    socket.on('submit-vote', (data, callback) => {
      const { roomCode, votedOnSocketId, rating } = data
      const roomManager = io.roomManager

      roomManager.recordVote(roomCode, socket.id, votedOnSocketId, rating)
      const room = roomManager.getRoom(roomCode)

      console.log(`⭐ Vote submitted in room ${roomCode}: rating ${rating}`)

      if (callback) callback({ success: true })

      if (!room) return

      // Check if all players have voted (optional: auto-end voting)
      const allVoted = room.players.every(p => p.votes.length > 0)
      if (allVoted) {
        io.to(roomCode).emit('all-votes-received')
      }
    })

    // El host cierra la votacion y calcula los resultados finales ordenados por puntaje
    socket.on('end-voting', (data, callback) => {
      const { roomCode } = data
      const roomManager = io.roomManager
      const room = roomManager.getRoom(roomCode)

      if (!room || room.host.socketId !== socket.id) {
        if (callback) callback({ success: false, error: 'Only host can end voting' })
        return
      }

      const results = roomManager.getVotingResults(roomCode)
      roomManager.setRoomState(roomCode, ROOM_STATES.SHOWING_RESULTS)

      console.log(`🏆 Results shown in room ${roomCode}`)

      io.to(roomCode).emit('voting-ended', {
        results: results,
        state: ROOM_STATES.SHOWING_RESULTS
      })

      // Persist round result to MongoDB
      saveGameResult({
        gameId:      `${room.id}-round${room.roundNumber}`,
        roomCode:    room.code,
        topic:       room.currentTopic,
        roundNumber: room.roundNumber + 1,
        winner:      results[0] ? { playerId: results[0].id, playerName: results[0].name, score: results[0].score } : null,
        players:     results.map(p => ({
          playerId:        p.id,
          playerName:      p.name,
          score:           p.score,
          drawingSubmitted: p.drawing !== null
        })),
        duration: room.drawingDuration / 1000
      }).catch(err => console.error('❌ Failed to save game result:', err))

      if (callback) callback({ success: true })
    })

    // El host inicia una nueva ronda; reinicia dibujos, votos y tema pero conserva jugadores
    socket.on('next-round', (data, callback) => {
      const { roomCode } = data
      const roomManager = io.roomManager
      const room = roomManager.getRoom(roomCode)

      if (!room || room.host.socketId !== socket.id) {
        if (callback) callback({ success: false, error: 'Only host can start new round' })
        return
      }

      roomManager.resetForNewRound(roomCode)

      console.log(`🔄 New round started in room ${roomCode}. Round #${room.roundNumber + 1}`)

      io.to(roomCode).emit('room-updated', {
        state: room.state,
        players: room.players,
        host: room.host,
        roundNumber: room.roundNumber
      })

      if (callback) callback({ success: true })
    })

    // El host termina el juego definitivamente y marca la sala como FINISHED
    socket.on('end-game', (data, callback) => {
      const { roomCode } = data
      const roomManager = io.roomManager
      const room = roomManager.getRoom(roomCode)

      if (!room || room.host.socketId !== socket.id) {
        if (callback) callback({ success: false, error: 'Only host can end the game' })
        return
      }

      roomManager.endGame(roomCode)

      console.log(`🛑 Game ended in room ${roomCode}`)

      io.to(roomCode).emit('game-ended', {
        state: ROOM_STATES.FINISHED
      })

      if (callback) callback({ success: true })
    })

    // El jugador abandona la sala manualmente; si quedan jugadores notifica al resto
    socket.on('leave-room', (data, callback) => {
      const { roomCode } = data
      const roomManager = io.roomManager

      if (roomCode) {
        const room = roomManager.removePlayerFromRoom(roomCode, socket.id)
        socket.leave(roomCode)

        if (room) {
          console.log(`👋 Player left room ${roomCode}. Remaining: ${room.players.length}`)

          if (room.players.length > 0) {
            io.to(roomCode).emit('room-updated', {
              state: room.state,
              players: room.players,
              host: room.host
            })
          } else {
            console.log(`🏚️ Room ${roomCode} is now empty and will be deleted`)
          }
        }
      }

      if (callback) callback({ success: true })
    })

    // Se dispara automaticamente cuando el cliente pierde conexion; limpia al jugador de su sala
    socket.on('disconnect', () => {
      console.log(`❌ Player disconnected: ${socket.id}`)

      // Clean up room data (this will be called for all rooms the player was in)
      const roomManager = io.roomManager
      const allRooms = roomManager.getAllRooms()

      allRooms.forEach(room => {
        if (room.players.find(p => p.socketId === socket.id)) {
          roomManager.removePlayerFromRoom(room.code, socket.id)
          if (room.players.length > 0) {
            io.to(room.code).emit('room-updated', {
              state: room.state,
              players: room.players,
              host: room.host
            })
          }
        }
      })
    })

    // Evento de debug: devuelve el estado actual de una sala sin modificar nada
    socket.on('get-room-status', (data, callback) => {
      const { roomCode } = data
      const roomManager = io.roomManager
      const room = roomManager.getRoom(roomCode)

      if (!room) {
        callback({ success: false, error: 'Room not found' })
        return
      }

      callback({
        success: true,
        room: {
          code: room.code,
          state: room.state,
          players: room.players.length,
          topic: room.currentTopic,
          roundNumber: room.roundNumber
        }
      })
    })
  })
}
