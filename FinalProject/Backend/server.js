import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { connectDatabase } from './config/database.js'
import { setupSocketHandlers } from './handlers/socketHandlers.js'
import { RoomManager } from './managers/roomManager.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

// Middleware
app.use(cors())
app.use(express.json())

// Attach managers to io for access in handlers
io.roomManager = new RoomManager()

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running', timestamp: new Date() })
})

// Connect database
connectDatabase()

// Setup Socket.io handlers
setupSocketHandlers(io)

// Start server
const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`🎮 ASDRUBAL Backend running on port ${PORT}`)
  console.log(`🔗 CORS enabled for ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`)
})
