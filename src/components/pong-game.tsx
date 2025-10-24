'use client';

import React, { useEffect, useRef, useState } from 'react';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Ball extends GameObject {
  dx: number;
  dy: number;
}

export default function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver'>('playing');
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  
  const gameRef = useRef({
    player: { x: 0, y: 0, width: 15, height: 80 },
    ai: { x: 0, y: 0, width: 15, height: 80 },
    ball: { x: 0, y: 0, width: 15, height: 15, dx: 0, dy: 0 } as Ball,
    keys: { up: false, down: false },
    aiSpeed: 3
  });

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 300;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize game
    const game = gameRef.current;
    
    const resetGame = () => {
      game.player.x = 20;
      game.player.y = CANVAS_HEIGHT / 2 - game.player.height / 2;
      game.ai.x = CANVAS_WIDTH - 20 - game.ai.width;
      game.ai.y = CANVAS_HEIGHT / 2 - game.ai.height / 2;
      game.ball.x = CANVAS_WIDTH / 2 - game.ball.width / 2;
      game.ball.y = CANVAS_HEIGHT / 2 - game.ball.height / 2;
      game.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
      game.ball.dy = (Math.random() - 0.5) * 4;
    };

    resetGame();

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          game.keys.up = true;
          break;
        case 'ArrowDown':
          game.keys.down = true;
          break;
        case 'p':
        case 'P':
          setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
          break;
        case 'r':
        case 'R':
          setPlayerScore(0);
          setAiScore(0);
          setGameState('playing');
          resetGame();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          game.keys.up = false;
          break;
        case 'ArrowDown':
          game.keys.down = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const gameLoop = () => {
      if (gameState === 'paused') {
        requestAnimationFrame(gameLoop);
        return;
      }

      if (gameState === 'gameOver') {
        // Draw game over screen
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '16px Arial';
        ctx.fillText(`Final Score: ${playerScore} - ${aiScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
        ctx.fillText('Press R to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
        requestAnimationFrame(gameLoop);
        return;
      }

      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Move player
      if (game.keys.up && game.player.y > 0) {
        game.player.y -= 5;
      }
      if (game.keys.down && game.player.y < CANVAS_HEIGHT - game.player.height) {
        game.player.y += 5;
      }

      // Move AI (simple follow ball)
      if (game.ball.y < game.ai.y + game.ai.height / 2 && game.ai.y > 0) {
        game.ai.y -= game.aiSpeed;
      }
      if (game.ball.y > game.ai.y + game.ai.height / 2 && game.ai.y < CANVAS_HEIGHT - game.ai.height) {
        game.ai.y += game.aiSpeed;
      }

      // Move ball
      game.ball.x += game.ball.dx;
      game.ball.y += game.ball.dy;

      // Ball collision with top/bottom walls
      if (game.ball.y <= 0 || game.ball.y >= CANVAS_HEIGHT - game.ball.height) {
        game.ball.dy = -game.ball.dy;
      }

      // Ball collision with paddles
      // Player paddle
      if (game.ball.x <= game.player.x + game.player.width &&
          game.ball.x + game.ball.width >= game.player.x &&
          game.ball.y <= game.player.y + game.player.height &&
          game.ball.y + game.ball.height >= game.player.y) {
        game.ball.dx = Math.abs(game.ball.dx);
        // Add some spin based on where ball hits paddle
        const hitPos = (game.ball.y - game.player.y) / game.player.height;
        game.ball.dy = (hitPos - 0.5) * 8;
      }

      // AI paddle
      if (game.ball.x + game.ball.width >= game.ai.x &&
          game.ball.x <= game.ai.x + game.ai.width &&
          game.ball.y <= game.ai.y + game.ai.height &&
          game.ball.y + game.ball.height >= game.ai.y) {
        game.ball.dx = -Math.abs(game.ball.dx);
        // Add some spin based on where ball hits paddle
        const hitPos = (game.ball.y - game.ai.y) / game.ai.height;
        game.ball.dy = (hitPos - 0.5) * 8;
      }

      // Score points
      if (game.ball.x < 0) {
        setAiScore(prev => {
          const newScore = prev + 1;
          if (newScore >= 5) {
            setGameState('gameOver');
          }
          return newScore;
        });
        resetGame();
      }
      if (game.ball.x > CANVAS_WIDTH) {
        setPlayerScore(prev => {
          const newScore = prev + 1;
          if (newScore >= 5) {
            setGameState('gameOver');
          }
          return newScore;
        });
        resetGame();
      }

      // Draw center line
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw player paddle
      ctx.fillStyle = '#0f0';
      ctx.fillRect(game.player.x, game.player.y, game.player.width, game.player.height);

      // Draw AI paddle
      ctx.fillStyle = '#f00';
      ctx.fillRect(game.ai.x, game.ai.y, game.ai.width, game.ai.height);

      // Draw ball
      ctx.fillStyle = '#fff';
      ctx.fillRect(game.ball.x, game.ball.y, game.ball.width, game.ball.height);

      // Draw score
      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${playerScore}`, CANVAS_WIDTH / 4, 40);
      ctx.fillText(`${aiScore}`, 3 * CANVAS_WIDTH / 4, 40);

      // Draw UI
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Player: ${playerScore}`, 10, CANVAS_HEIGHT - 20);
      ctx.textAlign = 'right';
      ctx.fillText(`AI: ${aiScore}`, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 20);

      if (gameState === 'paused') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '16px Arial';
        ctx.fillText('Press P to resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
      }

      requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, playerScore, aiScore]);

  return (
    <div className="pong-game">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-2">Pong</h3>
        <div className="text-sm text-gray-300 space-y-1">
          <p>🎮 <strong>Controls:</strong></p>
          <p>↑ ↓ Move paddle</p>
          <p>P Pause/Resume</p>
          <p>R Restart</p>
          <p>First to 5 points wins!</p>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-gray-600 bg-black rounded"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
