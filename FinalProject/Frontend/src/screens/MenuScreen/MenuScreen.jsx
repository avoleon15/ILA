// MenuScreen.jsx — main menu, first screen the player sees.
// Renders the 4 main navigation buttons.

import OptionHolder from '../../components/OptionHolder/OptionHolder.jsx'
import TitleHolder from '../../components/TitleHolder/TitleHolder.jsx'
import './MenuScreen.css'

function MenuScreen({ navigate }) {

    return (
        <section id='MenuScreen'>
            <TitleHolder text='ASDRUBAL'/>
            <OptionHolder text="Create Game" onClick={() => navigate('createGame')} />
            <OptionHolder text="Join Game" onClick={() => navigate('joinGame')} />
            <OptionHolder text="How To Play" onClick={() => window.open('https://ila-zeta.vercel.app/', '_blank')} />
            <OptionHolder text="All Matches" onClick={() => navigate('matches')} />
        </section>
    )
}

export default MenuScreen
