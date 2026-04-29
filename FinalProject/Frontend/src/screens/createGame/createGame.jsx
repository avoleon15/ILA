import OptionHolder from '../../components/OptionHolder/OptionHolder.jsx'
import TitleHolder from '../../components/TitleHolder/TitleHolder.jsx'
<<<<<<< Updated upstream
import './createGame.css'
import { useState } from "react"; 
=======
import Gamemode from "../../components/Gamemode/Gamemode.jsx"
import OptionHolder from "../../components/OptionHolder/OptionHolder.jsx"
import BackButton from '../../components/BackButton/BackButton.jsx'
import "./createGame.css"
>>>>>>> Stashed changes



function createGame({navigate}) {

    const [valor, setValor] = useState("")

    return (
        <section id='createGame'>
<<<<<<< Updated upstream
            <TitleHolder text="Create game"/>
            
            <input type="number" 
            value={valor} 
            onChange={(e) => setValor(e.target.value)} 
            placeholder="número de jugadores" /> 
        </section>
    );
    
=======
            <div className='createGameBackButton'>
                <BackButton text="Back" onClick={() => navigate('menu')} />
            </div>
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
>>>>>>> Stashed changes
}

export default createGame
