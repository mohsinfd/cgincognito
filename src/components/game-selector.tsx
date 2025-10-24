'use client';

import { useState } from 'react';
import TetrisGame from './tetris-game';
import SnakeGame from './snake-game';

type GameType = 'tetris' | 'snake';

export default function GameSelector({ isPlaying = true }: { isPlaying?: boolean }) {
  const [selectedGame, setSelectedGame] = useState<GameType>('tetris');

  return (
    <div className="flex flex-col gap-4">
      {/* Game Selection Tabs */}
      <div className="flex gap-2 bg-gray-800 p-2 rounded-lg">
        <button
          onClick={() => setSelectedGame('tetris')}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            selectedGame === 'tetris'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          🎮 Tetris
        </button>
        <button
          onClick={() => setSelectedGame('snake')}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            selectedGame === 'snake'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          🐍 Snake
        </button>
      </div>

      {/* Game Display */}
      <div className="relative">
        {selectedGame === 'tetris' && <TetrisGame isPlaying={isPlaying} />}
        {selectedGame === 'snake' && <SnakeGame isPlaying={isPlaying} />}
      </div>
    </div>
  );
}

