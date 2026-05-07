import OptionHolder from '../../components/OptionHolder/OptionHolder.jsx'
import TitleHolder from '../../components/TitleHolder/TitleHolder.jsx'
import './MenuScreen.css'

// MenuScreen.jsx — the main menu, first thing players see

function MenuScreen({ navigate }) {

    return (
        <section id='MenuScreen'>
            <TitleHolder text='ASDRUBAL'/>
            <OptionHolder text="Create Game" onClick={() => navigate('createGame')} />
            <OptionHolder text="Join Game" onClick={() => navigate('joinGame')} />
            <OptionHolder text="How To Play" onClick={() => navigate('howToPlay')} />
            <OptionHolder text="All Matches" onClick={() => navigate('matches')} />
        </section>
    )
}

export default MenuScreen
