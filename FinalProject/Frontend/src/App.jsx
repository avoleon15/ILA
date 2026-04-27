import { useState } from 'react'
import './App.css'
import Adlg from './components/Adlg/Adlg.jsx'
import Admd from './components/Admd/Admd.jsx'
import Adsm from './components/Adsm/Adsm.jsx'
import NavBar from './components/NavBar/NavBar'
import OptionHolder from './components/OptionHolder/OptionHolder.jsx'
import TitleHolder from './components/TitleHolder/TitleHolder.jsx'
import BackButton from './components/BackButton/BackButton.jsx'
import GameRouter from './GameRouter.jsx'

function App() {

  const [page, setPage] = useState('menu')

  return (
    <>
      <NavBar/>
      <section id='page-display'>
        <section>

          <section id='game-box'>
            <GameRouter
              page={page}
              navigate={setPage}
            />
          </section>

          <Adlg/>
        </section>
        <section id='display-right'>
          <Admd/>
          <Adsm/>
          <Admd/>
        </section>
      </section>
      <BackButton text="Back"/>
    </>
  )
}

export default App
