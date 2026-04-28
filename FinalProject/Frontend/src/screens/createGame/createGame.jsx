import OptionHolder from '../../components/OptionHolder/OptionHolder.jsx'
import TitleHolder from '../../components/TitleHolder/TitleHolder.jsx'
import './createGame.css'
import { useState } from "react"

function createGame({ navigate }) {
    const [valor, setValor] = useState("")

    return (
        <section id='createGame'>
            <TitleHolder text="Create Game" />
            <input
                type="number"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="número de jugadores"
            />
        </section>
    )
}

export default createGame