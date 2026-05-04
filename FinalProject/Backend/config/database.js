/**
 * database.js — Configuracion de la conexion a MongoDB.
 * Exporta la funcion connectDatabase que debe llamarse al iniciar el servidor.
 */

import mongoose from 'mongoose'

// Establece la conexion con MongoDB usando la URI del .env, o una local por defecto
export const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/asdrubal')
    console.log('✅ MongoDB connected successfully')
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message)
    console.warn('⚠️  Running without database — game rooms work in-memory only')
  }
}
