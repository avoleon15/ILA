import { ArrowCounterClockwise, Eraser, PaintBucket, PencilSimple, Trash } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import socket from '../../socket.js'
import './GameLogic.css'

const COLS = 80
const ROWS = 45
const CELL = 10

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

function GameLogic({ navigate, gameState }) {

    const canvasRef      = useRef(null)
    const painting       = useRef(false)
    const lastCell       = useRef({ col: -1, row: -1 })
    const gridRef        = useRef(Array(COLS * ROWS).fill('#ffffff'))
    const undoStack      = useRef([])
    const colorSlotsRef  = useRef(null)

    const [tool,        setTool]        = useState('draw')
    const [brushSize,   setBrushSize]   = useState(1)
    const [slotColors,  setSlotColors]  = useState(['#000000', '#ff0000', '#0000ff'])
    const [activeSlot,  setActiveSlot]  = useState(0)
    const [openSlot,    setOpenSlot]    = useState(null)

    const color = slotColors[activeSlot]

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

    useEffect(() => {
        socket.on('player-draw-action', ({ cells }) => {
            const ctx = canvasRef.current?.getContext('2d')
            if (!ctx) return
            cells.forEach(({ col, row, color }) => {
                gridRef.current[row * COLS + col] = color
                drawCell(ctx, col, row, color)
            })
        })
        socket.on('player-undo-action', () => undo())
        return () => {
            socket.off('player-draw-action')
            socket.off('player-undo-action')
        }
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

    const handleUndo = () => {
        undo()
        if (gameState?.roomCode)
            socket.emit('undo-action', { roomCode: gameState.roomCode })
    }

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

    const emit = (cells) => {
        if (cells.length && gameState?.roomCode)
            socket.emit('draw-action', { roomCode: gameState.roomCode, cells })
    }

    const onMouseDown = (e) => {
        const { col, row } = getGridPos(e)
        const ctx = canvasRef.current.getContext('2d')
        saveSnapshot()

        if (tool === 'fill') {
            emit(floodFill(ctx, col, row, color))
            return
        }

        painting.current  = true
        lastCell.current  = { col: -1, row: -1 }
        const paintColor  = tool === 'eraser' ? '#ffffff' : color
        emit(paintCells(ctx, col, row, paintColor))
        lastCell.current  = { col, row }
    }

    const onMouseMove = (e) => {
        if (!painting.current) return
        const { col, row } = getGridPos(e)
        if (col === lastCell.current.col && row === lastCell.current.row) return
        const ctx        = canvasRef.current.getContext('2d')
        const paintColor = tool === 'eraser' ? '#ffffff' : color
        emit(paintCells(ctx, col, row, paintColor))
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

                <button className='back-btn' title='Back to menu' onClick={() => navigate('menu')}>←</button>
            </div>

            <canvas
                ref={canvasRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
            />
        </section>
    )
}

export default GameLogic
