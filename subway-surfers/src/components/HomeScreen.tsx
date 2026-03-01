interface HomeScreenProps {
    selectMode: (mode: string) => void;
}

const modes = [
    { key: 'user', icon: '🎮', label: 'User' },
    { key: 'nn', icon: '🧬', label: 'Neural Network' },
    { key: 'neat', icon: '🧠', label: 'NEAT' },
    { key: 'rl', icon: '🤖', label: 'PPO' },
];

export const HomeScreen = ({ selectMode }: HomeScreenProps) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6">
            <h1 className="font-['Courier_New',monospace] text-[2.8rem] tracking-[2px] text-[#535353]">Subway-Surfers Game</h1>
            <p className="font-sans text-[1.1rem] text-[#888]">Choose a play mode</p>
            <div className="flex gap-6 mt-4">
                {modes.map((m) => (
                    <button
                        key={m.key}
                        className="flex flex-col items-center gap-2 px-8 py-6 border-2 border-slate-200 rounded-2xl bg-slate-50 cursor-pointer transition-all duration-200 ease-in-out min-w-[140px] hover:border-[#535353] hover:bg-slate-100 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                        onClick={() => selectMode(m.key)}
                    >
                        <span className="text-[2rem]">{m.icon}</span>
                        <span className="font-['Courier_New',monospace] text-base font-semibold text-[#535353]">{m.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
