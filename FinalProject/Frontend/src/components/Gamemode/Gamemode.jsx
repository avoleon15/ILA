import './Gamemode.css'

// Controlled component: mode and onChange come from the parent (createGame)
const Gamemode = ({ mode, onChange }) => {
    const modes = ['CLASSIC', 'RAPID', 'EXTENDED']

  return (
    <div className="toggle-group">
        {modes.map((m) => (
            <button
                key={m}
                className={`toggle-btn ${mode === m.toLowerCase() ? 'active' : ''}`}
                onClick={() => onChange(m.toLowerCase())}
            >
                {m}
            </button>
        ))}
    </div>
  )
}

export default Gamemode
