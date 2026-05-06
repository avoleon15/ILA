/**
 * roomManager.js — Logica central del manejo de salas de juego en memoria.
 * RoomManager administra la creacion, estado y jugadores de cada sala.
 * Las salas viven en un Map en memoria (no en base de datos) durante la partida.
 * ROOM_STATES define los estados posibles por los que pasa una sala.
 */

import { v4 as uuidv4 } from 'uuid'

// Estados posibles de una sala a lo largo del ciclo de vida del juego
export const ROOM_STATES = {
  WAITING: 'waiting',          // Waiting for players to join
  READY: 'ready',              // All players ready, waiting for host to start
  SELECTING_TOPIC: 'selecting_topic',  // One random player selects topic
  DRAWING: 'drawing',          // All players are drawing
  VOTING: 'voting',            // Voting phase
  SHOWING_RESULTS: 'showing_results',
  FINISHED: 'finished'
}

export class RoomManager {
  constructor() {
    this.rooms = new Map()
  }

  /**
   * Creates a new game room
   * @param {string} hostName - Host player name
   * @returns {Object} Room data with roomCode
   */
  createRoom(hostName, drawingDuration = 60000) {
    const roomCode = this.generateRoomCode()
    const roomId = uuidv4()

    const room = {
      id: roomId,
      code: roomCode,
      host: {
        id: uuidv4(),
        name: hostName,
        socketId: null
      },
      players: [],
      state: ROOM_STATES.WAITING,
      maxPlayers: 8,
      minPlayers: 2,
      currentTopic: null,
      topicSelector: null,
      drawingStartTime: null,
      drawingDuration,
      drawingTimer: null,
      votingDuration: 10000,
      roundNumber: 0,
      gameRound: {
        topicSetAt: null,
        drawingStarted: false,
        votingStarted: false,
        results: null
      },
      createdAt: new Date()
    }

    this.rooms.set(roomCode, room)
    return { roomCode, roomId, ...room }
  }

