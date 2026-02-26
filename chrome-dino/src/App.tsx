import { useState } from 'react';
import HomeScreen from './components/HomeScreen';
import GameScreen from './components/GameScreen';

export default function App() {
    const [screen, setScreen] = useState<'home' | 'game'>('home');
    const [selectedMode, setSelectedMode] = useState('user');

    const handleSelectMode = (mode: string) => {
        setSelectedMode(mode);
        setScreen('game');
    };

    const handleBack = () => {
        setScreen('home');
    };

    return (
        <>
            {screen === 'home' && <HomeScreen onSelectMode={handleSelectMode} />}
            {screen === 'game' && <GameScreen mode={selectedMode} onBack={handleBack} />}
        </>
    );
}
