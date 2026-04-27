import { SCREENS } from './Screens.jsx'

export default function GameRouter({ page, navigate }) {
    const Screen = SCREENS[page] ?? SCREENS.menu
    return <Screen navigate={navigate} />
}