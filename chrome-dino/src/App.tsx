import { Canvas } from "./components/Canvas";

function App() {

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">🦕 Chrome Dino</h1>
      <Canvas />
    </div>
  )
}

export default App;
