import { ArrowCounterClockwise, Eraser, PaintBucket, PencilSimple, Trash } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import socket from '../../socket.js'
import './GameLogic.css'

// GameLogic.jsx — paint canvas screen with real-time multiplayer sync.
// Local strokes are drawn and emitted via Socket.io; remote strokes are received and replayed.

// COLORS — the preset swatches shown in the toolbar.
const COLORS = [
  '#ffffff', '#e0e0e0', '#b0b0b0', '#787878', '#505050', '#303030', '#181818', '#000000',
  '#ffd6e0', '#ff99cc', '#ff4da6', '#ff007f', '#cc0066', '#990044', '#660033', '#330019',
  '#ffe0cc', '#ffb380', '#ff6b00', '#e65c00', '#b34700', '#7a3000', '#4d1e00', '#2b1000',
  '#ffff99', '#ffff00', '#ffe135', '#ffcc00', '#e6ac00', '#b38600', '#7a5c00', '#3d2e00',
  '#c8f5c8', '#66dd66', '#00cc66', '#00aa44', '#008000', '#006600', '#004400', '#002200',
  '#ccf5ff', '#80dfff', '#00ccff', '#00aaff', '#0077ff', '#0044cc', '#002299', '#001166',
  '#e0ccff', '#cc99ff', '#aa66ff', '#8833ff', '#6600cc', '#4b0099', '#320066', '#1a0033',
  '#ffe8a0', '#c68642', '#a0522d', '#7b4000', '#5c2d00', '#d4a574', '#f5deb3', '#8b4513',
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

    const canvasRef   = useRef(null)
    const painting    = useRef(false)
    const lastPos     = useRef({ x: 0, y: 0 })
    const undoStack   = useRef([])
    const paletteRef  = useRef(null)

    const [tool,         setTool]         = useState('draw')
    const [size,         setSize]         = useState(6)
    const [color,        setColor]        = useState('#000000')
    const [paletteOpen,  setPaletteOpen]  = useState(false)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (paletteRef.current && !paletteRef.current.contains(e.target))
                setPaletteOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

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
            <div className='toolbar'>
                <button className={`tool-btn ${tool==='draw'   ? 'active':''}`} title='Draw' onClick={() => setTool('draw')}>
                    <PencilSimple size={20} weight='duotone' />
                </button>
                <button className={`tool-btn ${tool==='eraser' ? 'active':''}`} title='Eraser' onClick={() => setTool('eraser')}>
                    <Eraser size={20} weight='duotone' />
                </button>
                <button className={`tool-btn ${tool==='fill'   ? 'active':''}`} title='Fill' onClick={() => setTool('fill')}>
                    <PaintBucket size={20} weight='duotone' />
                </button>
                <button className='tool-btn' title='Undo' onClick={handleUndo}>
                    <ArrowCounterClockwise size={20} weight='duotone' />
                </button>
                <button className='tool-btn' title='Clear all' onClick={clearCanvas}>
                    <Trash size={20} weight='duotone' />
                </button>

                <div className='toolbar-divider' />

                <input className='size-slider' type='range' min={1} max={60} value={size}
                    onChange={e => setSize(Number(e.target.value))} />

                <div className='toolbar-divider' />

                <div className='palette-wrapper' ref={paletteRef}>
                    <button
                        className={`palette-toggle ${paletteOpen ? 'open' : ''}`}
                        title='Colors'
                        onClick={() => setPaletteOpen(p => !p)}
                        style={{ background: color }}
                    />
                    {paletteOpen && (
                        <div className='color-palette'>
                            {COLORS.map(c => (
                                <div key={c}
                                    className={`color-swatch ${color===c ? 'active':''}`}
                                    style={{ background: c }}
                                    onClick={() => { setColor(c); setPaletteOpen(false) }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className='toolbar-divider' />

                <button className='back-btn' title='Back to menu' onClick={() => navigate('menu')}>←</button>
            </div>

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
