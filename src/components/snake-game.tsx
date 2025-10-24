'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE;
const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE;
const INITIAL_SPEED = 150;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

export default function SnakeGame({ isPlaying = true }: { isPlaying?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const snakeRef = useRef<Position[]>([{ x: 10, y: 10 }]);
  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const foodRef = useRef<Position>({ x: 15, y: 15 });
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const generateFood = useCallback(() => {
    const snake = snakeRef.current;
    let newFood: Position;
    
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    
    foodRef.current = newFood;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#16213e';
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_WIDTH, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw snake
    const snake = snakeRef.current;
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#4ade80' : '#22c55e';
      ctx.fillRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    });

    // Draw food
    const food = foodRef.current;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }, []);

  const checkCollision = useCallback((head: Position): boolean => {
    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    
    // Self collision
    const snake = snakeRef.current;
    return snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y);
  }, []);

  const gameLoop = useCallback(() => {
    if (isPaused || gameOver) return;

    const snake = snakeRef.current;
    const currentDirection = directionRef.current;
    const nextDirection = nextDirectionRef.current;
    
    // Update direction
    directionRef.current = nextDirection;
    
    // Calculate new head position
    const head = { ...snake[0] };
    switch (nextDirection) {
      case 'UP':
        head.y -= 1;
        break;
      case 'DOWN':
        head.y += 1;
        break;
      case 'LEFT':
        head.x -= 1;
        break;
      case 'RIGHT':
        head.x += 1;
        break;
    }

    // Check collision
    if (checkCollision(head)) {
      setGameOver(true);
      return;
    }

    // Add new head
    const newSnake = [head, ...snake];

    // Check if food eaten
    const food = foodRef.current;
    if (head.x === food.x && head.y === food.y) {
      setScore(s => s + 10);
      generateFood();
    } else {
      // Remove tail if no food eaten
      newSnake.pop();
    }

    snakeRef.current = newSnake;
    draw();
  }, [isPaused, gameOver, checkCollision, generateFood, draw]);

  const changeDirection = useCallback((newDirection: Direction) => {
    const currentDirection = directionRef.current;
    
    // Prevent opposite direction
    if (
      (currentDirection === 'UP' && newDirection === 'DOWN') ||
      (currentDirection === 'DOWN' && newDirection === 'UP') ||
      (currentDirection === 'LEFT' && newDirection === 'RIGHT') ||
      (currentDirection === 'RIGHT' && newDirection === 'LEFT')
    ) {
      return;
    }
    
    nextDirectionRef.current = newDirection;
  }, []);

  const reset = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }];
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    generateFood();
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
  }, [generateFood]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          changeDirection('RIGHT');
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          setIsPaused(p => !p);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, gameOver]);

  useEffect(() => {
    if (isPlaying && !gameOver && !isPaused) {
      gameLoopRef.current = setInterval(gameLoop, INITIAL_SPEED);
    }
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameLoop, isPlaying, gameOver, isPaused]);

  useEffect(() => {
    generateFood();
    draw();
  }, [generateFood, draw]);

  return (
    <div className="flex flex-col items-center gap-4 bg-gray-900 p-4 rounded-lg">
      <div className="text-white text-center">
        <h3 className="text-xl font-bold mb-2">🐍 Snake</h3>
        <p className="text-2xl font-mono mb-2">Score: {score}</p>
        {isPaused && <p className="text-yellow-400 font-bold">PAUSED</p>}
        {gameOver && <p className="text-red-400 font-bold">GAME OVER</p>}
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-4 border-gray-700"
      />

      <div className="text-xs text-gray-400 text-center space-y-1">
        <p>↑ ↓ ← → or WASD to move</p>
        <p>P to pause</p>
      </div>

      {gameOver && (
        <button
          onClick={reset}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
        >
          Play Again
        </button>
      )}

      {!isPlaying && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="text-white text-center">
            <p className="text-2xl font-bold mb-2">✅ Statements Parsed!</p>
            <p className="text-sm">Game paused while you review results</p>
          </div>
        </div>
      )}
    </div>
  );
}

