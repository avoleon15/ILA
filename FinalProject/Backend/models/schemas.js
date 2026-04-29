import mongoose from 'mongoose'

// Player stats schema (tracks overall player performance)
const playerStatsSchema = new mongoose.Schema({
  playerId: { type: String, required: true, unique: true },
  playerName: { type: String, required: true },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  totalVotes: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  bestScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Game result schema (records individual game outcomes)
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
export const PlayerStats = mongoose.model('PlayerStats', playerStatsSchema)
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

    // Update player stats
    for (const player of gameData.players) {
      let stats = await PlayerStats.findOne({ playerId: player.playerId })

      if (!stats) {
        stats = new PlayerStats({
          playerId: player.playerId,
          playerName: player.playerName
        })
      }

      stats.gamesPlayed += 1
      stats.totalScore += player.score
      stats.totalVotes += player.votesReceived || 0

      if (player.playerId === gameData.winner.playerId) {
        stats.gamesWon += 1
      }

      stats.averageScore = stats.totalScore / stats.gamesPlayed
      if (player.score > stats.bestScore) {
        stats.bestScore = player.score
      }

      stats.updatedAt = new Date()
      await stats.save()
    }

    console.log(`✅ Game result saved: ${gameData.roomCode}`)
    return result
  } catch (error) {
    console.error('❌ Error saving game result:', error)
    throw error
  }
}

/**
 * Get player statistics
 */
export const getPlayerStats = async (playerId) => {
  try {
    return await PlayerStats.findOne({ playerId })
  } catch (error) {
    console.error('❌ Error fetching player stats:', error)
    throw error
  }
}

/**
 * Get leaderboard
 */
export const getLeaderboard = async (limit = 10) => {
  try {
    return await PlayerStats.find()
      .sort({ totalScore: -1 })
      .limit(limit)
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error)
    throw error
  }
}
