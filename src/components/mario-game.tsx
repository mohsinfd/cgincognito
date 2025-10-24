'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 500;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -12;
const MOVE_SPEED = 5;

type Player = {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isJumping: boolean;
};

type Platform = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Coin = {
  x: number;
  y: number;
  collected: boolean;
};

export default function MarioGame({ isPlaying = true }: { isPlaying?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const playerRef = useRef<Player>({
    x: 50,
    y: 350,
    width: 30,
    height: 40,
    velocityY: 0,
    isJumping: false,
  });

  const platformsRef = useRef<Platform[]>([
    { x: 0, y: 450, width: 400, height: 50 }, // Ground
    { x: 100, y: 380, width: 80, height: 15 },
    { x: 220, y: 320, width: 80, height: 15 },
    { x: 80, y: 260, width: 100, height: 15 },
    { x: 250, y: 200, width: 100, height: 15 },
    { x: 120, y: 140, width: 120, height: 15 },
  ]);

  const coinsRef = useRef<Coin[]>([
    { x: 130, y: 350, collected: false },
    { x: 250, y: 290, collected: false },
    { x: 110, y: 230, collected: false },
    { x: 280, y: 170, collected: false },
    { x: 150, y: 110, collected: false },
  ]);

  const keysRef = useRef<Set<string>>(new Set());

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sky background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw platforms
    platformsRef.current.forEach(platform => {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      
      // Add grass on top
      if (platform.y > 0) {
        ctx.fillStyle = '#228B22';
        ctx.fillRect(platform.x, platform.y - 3, platform.width, 3);
      }
    });

    // Draw coins
    coinsRef.current.forEach(coin => {
      if (!coin.collected) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw player (Mario-style)
    const player = playerRef.current;
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Hat
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(player.x - 2, player.y, player.width + 4, 8);
    
    // Face
    ctx.fillStyle = '#FFD8A8';
    ctx.fillRect(player.x + 5, player.y + 8, player.width - 10, 15);
    
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(player.x + 8, player.y + 12, 4, 4);
    ctx.fillRect(player.x + 18, player.y + 12, 4, 4);
  }, []);

  const checkCollision = useCallback((player: Player, platform: Platform): boolean => {
    return (
      player.x < platform.x + platform.width &&
      player.x + player.width > platform.x &&
      player.y < platform.y + platform.height &&
      player.y + player.height > platform.y
    );
  }, []);

  const gameLoop = useCallback(() => {
    if (isPaused || gameOver) return;

    const player = playerRef.current;
    const platforms = platformsRef.current;
    const coins = coinsRef.current;

    // Handle input
    if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a')) {
      player.x = Math.max(0, player.x - MOVE_SPEED);
    }
    if (keysRef.current.has('ArrowRight') || keysRef.current.has('d')) {
      player.x = Math.min(CANVAS_WIDTH - player.width, player.x + MOVE_SPEED);
    }

    // Apply gravity
    player.velocityY += GRAVITY;
    player.y += player.velocityY;

    // Check platform collisions
    player.isJumping = true;
    platforms.forEach(platform => {
      if (checkCollision(player, platform)) {
        if (player.velocityY > 0) {
          // Landing on top
          player.y = platform.y - player.height;
          player.velocityY = 0;
          player.isJumping = false;
        } else if (player.velocityY < 0) {
          // Hitting from below
          player.y = platform.y + platform.height;
          player.velocityY = 0;
        }
      }
    });

    // Check coin collection
    coins.forEach(coin => {
      if (!coin.collected) {
        const dist = Math.sqrt(
          Math.pow(player.x + player.width / 2 - coin.x, 2) +
          Math.pow(player.y + player.height / 2 - coin.y, 2)
        );
        if (dist < 20) {
          coin.collected = true;
          setScore(s => s + 10);
        }
      }
    });

    // Check if all coins collected
    if (coins.every(coin => coin.collected)) {
      setGameOver(true);
    }

    // Fall off screen
    if (player.y > CANVAS_HEIGHT) {
      setGameOver(true);
    }

    draw();
  }, [isPaused, gameOver, checkCollision, draw]);

  const jump = useCallback(() => {
    const player = playerRef.current;
    if (!player.isJumping) {
      player.velocityY = JUMP_STRENGTH;
      player.isJumping = true;
    }
  }, []);

  const reset = useCallback(() => {
    playerRef.current = {
      x: 50,
      y: 350,
      width: 30,
      height: 40,
      velocityY: 0,
      isJumping: false,
    };
    coinsRef.current.forEach(coin => coin.collected = false);
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      keysRef.current.add(e.key.toLowerCase());

      if (e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        e.preventDefault();
        jump();
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsPaused(p => !p);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [jump, gameOver]);

  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      gameLoop();
      if (isPlaying && !gameOver && !isPaused) {
        animationId = requestAnimationFrame(animate);
      }
    };

    if (isPlaying && !gameOver && !isPaused) {
      animationId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [gameLoop, isPlaying, gameOver, isPaused]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center gap-4 bg-gray-900 p-4 rounded-lg">
      <div className="text-white text-center">
        <h3 className="text-xl font-bold mb-2">🍄 Super Jump</h3>
        <p className="text-2xl font-mono mb-2">Coins: {score / 10}/5</p>
        {isPaused && <p className="text-yellow-400 font-bold">PAUSED</p>}
        {gameOver && (
          <p className="text-green-400 font-bold">
            {score === 50 ? 'YOU WON! 🎉' : 'GAME OVER'}
          </p>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-4 border-gray-700"
      />

      <div className="text-xs text-gray-400 text-center space-y-1">
        <p>← → or A D to move</p>
        <p>Space or ↑ or W to jump</p>
        <p>P to pause</p>
        <p className="text-yellow-300 mt-2">Collect all 5 coins to win!</p>
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

