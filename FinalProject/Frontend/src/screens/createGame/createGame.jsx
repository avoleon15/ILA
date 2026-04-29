import { useState } from "react"
import Gamemode from "../../components/Gamemode/Gamemode.jsx"
import OptionHolder from "../../components/OptionHolder/OptionHolder.jsx"
import NumberInput from '../../components/PlayersNum/PlayersNum.jsx'
import TitleHolder from '../../components/TitleHolder/TitleHolder.jsx'
import './createGame.css'

function CreateGame({ navigate }) {
    const [players, setPlayers] = useState(2)

    return (
        <section id='createGame'>
            
            <TitleHolder text="Create Game" />
            <NumberInput
                label="NUM OF PLAYERS"
                value={players}
                onChange={setPlayers}
                min={2}
                max={8}
            />
        <h2>Game Mode</h2>
        <Gamemode/>
        <OptionHolder text="Start match"/>
        
        </section>
    

        
    )
}

export default CreateGame
