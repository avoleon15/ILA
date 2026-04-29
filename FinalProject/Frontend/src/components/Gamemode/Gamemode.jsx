import './Gamemode.css'
import { useState } from 'react'



const Gamemode = () => {

    
    const [mode, setMode] = useState('classic')
    const modes = ['CLASSIC', 'RAPID', 'EXTENDED']

  return (
    <div className="toggle-group">
        {modes.map((m) => (
            <button
                key={m}
                className={`toggle-btn ${mode === m.toLowerCase() ? 'active' : ''}`}
                onClick={() => setMode(m.toLowerCase())}
            >
                {m}
            </button>
        ))}
    </div>
  )
}

export default Gamemode