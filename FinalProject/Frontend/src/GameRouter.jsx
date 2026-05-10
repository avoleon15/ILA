import { SCREENS } from './Screens.jsx'

export default function GameRouter({ page, navigate, gameState, setGameState }) {

    // Look up the component for the current page key.
    // Falls back to MenuScreen if the key doesn't exist
    const Screen = SCREENS[page] ?? SCREENS.menu

    // Pass navigate and shared game state to every screen
    return <Screen navigate={navigate} gameState={gameState} setGameState={setGameState} />
}
