import { ArrowCounterClockwise, Eraser, PaintBucket, PencilSimple, Trash } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import socket from '../../socket.js'
import './GameLogic.css'

const COLS = 80
const ROWS = 45
const CELL = 10

const COLORS = [
  '#ffffff', '#e0e0e0', '#b0b0b0', '#787878', '#505050', '#303030', '#181818', '#000000',
  '#ffe0e0', '#ff9999', '#ff4444', '#ff0000', '#cc0000', '#990000', '#660000', '#330000',
  '#ffd6f0', '#ff99dd', '#ff4dbb', '#ff007f', '#cc0066', '#990044', '#660033', '#330019',
  '#ffe0cc', '#ffb380', '#ff6b00', '#e65c00', '#b34700', '#7a3000', '#4d1e00', '#2b1000',
  '#ffff99', '#ffff00', '#ffe135', '#ffcc00', '#e6ac00', '#b38600', '#7a5c00', '#3d2e00',
  '#c8f5c8', '#66dd66', '#00cc66', '#00aa44', '#008000', '#006600', '#004400', '#002200',
  '#ccf5ff', '#80dfff', '#00ccff', '#00aaff', '#0077ff', '#0044cc', '#002299', '#001166',
  '#e0ccff', '#cc99ff', '#aa66ff', '#8833ff', '#6600cc', '#4b0099', '#320066', '#1a0033',
  '#ffe8a0', '#c68642', '#a0522d', '#7b4000', '#5c2d00', '#d4a574', '#f5deb3', '#8b4513',
]

function drawCell(ctx, col, row, color) {
    ctx.fillStyle = color
    ctx.fillRect(col * CELL, row * CELL, CELL, CELL)
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.2)'
    ctx.lineWidth = 0.5
    ctx.strokeRect(col * CELL + 0.25, row * CELL + 0.25, CELL - 0.5, CELL - 0.5)
}

function redrawAll(ctx, grid) {
    for (let row = 0; row < ROWS; row++)
        for (let col = 0; col < COLS; col++)
            drawCell(ctx, col, row, grid[row * COLS + col])
}

