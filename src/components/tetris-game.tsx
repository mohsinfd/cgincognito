'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 25;
const COLORS = [
  '#000000', // Empty
  '#FF0D72', // I
  '#0DC2FF', // J
  '#0DFF72', // L
  '#F538FF', // O
  '#FF8E0D', // S
  '#FFE138', // T
  '#3877FF', // Z
];

// Tetromino shapes
const SHAPES = [
  [[1, 1, 1, 1]], // I
  [[2, 0, 0], [2, 2, 2]], // J
  [[0, 0, 3], [3, 3, 3]], // L
  [[4, 4], [4, 4]], // O
  [[0, 5, 5], [5, 5, 0]], // S
  [[0, 6, 0], [6, 6, 6]], // T
  [[7, 7, 0], [0, 7, 7]], // Z
];

type Board = number[][];
type Piece = {
  shape: number[][];
  x: number;
  y: number;
};

export default function TetrisGame({ isPlaying = true }: { isPlaying?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const boardRef = useRef<Board>(createBoard());
  const currentPieceRef = useRef<Piece | null>(null);
  const dropIntervalRef = useRef<NodeJS.Timeout | null>(null);

  function createBoard(): Board {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function randomPiece(): Piece {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    return {
      shape: shape.map(row => [...row]),
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw board
    const board = boardRef.current;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const value = board[y][x];
        if (value > 0) {
          ctx.fillStyle = COLORS[value];
          ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
        }
      }
    }

    // Draw current piece
    const piece = currentPieceRef.current;
    if (piece) {
      ctx.fillStyle = COLORS[piece.shape[0].find(v => v > 0) || 1];
      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x] > 0) {
            ctx.fillRect(
              (piece.x + x) * BLOCK_SIZE,
              (piece.y + y) * BLOCK_SIZE,
              BLOCK_SIZE - 1,
              BLOCK_SIZE - 1
            );
          }
        }
      }
    }

    // Draw grid
    ctx.strokeStyle = '#16213e';
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * BLOCK_SIZE);
      ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
      ctx.stroke();
    }
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * BLOCK_SIZE, 0);
      ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      ctx.stroke();
    }
  }, []);

  const collides = useCallback((piece: Piece, offsetX = 0, offsetY = 0): boolean => {
    const board = boardRef.current;
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] > 0) {
          const newX = piece.x + x + offsetX;
          const newY = piece.y + y + offsetY;
          
          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }
          if (newY >= 0 && board[newY][newX] > 0) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  const merge = useCallback(() => {
    const board = boardRef.current;
    const piece = currentPieceRef.current;
    if (!piece) return;

    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] > 0) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            board[boardY][boardX] = piece.shape[y][x];
          }
        }
      }
    }
  }, []);

  const clearLines = useCallback(() => {
    const board = boardRef.current;
    let linesCleared = 0;

    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every(cell => cell > 0)) {
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(0));
        linesCleared++;
        y++; // Check same row again
      }
    }

    if (linesCleared > 0) {
      setScore(s => s + linesCleared * 100);
    }
  }, []);

  const drop = useCallback(() => {
    if (isPaused || gameOver) return;
    
    const piece = currentPieceRef.current;
    if (!piece) {
      currentPieceRef.current = randomPiece();
      if (collides(currentPieceRef.current)) {
        setGameOver(true);
        return;
      }
      return;
    }

    if (!collides(piece, 0, 1)) {
      piece.y++;
    } else {
      merge();
      clearLines();
      currentPieceRef.current = randomPiece();
      if (collides(currentPieceRef.current)) {
        setGameOver(true);
      }
    }
    draw();
  }, [collides, merge, clearLines, draw, isPaused, gameOver]);

  const move = useCallback((dir: number) => {
    const piece = currentPieceRef.current;
    if (!piece || isPaused || gameOver) return;

    if (!collides(piece, dir, 0)) {
      piece.x += dir;
      draw();
    }
  }, [collides, draw, isPaused, gameOver]);

  const rotate = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || isPaused || gameOver) return;

    const rotated = piece.shape[0].map((_, i) =>
      piece.shape.map(row => row[i]).reverse()
    );
    const rotatedPiece = { ...piece, shape: rotated };

    if (!collides(rotatedPiece)) {
      currentPieceRef.current = rotatedPiece;
      draw();
    }
  }, [collides, draw, isPaused, gameOver]);

  const hardDrop = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || isPaused || gameOver) return;

    while (!collides(piece, 0, 1)) {
      piece.y++;
    }
    merge();
    clearLines();
    currentPieceRef.current = randomPiece();
    if (collides(currentPieceRef.current)) {
      setGameOver(true);
    }
    draw();
  }, [collides, merge, clearLines, draw, isPaused, gameOver]);

  const reset = useCallback(() => {
    boardRef.current = createBoard();
    currentPieceRef.current = randomPiece();
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          move(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          move(1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          drop();
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotate();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
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
  }, [move, drop, rotate, hardDrop, gameOver]);

  useEffect(() => {
    if (isPlaying && !gameOver && !isPaused) {
      dropIntervalRef.current = setInterval(drop, 500);
    }
    return () => {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
      }
    };
  }, [drop, isPlaying, gameOver, isPaused]);

  useEffect(() => {
    if (!currentPieceRef.current) {
      currentPieceRef.current = randomPiece();
    }
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center gap-4 bg-gray-900 p-4 rounded-lg">
      <div className="text-white text-center">
        <h3 className="text-xl font-bold mb-2">🎮 Tetris</h3>
        <p className="text-2xl font-mono mb-2">Score: {score}</p>
        {isPaused && <p className="text-yellow-400 font-bold">PAUSED</p>}
        {gameOver && <p className="text-red-400 font-bold">GAME OVER</p>}
      </div>

      <canvas
        ref={canvasRef}
        width={COLS * BLOCK_SIZE}
        height={ROWS * BLOCK_SIZE}
        className="border-4 border-gray-700"
      />

      <div className="text-xs text-gray-400 text-center space-y-1">
        <p>← → Move | ↑ Rotate</p>
        <p>↓ Soft Drop | Space Hard Drop</p>
        <p>P Pause</p>
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

