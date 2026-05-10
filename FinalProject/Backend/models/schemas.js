/**
 * schemas.js — Modelos de Mongoose para persistir datos en MongoDB.
 * Define la coleccion GameResult para guardar resultados de partidas completadas.
 * Exporta el modelo y la funcion saveGameResult para guardar resultados.
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
    drawingSubmitted: Boolean
  }],
  createdAt: { type: Date, default: Date.now },
  duration: { type: Number }
})

export const GameResult = mongoose.model('GameResult', gameResultSchema)

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
