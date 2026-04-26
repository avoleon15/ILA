import './App.css'
import NavBar from './components/NavBar/NavBar'
import OptionHolder from './components/OptionHolder/OptionHolder.jsx'
import TitleHolder from './components/TitleHolder/TitleHolder.jsx'

function App() {

  return (
   
    <>
      <NavBar/>
      <section id='game-box'>
          <TitleHolder/>
          <OptionHolder text="Create Game"/>
          <OptionHolder text="Join Game"/>
          <OptionHolder text="How to Play"/>
      </section>
    </>
  )
}

export default App
