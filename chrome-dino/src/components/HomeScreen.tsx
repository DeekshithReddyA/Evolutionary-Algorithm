interface HomeScreenProps {
    onSelectMode: (mode: string) => void;
}

const modes = [
    { key: 'user', icon: '🎮', label: 'User' },
    { key: 'neural', icon: '🧬', label: 'Neural Network' },
    { key: 'neat', icon: '🧠', label: 'NEAT' },
    { key: 'rl', icon: '🤖', label: 'PPO' },
];

export default function HomeScreen({ onSelectMode }: HomeScreenProps) {
    return (
        <div className="home-screen">
            <h1 className="game-title">T-Rex Chrome Dino Game</h1>
            <p className="game-subtitle">Choose a play mode</p>
            <div className="mode-buttons">
                {modes.map((m) => (
                    <button
                        key={m.key}
                        className="mode-btn"
                        onClick={() => onSelectMode(m.key)}
                    >
                        <span className="mode-icon">{m.icon}</span>
                        <span className="mode-label">{m.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
