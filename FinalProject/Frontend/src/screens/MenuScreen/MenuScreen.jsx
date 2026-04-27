import OptionHolder from '../../components/OptionHolder/OptionHolder.jsx'
import TitleHolder from '../../components/TitleHolder/TitleHolder.jsx'
import './MenuScreen.css'

// MenuScreen.jsx — the main menu, first thing players see

function MenuScreen() {

    return (
        <section id='MenuScreen'>
            <TitleHolder text='ASDRUBAL'/>
            <OptionHolder text="Create Game" onClick={() => navigate('createGame')} />
            <OptionHolder text="Join Game" onClick={() => navigate('joinGame')} />
            <OptionHolder text="How To Play" onClick={() => navigate('howToPlay')} />
        </section>
    )
}

export default MenuScreen
