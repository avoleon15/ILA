import { useEffect, useRef, useState } from 'react'
import './GameLogic.css'

// GameLogic.jsx — a paint canvas screen
// This screen lets players draw freely inside the game box.
// It uses the HTML5 Canvas API directly via a ref

// COLORS — the preset swatches shown in the toolbar.
const COLORS = [
    '#000000', // black
    '#ffffff', // white
    '#808080', // gray
    '#ff0000', // red
    '#ffa500', // orange
    '#ffff00', // yellow
    '#00ff00', // green
    '#00ffff', // cyan
    '#0000ff', // blue
    '#800080'  // purple
]

// hexToRgb — converts a hex color string like '#ff5f56'
// into an [R, G, B] array like [255, 95, 86].
function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : null
}

function GameLogic({ navigate }) {

    // canvasRef — a direct reference to the <canvas> DOM element.
    const canvasRef = useRef(null)

    // painting — tracks whether the mouse button is currently held down.
    const painting = useRef(false)

    // lastPos — stores the x/y of the previous mouse position.
    // Used to draw a continuous line from the last point to the current point on every mousemove event.
    const lastPos = useRef({ x: 0, y: 0 })

    // Add undoStack ref at the top with your other refs, stores ImageData snapshots, used on the return last change button
    const undoStack = useRef([])

    // tool — which tool is active: 'draw', 'eraser', or 'fill'.
    const [tool,  setTool]  = useState('draw')

    // size — the brush/eraser radius in pixels.
    const [size,  setSize]  = useState(6)

    // color — the currently selected color as a hex string.
    const [color, setColor] = useState('#000000')

    
    // useEffect: canvas setup
    // Runs once, Sets the canvas width/height to match its CSS size, then fills it with the background color.
    useEffect(() => {
        const canvas = canvasRef.current
        const ctx    = canvas.getContext('2d') // '2d' = standard drawing context

        const resize = () => {
            // canvas.offsetWidth/Height = the CSS rendered size, set the size to the box defined
            canvas.width  = canvas.offsetWidth
            canvas.height = canvas.offsetHeight

            // Fill the whole canvas with the background color, white.
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        //crtl + z works as a undo last change
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') undo()
        }

        resize()
        window.addEventListener('resize', resize)
        window.addEventListener('keydown', handleKeyDown)

        // Cleanup: remove the listener when the component unmounts
        return () => {
            window.removeEventListener('resize', resize)
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [])

    // saveSnapshot
    // Call this before any drawing action so we can undo it, saves the current canvas pixels onto the undo stack.
    const saveSnapshot = () => {
        const canvas = canvasRef.current
        const ctx    = canvas.getContext('2d')
        undoStack.current.push(
            ctx.getImageData(0, 0, canvas.width, canvas.height)
        )
        // Cap the stack at 30 so it doesn't eat too much memory
        if (undoStack.current.length > 30) undoStack.current.shift()
    }

    // undo
    // Pops the last snapshot off the stack and restores it.
    const undo = () => {
        if (undoStack.current.length === 0) return
            const canvas = canvasRef.current
            const ctx    = canvas.getContext('2d')
            ctx.putImageData(undoStack.current.pop(), 0, 0)
    }

    // Replace your floodFill function with this version
    const floodFill = (x, y) => {
        const canvas    = canvasRef.current
        const ctx       = canvas.getContext('2d')
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data      = imageData.data
        const idx       = (y * canvas.width + x) * 4
        const target    = [data[idx], data[idx+1], data[idx+2]]
        const fill      = hexToRgb(color)

        if (!fill || (target[0]===fill[0] && target[1]===fill[1] && target[2]===fill[2])) return

    // Tolerance check
    // Instead of exact match, allow pixels within this distance
    // from the target color. 32 covers most anti-aliased edges.
        const TOLERANCE = 32

        const matchesTarget = (i) => {
            return (
            Math.abs(data[i]   - target[0]) <= TOLERANCE &&
            Math.abs(data[i+1] - target[1]) <= TOLERANCE &&
            Math.abs(data[i+2] - target[2]) <= TOLERANCE
            )
        }

        const stack = [[x, y]]

        // Visited set
        // Tracks pixels we've already processed so pixels arent added to the stack multiple times.
        const visited = new Uint8Array(canvas.width * canvas.height)

        // Keeps running until every connected matching pixel has been visited.
        while (stack.length) {
            const [cx, cy] = stack.pop()
            // Skip pixels that are outside the canvas boundaries
            if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) continue

            const i    = (cy * canvas.width + cx) * 4
            const vidx = cy * canvas.width + cx

            // Skip this pixel if we've already processed it.
            if (visited[vidx]) continue
            visited[vidx] = 1

            // Skip this pixel if its color doesn't match the target.
            if (!matchesTarget(i)) continue

            // Paint the pixel
            data[i]=fill[0]; data[i+1]=fill[1]; data[i+2]=fill[2]; data[i+3]=255

            stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1])
        }

            ctx.putImageData(imageData, 0, 0)
    }

    // draw
    // Called on every mousemove while the mouse button is held.
    // Draws a line from the last recorded position to the current, mouse position.
    const draw = (x, y) => {
        if (!painting.current) return // only draw while mouse is held

        const ctx = canvasRef.current.getContext('2d')

        ctx.beginPath()
        ctx.moveTo(lastPos.current.x, lastPos.current.y) // start of line
        ctx.lineTo(x, y)                                  // end of line

        // Eraser paints the background color; draw uses the chosen color
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
        ctx.lineWidth   = tool === 'eraser' ? size * 1.5 : size
        ctx.lineCap     = 'round'  // rounded ends make strokes look smooth
        ctx.lineJoin    = 'round'  // rounded corners when direction changes
        ctx.stroke()

        // Update lastPos so the next mousemove continues from here
        lastPos.current = { x, y }
    }

  // getPos
  // Converts a mouse event's screen coordinates into coordinates relative to the canvas element. 
  // Without this, drawing would be offset if the canvas isn't at position 0,0 on the page.
    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect()
        return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

  // onMouseDown
  // Fires when the user presses the mouse button on the canvas.
  // For fill: immediately flood fill at the click position.
  // For draw/eraser: start tracking the stroke.
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

    // Also save before clearing
    const clearCanvas = () => {
    saveSnapshot()
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // onMouseMove
    // Fires continuously as the mouse moves over the canvas.
    const onMouseMove = (e) => draw(getPos(e).x, getPos(e).y)

    // onMouseUp
    // Stop painting when the button is released
    const onMouseUp = () => { painting.current = false }

return (
    <section id='GameLogic'>

    <div className='toolbar'>

        <button className={`tool-btn ${tool==='draw'   ? 'active':''}`} onClick={() => setTool('draw')}>✏️ Draw</button>
        <button className={`tool-btn ${tool==='eraser' ? 'active':''}`} onClick={() => setTool('eraser')}>🧹 Eraser</button>
        <button className={`tool-btn ${tool==='fill'   ? 'active':''}`} onClick={() => setTool('fill')}>🪣 Fill</button>

        <div className='divider'/>

        <span className='label'>Size</span>
        <input type='range' min={1} max={60} value={size}
        onChange={e => setSize(Number(e.target.value))} />

        <div className='divider'/>

        {COLORS.map(c => (
        <div key={c}
            className={`color-swatch ${color===c ? 'active':''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
        />
        ))}

        <input type='color' value={color}
        onChange={e => setColor(e.target.value)} />

        <div className='divider'/>

        <button className='tool-btn' onClick={undo}>↩ Undo</button>
        <button className='tool-btn' onClick={clearCanvas}>🗑️ Clear</button>

        <button className='back-btn' onClick={() => navigate('menu')}>← Menu</button>

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