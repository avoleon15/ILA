import './PlayersNum.css'

function NumberInput({ label, value, onChange, min = 2, max = 8 }) {
    return (
        <div className="pixel-wrap">
            {label && <span className="pixel-label">{label}</span>}
            <div className="pixel-controls">
                <button
                    className="pixel-btn"
                    onClick={() => value > min && onChange(value - 1)}
                    disabled={value <= min}
                >−</button>
                <input
                    className="pixel-input"
                    type="number"
                    value={value}
                    readOnly
                />
                <button
                    className="pixel-btn"
                    onClick={() => value < max && onChange(value + 1)}
                    disabled={value >= max}
                >+</button>
            </div>
        </div>
    )
}

export default NumberInput