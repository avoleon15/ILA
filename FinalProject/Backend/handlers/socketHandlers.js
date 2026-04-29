import { ROOM_STATES } from '../managers/roomManager.js'

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`👤 Player connected: ${socket.id}`)

    /**
     * HOST: Create a new game room
     */
    socket.on('create-room', (data, callback) => {
      const { hostName } = data
      const roomManager = io.roomManager

      const newRoom = roomManager.createRoom(hostName)
      roomManager.setHostSocketId(newRoom.code, socket.id)

      socket.join(newRoom.code)

      console.log(`🏠 Room created: ${newRoom.code} by ${hostName}`)

      callback({
        success: true,
        roomCode: newRoom.code,
        roomId: newRoom.id,
        hostId: newRoom.host.id
      })

      socket.emit('room-updated', {
        state: newRoom.state,
        players: newRoom.players,
        host: newRoom.host
      })
    })

    /**
     * PLAYER: Join an existing game room by code
     */
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
        roomCode: roomCode
      })

      // Notify all players in room that a new player joined
      io.to(roomCode).emit('room-updated', {
        state: result.room.state,
        players: result.room.players,
        host: result.room.host
      })
    })

    /**
     * PLAYER: Set ready status
     */
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

    /**
     * HOST: Start the game
     */
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
          name: topicSelector.name
        },
        state: ROOM_STATES.SELECTING_TOPIC
      })

      if (callback) callback({ success: true })
    })

    /**
     * TOPIC SELECTOR: Choose the topic
     */
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

      if (callback) callback({ success: true })
    })

    /**
     * ALL PLAYERS: Send drawing actions (real-time sync)
     */
    socket.on('draw-action', (data) => {
      const { roomCode, action } = data

      // Broadcast to all other players in the room
      socket.to(roomCode).emit('player-draw-action', {
        playerId: null, // Will be identified by socketId
        socketId: socket.id,
        action: action // { tool, x, y, color, size, timestamp }
      })
    })

    /**
     * ALL PLAYERS: Send undo action
     */
    socket.on('undo-action', (data) => {
      const { roomCode } = data

      socket.to(roomCode).emit('player-undo-action', {
        socketId: socket.id
      })
    })

    /**
     * ALL PLAYERS: Save their final drawing (base64 image data)
     */
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

    /**
     * HOST: End drawing phase and move to voting
     */
    socket.on('end-drawing', (data, callback) => {
      const { roomCode } = data
      const roomManager = io.roomManager
      const room = roomManager.getRoom(roomCode)

      if (!room || room.host.socketId !== socket.id) {
        if (callback) callback({ success: false, error: 'Only host can end drawing' })
        return
      }

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

    /**
     * PLAYER: Submit a vote
     */
    socket.on('submit-vote', (data, callback) => {
      const { roomCode, votedOnSocketId, rating } = data
      const roomManager = io.roomManager

      roomManager.recordVote(roomCode, socket.id, votedOnSocketId, rating)
      const room = roomManager.getRoom(roomCode)

      console.log(`⭐ Vote submitted in room ${roomCode}: rating ${rating}`)

      if (callback) callback({ success: true })

      // Check if all players have voted (optional: auto-end voting)
      const allVoted = room.players.every(p => p.votes.length > 0)
      if (allVoted) {
        io.to(roomCode).emit('all-votes-received')
      }
    })

    /**
     * HOST: End voting and show results
     */
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

      if (callback) callback({ success: true })
    })

    /**
     * HOST: Start a new round
     */
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

    /**
     * HOST: End the game
     */
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

    /**
     * PLAYER: Disconnect or leave room
     */
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

    /**
     * Disconnect handler
     */
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

    /**
     * DEBUG: Get room status
     */
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
