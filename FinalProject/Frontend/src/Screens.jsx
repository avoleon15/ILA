import JoinGame from './screens/JoinGame/JoinGame.jsx'
import GameLogic from './screens/GameLogic/GameLogic.jsx'
import MenuScreen from './screens/MenuScreen/MenuScreen.jsx'
import createGame from './screens/createGame/createGame.jsx'
import LobbyScreen from './screens/LobbyScreen/LobbyScreen.jsx'
import WinnerScreen from './screens/WinnerScreen/WinnerScreen.jsx'

    // SCREENS maps a page key (string) → the React component
    // that should render inside the game box for that page.
    // Keys are what you pass to navigate(), e.g. navigate('lobby')

export const SCREENS = {
    menu:   MenuScreen,
    createGame: createGame,
    joinGame: JoinGame,
    demo: GameLogic,
    lobby: LobbyScreen,
    winner: WinnerScreen
}
