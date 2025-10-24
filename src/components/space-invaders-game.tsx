'use client';

import React, { useEffect, useRef, useState } from 'react';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Bullet extends GameObject {
  active: boolean;
}

interface Enemy extends GameObject {
  active: boolean;
}

export default function SpaceInvadersGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver'>('playing');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  
  const gameRef = useRef({
    player: { x: 0, y: 0, width: 40, height: 20 },
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    lastShot: 0,
    enemyDirection: 1,
    enemySpeed: 1,
    lastEnemyMove: 0,
    keys: { left: false, right: false, space: false }
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
    game.player.x = CANVAS_WIDTH / 2 - game.player.width / 2;
    game.player.y = CANVAS_HEIGHT - game.player.height - 10;

    // Create enemies
    const createEnemies = () => {
      game.enemies = [];
      const rows = 4;
      const cols = 8;
      const enemyWidth = 25;
      const enemyHeight = 20;
      const spacing = 5;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          game.enemies.push({
            x: col * (enemyWidth + spacing) + 50,
            y: row * (enemyHeight + spacing) + 50,
            width: enemyWidth,
            height: enemyHeight,
            active: true
          });
        }
      }
    };

    createEnemies();

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          game.keys.left = true;
          break;
        case 'ArrowRight':
          game.keys.right = true;
          break;
        case ' ':
          e.preventDefault();
          game.keys.space = true;
          break;
        case 'p':
        case 'P':
          setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          game.keys.left = false;
          break;
        case 'ArrowRight':
          game.keys.right = false;
          break;
        case ' ':
          game.keys.space = false;
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
        ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
        ctx.fillText('Press R to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
        requestAnimationFrame(gameLoop);
        return;
      }

      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Move player
      if (game.keys.left && game.player.x > 0) {
        game.player.x -= 5;
      }
      if (game.keys.right && game.player.x < CANVAS_WIDTH - game.player.width) {
        game.player.x += 5;
      }

      // Shoot bullets
      const now = Date.now();
      if (game.keys.space && now - game.lastShot > 200) {
        game.bullets.push({
          x: game.player.x + game.player.width / 2 - 2,
          y: game.player.y,
          width: 4,
          height: 10,
          active: true
        });
        game.lastShot = now;
      }

      // Move bullets
      game.bullets = game.bullets.filter(bullet => {
        bullet.y -= 8;
        return bullet.y > -bullet.height && bullet.active;
      });

      // Move enemies
      if (now - game.lastEnemyMove > 500) {
        let shouldMoveDown = false;
        
        game.enemies.forEach(enemy => {
          if (enemy.active) {
            enemy.x += game.enemyDirection * game.enemySpeed;
            if (enemy.x <= 0 || enemy.x >= CANVAS_WIDTH - enemy.width) {
              shouldMoveDown = true;
            }
          }
        });

        if (shouldMoveDown) {
          game.enemyDirection *= -1;
          game.enemies.forEach(enemy => {
            if (enemy.active) {
              enemy.y += 20;
            }
          });
        }

        game.lastEnemyMove = now;
      }

      // Check bullet-enemy collisions
      game.bullets.forEach(bullet => {
        game.enemies.forEach(enemy => {
          if (bullet.active && enemy.active &&
              bullet.x < enemy.x + enemy.width &&
              bullet.x + bullet.width > enemy.x &&
              bullet.y < enemy.y + enemy.height &&
              bullet.y + bullet.height > enemy.y) {
            bullet.active = false;
            enemy.active = false;
            setScore(prev => prev + 10);
          }
        });
      });

      // Check if enemies reached player
      const activeEnemies = game.enemies.filter(enemy => enemy.active);
      if (activeEnemies.some(enemy => enemy.y + enemy.height >= game.player.y)) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameState('gameOver');
          }
          return newLives;
        });
      }

      // Check if all enemies destroyed
      if (activeEnemies.length === 0) {
        setLevel(prev => prev + 1);
        setScore(prev => prev + 100);
        game.enemySpeed += 0.5;
        createEnemies();
      }

      // Draw player
      ctx.fillStyle = '#0f0';
      ctx.fillRect(game.player.x, game.player.y, game.player.width, game.player.height);

      // Draw bullets
      ctx.fillStyle = '#ff0';
      game.bullets.forEach(bullet => {
        if (bullet.active) {
          ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
      });

      // Draw enemies
      ctx.fillStyle = '#f00';
      game.enemies.forEach(enemy => {
        if (enemy.active) {
          ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
      });

      // Draw UI
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 10, 25);
      ctx.fillText(`Lives: ${lives}`, 10, 45);
      ctx.fillText(`Level: ${level}`, 10, 65);

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

    const handleRestart = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setScore(0);
        setLives(3);
        setLevel(1);
        setGameState('playing');
        game.enemySpeed = 1;
        createEnemies();
        game.bullets = [];
        game.player.x = CANVAS_WIDTH / 2 - game.player.width / 2;
        game.player.y = CANVAS_HEIGHT - game.player.height - 10;
      }
    };

    window.addEventListener('keydown', handleRestart);
    gameLoop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleRestart);
    };
  }, [gameState, score, lives, level]);

  return (
    <div className="space-invaders-game">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-2">Space Invaders</h3>
        <div className="text-sm text-gray-300 space-y-1">
          <p>🎮 <strong>Controls:</strong></p>
          <p>← → Move ship</p>
          <p>Space Shoot</p>
          <p>P Pause/Resume</p>
          <p>R Restart (when game over)</p>
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
