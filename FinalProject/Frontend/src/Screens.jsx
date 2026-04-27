import MenuScreen from './screens/MenuScreen/MenuScreen.jsx'
import createGame from './screens/createGame/createGame.jsx'

// SCREENS maps a page key (string) → the React component
// that should render inside the game box for that page.
// Keys are what you pass to navigate(), e.g. navigate('lobby')

export const SCREENS = {
    menu:   MenuScreen,
    createGame: createGame

}