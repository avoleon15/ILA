import './App.css'
import Adlg from './components/Adlg/Adlg.jsx'
import Admd from './components/Admd/Admd.jsx'
import Adsm from './components/Adsm/Adsm.jsx'
import NavBar from './components/NavBar/NavBar'
import OptionHolder from './components/OptionHolder/OptionHolder.jsx'
import TitleHolder from './components/TitleHolder/TitleHolder.jsx'

function App() {

  return (
    <>
      <NavBar/>
      <section id='page-display'>
        <section>
          <section id='game-box'>
              <TitleHolder/>
              <OptionHolder text="Create Game"/>
              <OptionHolder text="Join Game"/>
              <OptionHolder text="How to Play"/>
          </section>
          <Adlg/>
        </section>
        <section id='display-right'>
          <Admd/>
          <Adsm/>
          <Admd/>
        </section>
      </section>
    </>
  )
}

export default App
