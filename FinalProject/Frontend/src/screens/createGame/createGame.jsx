import { useState } from "react"
import NumberInput from '../../components/PlayersNum/PlayersNum.jsx'
import TitleHolder from '../../components/TitleHolder/TitleHolder.jsx'
import "./createGame.css"

function CreateGame({ navigate }) {
    const [players, setPlayers] = useState(2)

    return (
        <section id='createGame'>
            <TitleHolder text="Create Game" />
            <NumberInput
                label="NUM. JUGADORES"
                value={players}
                onChange={setPlayers}
                min={2}
                max={8}
            />

        </section>
    )
}

export default CreateGame