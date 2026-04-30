/**
 * schemas.js — Modelos de Mongoose para persistir datos en MongoDB.
 * Define dos colecciones: GameResult (resultados de partidas) y GameSession (sesiones en curso).
 * Exporta los modelos y la funcion saveGameResult para guardar resultados.
 */

import mongoose from 'mongoose'

// Esquema para guardar el resultado final de una partida (ganador, puntajes, dibujos)
const gameResultSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  roomCode: { type: String, required: true },
  topic: { type: String, required: true },
  roundNumber: { type: Number, default: 1 },
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
  createdAt: { type: Date, default: Date.now },
  duration: { type: Number } // in seconds
})

// Game session schema (ongoing or completed game)
const gameSessionSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  hostId: String,
  hostName: String,
  state: {
    type: String,
    enum: ['waiting', 'selecting_topic', 'drawing', 'voting', 'showing_results', 'finished'],
    default: 'waiting'
  },
  players: [{
    playerId: String,
    playerName: String,
    socketId: String,
    joinedAt: { type: Date, default: Date.now }
  }],
  currentRound: { type: Number, default: 1 },
  currentTopic: String,
  topicSelectedBy: String,
  startedAt: Date,
  endedAt: Date,
  createdAt: { type: Date, default: Date.now, index: { expireAfterSeconds: 86400 } } // Auto-delete after 24 hours
})

// Create models
export const GameResult = mongoose.model('GameResult', gameResultSchema)
export const GameSession = mongoose.model('GameSession', gameSessionSchema)

/**
 * Save game results to database
 */
export const saveGameResult = async (gameData) => {
  try {
    const result = await GameResult.create({
      gameId: gameData.gameId || `game-${Date.now()}`,
      roomCode: gameData.roomCode,
      topic: gameData.topic,
      roundNumber: gameData.roundNumber,
      winner: gameData.winner,
      players: gameData.players,
      duration: gameData.duration
    })

    console.log(`✅ Game result saved: ${gameData.roomCode}`)
    return result
  } catch (error) {
    console.error('❌ Error saving game result:', error)
    throw error
  }
}
