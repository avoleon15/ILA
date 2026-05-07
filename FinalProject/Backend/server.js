/**
 * server.js — Punto de entrada del backend.
 * Configura Express, crea el servidor HTTP, inicializa Socket.io,
 * conecta la base de datos y registra todos los manejadores de eventos.
 */

import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { connectDatabase } from './config/database.js'
import { setupSocketHandlers } from './handlers/socketHandlers.js'
import { RoomManager } from './managers/roomManager.js'
import { GameResult } from './models/schemas.js'

dotenv.config()

const app = express()
// httpServer envuelve Express para que Socket.io pueda compartir el mismo puerto
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

// Se adjunta el RoomManager al objeto io para que los handlers puedan accederlo
io.roomManager = new RoomManager()

// Ruta de salud — útil para verificar que el servidor está corriendo
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running', timestamp: new Date() })
})

// Returns paginated match results sorted by newest first
app.get('/matches', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10))
    const skip  = (page - 1) * limit

    const [matches, total] = await Promise.all([
      GameResult.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      GameResult.countDocuments()
    ])

    res.json({ matches, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch matches' })
  }
})

// Conectar a MongoDB
connectDatabase()

// Registrar todos los eventos de Socket.io
setupSocketHandlers(io)

// Iniciar el servidor en el puerto definido en .env o 3000 por defecto
const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`🎮 ASDRUBAL Backend running on port ${PORT}`)
  console.log(`🔗 CORS enabled for ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`)
})
