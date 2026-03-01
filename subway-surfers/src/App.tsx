import { useState } from 'react'
import './App.css'
import { HomeScreen } from './components/HomeScreen'
import { GameScreen } from './components/GameScreen';

function App() {
  const [screen ,setScreen] = useState<"home" | "game">("home");
  const [selectedMode, setSelectedMode] = useState<string>("user");

  const selectMode = (mode : string) => {
    setSelectedMode(mode);
    setScreen("game");
  }

  const onBack = () => {
    setScreen("home");
  }

  return (
    <>
      {screen === "home" && <HomeScreen selectMode={selectMode} />}
      {screen === "game" && <GameScreen mode={selectedMode} onBack={onBack} />}    
    </>
  )
}

export default App
