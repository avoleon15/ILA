import { useEffect, useRef, useState } from 'react'
import socket from '../../socket.js'
import './GameLogic.css'

// GameLogic.jsx — paint canvas screen with real-time multiplayer sync.
// Local strokes are drawn and emitted via Socket.io; remote strokes are received and replayed.

// COLORS — the preset swatches shown in the toolbar.
const COLORS = [
  '#ffffff', '#d9d9d9', '#9a9a9a', '#4a4a4a', '#000000',
  '#ff99cc', '#ff007f', '#ff0000', '#6b1a1a',
  '#ff6b00', '#ffcc00', '#c68642', '#a0522d', '#7b4000',
  '#00cc66', '#008000', '#003300',
  '#00ffff', '#00aaff', '#0000ff', '#003366',
  '#cc44ff', '#800080',
  '#ffff00', '#ffe8a0',
]

// hexToRgb — converts a hex color string into an [R, G, B] array.
function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : null
}

// drawSegment — draws a single line segment on a canvas context using action data.
// Used both for local drawing and replaying remote strokes.
function drawSegment(ctx, { fromX, fromY, toX, toY, tool, color, size }) {
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineWidth   = tool === 'eraser' ? size * 1.5 : size
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
}

function GameLogic({ navigate, gameState }) {

    const canvasRef  = useRef(null)
    const painting   = useRef(false)
    const lastPos    = useRef({ x: 0, y: 0 })
    const undoStack  = useRef([])

    const [tool,  setTool]  = useState('draw')
    const [size,  setSize]  = useState(6)
    const [color, setColor] = useState('#000000')

    // Canvas setup and keyboard shortcut
    useEffect(() => {
        const canvas = canvasRef.current
        const ctx    = canvas.getContext('2d')

        const resize = () => {
            canvas.width  = canvas.offsetWidth
            canvas.height = canvas.offsetHeight
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') undo()
        }

        resize()
        window.addEventListener('resize', resize)
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            window.removeEventListener('resize', resize)
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [])

    // Socket listeners for receiving remote drawing actions
    useEffect(() => {
        socket.on('player-draw-action', ({ action }) => {
            const ctx = canvasRef.current?.getContext('2d')
            if (ctx) drawSegment(ctx, action)
        })

        socket.on('player-undo-action', () => undo())

        return () => {
            socket.off('player-draw-action')
            socket.off('player-undo-action')
        }
    }, [])

    const saveSnapshot = () => {
        const canvas = canvasRef.current
        const ctx    = canvas.getContext('2d')
        undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
        if (undoStack.current.length > 30) undoStack.current.shift()
    }

    const undo = () => {
        if (undoStack.current.length === 0) return
        const canvas = canvasRef.current
        const ctx    = canvas.getContext('2d')
        ctx.putImageData(undoStack.current.pop(), 0, 0)
    }

    const handleUndo = () => {
        undo()
        if (gameState?.roomCode) {
            socket.emit('undo-action', { roomCode: gameState.roomCode })
        }
    }

    const floodFill = (x, y) => {
        const canvas    = canvasRef.current
        const ctx       = canvas.getContext('2d')
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data      = imageData.data
        const idx       = (y * canvas.width + x) * 4
        const target    = [data[idx], data[idx+1], data[idx+2]]
        const fill      = hexToRgb(color)

        if (!fill || (target[0]===fill[0] && target[1]===fill[1] && target[2]===fill[2])) return

        const TOLERANCE = 32
        const matchesTarget = (i) => (
            Math.abs(data[i]   - target[0]) <= TOLERANCE &&
            Math.abs(data[i+1] - target[1]) <= TOLERANCE &&
            Math.abs(data[i+2] - target[2]) <= TOLERANCE
        )

        const stack   = [[x, y]]
        const visited = new Uint8Array(canvas.width * canvas.height)

        while (stack.length) {
            const [cx, cy] = stack.pop()
            if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) continue

            const i    = (cy * canvas.width + cx) * 4
            const vidx = cy * canvas.width + cx

            if (visited[vidx]) continue
            visited[vidx] = 1
            if (!matchesTarget(i)) continue

            data[i]=fill[0]; data[i+1]=fill[1]; data[i+2]=fill[2]; data[i+3]=255
            stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1])
        }

        ctx.putImageData(imageData, 0, 0)
    }

    const draw = (x, y) => {
        if (!painting.current) return

        const ctx    = canvasRef.current.getContext('2d')
        const action = { fromX: lastPos.current.x, fromY: lastPos.current.y, toX: x, toY: y, tool, color, size }

        drawSegment(ctx, action)

        // Broadcast stroke to other players in the room
        if (gameState?.roomCode) {
            socket.emit('draw-action', { roomCode: gameState.roomCode, action })
        }

        lastPos.current = { x, y }
    }

    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect()
        return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onMouseDown = (e) => {
        const { x, y } = getPos(e)
        if (tool === 'fill') {
            saveSnapshot()
            floodFill(Math.floor(x), Math.floor(y))
            return
        }
        saveSnapshot()
        painting.current = true
        lastPos.current  = { x, y }
    }

    const clearCanvas = () => {
        saveSnapshot()
        const canvas = canvasRef.current
        const ctx    = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const onMouseMove = (e) => draw(getPos(e).x, getPos(e).y)
    const onMouseUp   = () => { painting.current = false }

    return (
        <section id='GameLogic'>
            <section className='topbar'>
                <div className='toolbar'>
                    <button className={`tool-btn ${tool==='draw'   ? 'active':''}`} onClick={() => setTool('draw')}>DRAW</button>
                    <button className={`tool-btn ${tool==='eraser' ? 'active':''}`} onClick={() => setTool('eraser')}>ERASE</button>
                    <button className={`tool-btn ${tool==='fill'   ? 'active':''}`} onClick={() => setTool('fill')}>FILL</button>
                    <button className='tool-btn' onClick={handleUndo}>↩ UNDO</button>
                    <button className='tool-btn' onClick={clearCanvas}>CLEAR ALL</button>

                    <span className='label'>SIZE</span>
                    <input type='range' min={1} max={60} value={size}
                    onChange={e => setSize(Number(e.target.value))} />
                </div>

                <div className='colorbar'>
                    {COLORS.map(c => (
                        <div key={c}
                            className={`color-swatch ${color===c ? 'active':''}`}
                            style={{ background: c }}
                            onClick={() => setColor(c)}
                        />
                    ))}
                    <input type='color' value={color} onChange={e => setColor(e.target.value)} />
                    <button className='back-btn' onClick={() => navigate('menu')}>← Menu</button>
                </div>
            </section>

            <canvas
                ref={canvasRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
            />
        </section>
    )
}

export default GameLogic
