"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GameState {
  ball: {
    x: number;
    y: number;
    dx: number;
    dy: number;
  };
  paddles: {
    player1: { x: number; y: number };
    player2: { x: number; y: number };
  };
  scores: {
    player1: number;
    player2: number;
  };
  obstacles: Array<{
    x: number;
    y: number;
    size: number;
  }>;
  is_active: boolean;
  players: string[];
}

export default function Game() {
  const params = useParams();
  const roomId = params.roomId as string;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<
    "player1" | "player2" | null
  >(null);

  // Constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const PADDLE_HEIGHT = 100;
  const PADDLE_WIDTH = 20;
  const MOVE_AMOUNT = 20;

  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const animationFrameRef = useRef<number | null>(null);
  const currentPaddlePosition = useRef<number>(CANVAS_HEIGHT / 2);
  const touchStartYRef = useRef<number | null>(null);
  const lastTouchYRef = useRef<number | null>(null);

  // Generate playerId only once when component mounts
  useEffect(() => {
    const generatedPlayerId = `player_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    setPlayerId(generatedPlayerId);
  }, []);

  // Determine current player as soon as we receive game state
  useEffect(() => {
    if (gameState && playerId) {
      const playerIndex = gameState.players.indexOf(playerId);
      if (playerIndex === 0) {
        setCurrentPlayer("player1");
        currentPaddlePosition.current = gameState.paddles.player1.y;
      } else if (playerIndex === 1) {
        setCurrentPlayer("player2");
        currentPaddlePosition.current = gameState.paddles.player2.y;
      }
    }
  }, [gameState, playerId]);

  const updatePaddlePosition = (newY: number) => {
    if (
      !wsRef.current ||
      !currentPlayer ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    // Ensure paddle stays within canvas bounds
    newY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newY));

    if (newY !== currentPaddlePosition.current) {
      currentPaddlePosition.current = newY;
      const message = {
        type: "paddle_move",
        player: currentPlayer,
        y: newY,
      };
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const handleKeyboardMovement = () => {
    if (!currentPlayer) return; // Early return if no player assigned

    let newY = currentPaddlePosition.current;
    let moved = false;

    if (keysPressedRef.current["ArrowUp"]) {
      newY = Math.max(0, newY - MOVE_AMOUNT);
      moved = true;
    }
    if (keysPressedRef.current["ArrowDown"]) {
      newY = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newY + MOVE_AMOUNT);
      moved = true;
    }

    if (moved) {
      updatePaddlePosition(newY);
    }

    animationFrameRef.current = requestAnimationFrame(handleKeyboardMovement);
  };

  // Touch event handlers
  const handleTouchStart = (e: TouchEvent) => {
    if (!currentPlayer) return; // Early return if no player assigned

    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleY = CANVAS_HEIGHT / rect.height;
    touchStartYRef.current = (touch.clientY - rect.top) * scaleY;
    lastTouchYRef.current = currentPaddlePosition.current;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!currentPlayer) return; // Early return if no player assigned

    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (
      !canvas ||
      touchStartYRef.current === null ||
      lastTouchYRef.current === null
    )
      return;

    const rect = canvas.getBoundingClientRect();
    const scaleY = CANVAS_HEIGHT / rect.height;
    const currentTouchY = (touch.clientY - rect.top) * scaleY;
    const deltaY = currentTouchY - touchStartYRef.current;

    const newY = lastTouchYRef.current + deltaY;
    updatePaddlePosition(newY);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    touchStartYRef.current = null;
    lastTouchYRef.current = null;
  };

  useEffect(() => {
    if (!playerId) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/${roomId}/${playerId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "game_state") {
        setGameState(data.state);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && currentPlayer) {
        e.preventDefault();
        keysPressedRef.current[e.key] = true;

        if (!animationFrameRef.current) {
          animationFrameRef.current = requestAnimationFrame(
            handleKeyboardMovement
          );
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        keysPressedRef.current[e.key] = false;

        if (
          !keysPressedRef.current["ArrowUp"] &&
          !keysPressedRef.current["ArrowDown"]
        ) {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
        }
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("touchstart", handleTouchStart);
      canvas.addEventListener("touchmove", handleTouchMove);
      canvas.addEventListener("touchend", handleTouchEnd);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      ws.close();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (canvas) {
        canvas.removeEventListener("touchstart", handleTouchStart);
        canvas.removeEventListener("touchmove", handleTouchMove);
        canvas.removeEventListener("touchend", handleTouchEnd);
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playerId, roomId, currentPlayer]); // Added currentPlayer to dependencies

  // Canvas rendering
  useEffect(() => {
    if (!canvasRef.current || !gameState) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = "#fff";
    Object.values(gameState.paddles).forEach((paddle) => {
      ctx.fillRect(paddle.x, paddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    });

    if (gameState.ball) {
      ctx.beginPath();
      ctx.arc(gameState.ball.x, gameState.ball.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#ff4444";
    gameState.obstacles.forEach((obstacle) => {
      ctx.fillRect(
        obstacle.x - obstacle.size / 2,
        obstacle.y - obstacle.size / 2,
        obstacle.size,
        obstacle.size
      );
    });
  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <Card className="p-6 bg-gray-800 text-white">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-2">Pong Game - Room {roomId}</h1>
          <div className="text-xl mb-4">
            {gameState && (
              <div className="flex justify-center gap-8">
                <span>Player 1: {gameState.scores.player1}</span>
                <span>Player 2: {gameState.scores.player2}</span>
              </div>
            )}
          </div>
          <div className="text-sm">
            {currentPlayer && <div>You are: {currentPlayer}</div>}
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border border-gray-600 bg-black focus:outline-none touch-none"
          tabIndex={0}
        />

        <div className="mt-4 text-center text-sm text-gray-400">
          Use arrow keys or touch/drag to control your paddle
        </div>

        <div className="mt-4 text-center">
          {!gameState?.is_active && (
            <Button
              onClick={() => {
                wsRef.current?.send(JSON.stringify({ type: "start_game" }));
              }}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Start Game
            </Button>
          )}
          <div className="mt-2 text-sm">
            {isConnected ? (
              <span className="text-green-500">Connected as {playerId}</span>
            ) : (
              <span className="text-red-500">Disconnected</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
