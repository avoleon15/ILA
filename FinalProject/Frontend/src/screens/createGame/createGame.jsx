import { useState } from "react"
import NumberInput from '../../components/PlayersNum/PlayersNum.jsx'
import TitleHolder from '../../components/TitleHolder/TitleHolder.jsx'
import './createGame.css'
import { useState } from "react"; 
import Gamemode from "../../components/Gamemode/Gamemode.jsx"
import OptionHolder from "../../components/OptionHolder/OptionHolder.jsx"
import BackButton from '../../components/BackButton/BackButton.jsx'

function CreateGame({ navigate }) {
    const [players, setPlayers] = useState(2)

    return (
        <section id='createGame'>
            <TitleHolder text="Create game"/>
            
            <input type="number" 
            value={valor} 
            onChange={(e) => setValor(e.target.value)} 
            placeholder="número de jugadores" /> 
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