function GameLogic({ navigate, gameState, setGameState }) {

    const canvasRef      = useRef(null)
    const painting       = useRef(false)
    const lastCell       = useRef({ col: -1, row: -1 })
    const gridRef        = useRef(Array(COLS * ROWS).fill('#ffffff'))
    const undoStack      = useRef([])
    const colorSlotsRef  = useRef(null)
    const submittedRef   = useRef(false)
    const totalSeconds   = useRef(Math.floor((gameState.drawingDuration ?? 60000) / 1000))

    const [tool,        setTool]        = useState('draw')
    const [brushSize,   setBrushSize]   = useState(1)
    const [slotColors,  setSlotColors]  = useState(['#000000', '#ff0000', '#0077ff'])
    const [activeSlot,  setActiveSlot]  = useState(0)
    const [openSlot,    setOpenSlot]    = useState(null)
    const [timeLeft,    setTimeLeft]    = useState(null)
    const [submitted,   setSubmitted]   = useState(false)

    const color = slotColors[activeSlot]

    const submitDrawing = () => {
        if (submittedRef.current) return
        submittedRef.current = true
        setSubmitted(true)
        const dataUrl = canvasRef.current?.toDataURL('image/png') ?? null
        socket.emit('submit-drawing', { roomCode: gameState.roomCode, drawingData: dataUrl })
    }

    useEffect(() => {
        socket.on('voting-started', (data) => {
            setGameState(prev => ({ ...prev, votingData: data }))
            navigate('voting')
        })
        return () => socket.off('voting-started')
    }, [])

    useEffect(() => {
        const seconds = Math.floor((gameState.drawingDuration ?? 60000) / 1000)
        setTimeLeft(seconds)

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval)
                    submitDrawing()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (colorSlotsRef.current && !colorSlotsRef.current.contains(e.target))
                setOpenSlot(null)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx    = canvas.getContext('2d')
        canvas.width  = COLS * CELL
        canvas.height = ROWS * CELL
        redrawAll(ctx, gridRef.current)

        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') undo()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])


    const saveSnapshot = () => {
        undoStack.current.push([...gridRef.current])
        if (undoStack.current.length > 30) undoStack.current.shift()
    }

    const undo = () => {
        if (!undoStack.current.length) return
        gridRef.current = undoStack.current.pop()
        const ctx = canvasRef.current?.getContext('2d')
        if (ctx) redrawAll(ctx, gridRef.current)
    }

    const handleUndo = () => undo()

    const getGridPos = (e) => {
        const rect   = canvasRef.current.getBoundingClientRect()
        const scaleX = (COLS * CELL) / rect.width
        const scaleY = (ROWS * CELL) / rect.height
        return {
            col: Math.floor((e.clientX - rect.left) * scaleX / CELL),
            row: Math.floor((e.clientY - rect.top)  * scaleY / CELL),
        }
    }

    const paintCells = (ctx, centerCol, centerRow, paintColor) => {
        const half  = Math.floor(brushSize / 2)
        const cells = []
        for (let dr = -half; dr <= half; dr++) {
            for (let dc = -half; dc <= half; dc++) {
                const col = centerCol + dc
                const row = centerRow + dr
                if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue
                const idx = row * COLS + col
                if (gridRef.current[idx] === paintColor) continue
                gridRef.current[idx] = paintColor
                drawCell(ctx, col, row, paintColor)
                cells.push({ col, row, color: paintColor })
            }
        }
        return cells
    }

    const floodFill = (ctx, startCol, startRow, fillColor) => {
        const grid        = gridRef.current
        const targetColor = grid[startRow * COLS + startCol]
        if (targetColor === fillColor) return []

        const stack   = [[startCol, startRow]]
        const visited = new Uint8Array(COLS * ROWS)
        const cells   = []

        while (stack.length) {
            const [col, row] = stack.pop()
            if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue
            const idx = row * COLS + col
            if (visited[idx] || grid[idx] !== targetColor) continue
            visited[idx] = 1
            grid[idx] = fillColor
            drawCell(ctx, col, row, fillColor)
            cells.push({ col, row, color: fillColor })
            stack.push([col+1, row], [col-1, row], [col, row+1], [col, row-1])
        }
        return cells
    }

    const onMouseDown = (e) => {
        const { col, row } = getGridPos(e)
        const ctx = canvasRef.current.getContext('2d')
        saveSnapshot()

        if (tool === 'fill') {
            floodFill(ctx, col, row, color)
            return
        }

        painting.current  = true
        lastCell.current  = { col: -1, row: -1 }
        const paintColor  = tool === 'eraser' ? '#ffffff' : color
        paintCells(ctx, col, row, paintColor)
        lastCell.current  = { col, row }
    }

    const onMouseMove = (e) => {
        if (!painting.current) return
        const { col, row } = getGridPos(e)
        if (col === lastCell.current.col && row === lastCell.current.row) return
        const ctx        = canvasRef.current.getContext('2d')
        const paintColor = tool === 'eraser' ? '#ffffff' : color
        paintCells(ctx, col, row, paintColor)
        lastCell.current = { col, row }
    }

    const onMouseUp = () => { painting.current = false }

    const clearCanvas = () => {
        saveSnapshot()
        gridRef.current.fill('#ffffff')
        redrawAll(canvasRef.current.getContext('2d'), gridRef.current)
    }

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

                <input className='size-slider' type='range' min={1} max={5} value={brushSize}
                    onChange={e => setBrushSize(Number(e.target.value))} />

                <div className='toolbar-divider' />

                <div className='color-slots' ref={colorSlotsRef}>
                    {slotColors.map((slotColor, i) => (
                        <div key={i} className='palette-wrapper'>
                            <button
                                className={`palette-toggle ${activeSlot === i ? 'active-slot' : ''} ${openSlot === i ? 'open' : ''}`}
                                title={`Color slot ${i + 1}`}
                                style={{ background: slotColor }}
                                onClick={() => {
                                    setActiveSlot(i)
                                    setOpenSlot(openSlot === i ? null : i)
                                }}
                            />
                            {openSlot === i && (
                                <div className='color-palette'>
                                    {COLORS.map(c => (
                                        <div key={c}
                                            className={`color-swatch ${slotColor === c ? 'active' : ''}`}
                                            style={{ background: c }}
                                            onClick={() => {
                                                const next = [...slotColors]
                                                next[i] = c
                                                setSlotColors(next)
                                                setOpenSlot(null)
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className='toolbar-divider' />

                <div className='topic-selected'>
                    <h5>Topic:</h5>
                    <h6>{gameState.topic || '...'}</h6>
                </div>

                <div className={`timer ${timeLeft !== null && timeLeft <= 10 ? 'timer-urgent' : ''}`}>
                    {timeLeft !== null ? `${timeLeft}s` : ''}
                </div>

                {submitted && <span className='submitted-label'>Submitted!</span>}

                <button className='back-btn' title='Back to menu' onClick={() => navigate('menu')}>←</button>
            </div>

            <div className='timer-bar'>
                <div
                    className={`timer-bar-fill ${timeLeft !== null && timeLeft <= 10 ? 'urgent' : ''}`}
                    style={{ width: `${timeLeft !== null ? (timeLeft / totalSeconds.current) * 100 : 100}%` }}
                />
            </div>

            <div className='canvas-wrapper'>
                <canvas
                    ref={canvasRef}
                    onMouseDown={submitted ? undefined : onMouseDown}
                    onMouseMove={submitted ? undefined : onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    style={submitted ? { pointerEvents: 'none', opacity: 0.6 } : undefined}
                />
            </div>
        </section>
    )
}

export default GameLogic