  /**
   * Adds a player to a room
   */
  addPlayerToRoom(roomCode, playerName, socketId) {
    const room = this.rooms.get(roomCode)
    if (!room) return { success: false, error: 'Room not found' }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'Room is full' }
    }

    if (room.state !== ROOM_STATES.WAITING) {
      return { success: false, error: 'Game already started' }
    }

    const player = {
      id: uuidv4(),
      name: playerName,
      socketId: socketId,
      readyStatus: false,
      drawing: null,
      votes: [], // Array of { votedOn: playerId, rating: 1-5 }
      score: 0,
      joinedAt: new Date()
    }

    room.players.push(player)
    return { success: true, room, player }
  }

  /**
   * Removes a player from a room
   */
  removePlayerFromRoom(roomCode, socketId) {
    const room = this.rooms.get(roomCode)
    if (!room) return

    room.players = room.players.filter(p => p.socketId !== socketId)

    // If room is empty or only host remains, delete the room
    if (room.players.length === 0 || (room.players.length === 1 && room.host.socketId === null)) {
      this.rooms.delete(roomCode)
    }

    return room
  }

  /**
   * Gets a room by code
   */
  getRoom(roomCode) {
    return this.rooms.get(roomCode)
  }

  /**
   * Gets all players in a room sorted by join time
   */
  getRoomPlayers(roomCode) {
    const room = this.rooms.get(roomCode)
    return room ? room.players : []
  }

  /**
   * Updates host socket info
   */
  setHostSocketId(roomCode, socketId) {
    const room = this.rooms.get(roomCode)
    if (room) {
      room.host.socketId = socketId
    }
  }

  /**
   * Updates player ready status
   */
  setPlayerReady(roomCode, socketId, readyStatus) {
    const room = this.rooms.get(roomCode)
    if (!room) return

    const player = room.players.find(p => p.socketId === socketId)
    if (player) {
      player.readyStatus = readyStatus
    }

    return room
  }

  /**
   * Check if all players are ready
   */
  areAllPlayersReady(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room) return false

    return room.players.length >= room.minPlayers && 
           room.players.every(p => p.readyStatus === true)
  }

  /**
   * Transitions room to a new state
   */
  setRoomState(roomCode, newState) {
    const room = this.rooms.get(roomCode)
    if (room) {
      room.state = newState
    }
    return room
  }

  /**
   * Selects a random player to choose the topic
   */
  selectTopicSelector(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room || room.players.length === 0) return null

    const randomIndex = Math.floor(Math.random() * room.players.length)
    room.topicSelector = room.players[randomIndex]
    return room.topicSelector
  }

  /**
   * Sets the topic for the current round
   */
  setTopic(roomCode, topic) {
    const room = this.rooms.get(roomCode)
    if (room) {
      room.currentTopic = topic
      room.gameRound.topicSetAt = new Date()
    }
    return room
  }

  /**
   * Marks drawing phase as started
   */
  startDrawing(roomCode) {
    const room = this.rooms.get(roomCode)
    if (room) {
      room.gameRound.drawingStarted = true
      room.drawingStartTime = new Date()
      room.state = ROOM_STATES.DRAWING
    }
    return room
  }

  /**
   * Saves a player's drawing
   */
  savePlayerDrawing(roomCode, socketId, drawingData) {
    const room = this.rooms.get(roomCode)
    if (!room) return

    const player = room.players.find(p => p.socketId === socketId)
    if (player) {
      player.drawing = drawingData
    }
  }

  /**
   * Moves to voting phase
   */
  startVoting(roomCode) {
    const room = this.rooms.get(roomCode)
    if (room) {
      room.state = ROOM_STATES.VOTING
      room.gameRound.votingStarted = true
      // Reset votes for new round
      room.players.forEach(p => p.votes = [])
    }
    return room
  }

  /**
   * Records a vote from a player
   */
  recordVote(roomCode, voterSocketId, votedOnSocketId, rating) {
    const room = this.rooms.get(roomCode)
    if (!room) return

    const voter = room.players.find(p => p.socketId === voterSocketId)
    const votedOn = room.players.find(p => p.socketId === votedOnSocketId)

    if (voter && votedOn) {
      // A player can't vote for themselves
      if (voter.id !== votedOn.id) {
        voter.votes.push({ votedOn: votedOn.id, rating })
        // Update the voted-on player's score
        votedOn.score += rating
      }
    }
  }

  /**
   * Gets voting results
   */
  getVotingResults(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room) return null

    return room.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      drawing: p.drawing
    })).sort((a, b) => b.score - a.score)
  }

  /**
   * Resets the room for a new round (keeps players, resets state)
   */
  resetForNewRound(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room) return

    room.state = ROOM_STATES.WAITING
    room.currentTopic = null
    room.topicSelector = null
    room.roundNumber += 1
    room.gameRound = {
      topicSetAt: null,
      drawingStarted: false,
      votingStarted: false,
      results: null
    }

    // Reset individual round state
    room.players.forEach(p => {
      p.readyStatus = false
      p.drawing = null
      p.votes = []
    })

    return room
  }

  /**
   * Ends the game and cleans up room
   */
  endGame(roomCode) {
    const room = this.rooms.get(roomCode)
    if (room) {
      room.state = ROOM_STATES.FINISHED
    }
    return room
  }

  setDrawingTimer(roomCode, timerId) {
    const room = this.rooms.get(roomCode)
    if (room) room.drawingTimer = timerId
  }

  clearDrawingTimer(roomCode) {
    const room = this.rooms.get(roomCode)
    if (room && room.drawingTimer) {
      clearTimeout(room.drawingTimer)
      room.drawingTimer = null
    }
  }

  /**
   * Generates a unique 6-character room code
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    do {
      code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
    } while (this.rooms.has(code))

    return code
  }

  /**
   * Get all active rooms (for debugging/monitoring)
   */
  getAllRooms() {
    return Array.from(this.rooms.values())
  }
}
