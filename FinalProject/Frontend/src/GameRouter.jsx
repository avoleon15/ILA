import { SCREENS } from './Screens.jsx'

export default function GameRouter({ page, navigate }) {

    // Look up the component for the current page key.
    // Falls back to MenuScreen if the key doesn't exist
    const Screen = SCREENS[page] ?? SCREENS.menu

    // Render the matched screen and pass navigate down so
    return <Screen navigate={navigate} />
}