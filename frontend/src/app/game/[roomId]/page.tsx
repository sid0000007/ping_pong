// // app/game/[roomId]/page.tsx
// "use client";

// import { useEffect, useRef, useState } from "react";
// import { useParams } from "next/navigation";
// import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";

// interface GameState {
//   ball: {
//     x: number;
//     y: number;
//     dx: number;
//     dy: number;
//   };
//   paddles: {
//     player1: { x: number; y: number };
//     player2: { x: number; y: number };
//   };
//   scores: {
//     player1: number;
//     player2: number;
//   };
//   obstacles: Array<{
//     x: number;
//     y: number;
//     size: number;
//   }>;
//   is_active: boolean;
//   players: string[];
// }

// export default function Game() {
//   const params = useParams();
//   const roomId = params.roomId as string;
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const wsRef = useRef<WebSocket | null>(null);
//   const [gameState, setGameState] = useState<GameState | null>(null);
//   const [playerId, setPlayerId] = useState<string>("");
//   const [isConnected, setIsConnected] = useState(false);

//   // Constants
//   const CANVAS_WIDTH = 800;
//   const CANVAS_HEIGHT = 600;
//   const PADDLE_HEIGHT = 100;
//   const PADDLE_WIDTH = 20;

//   const [paddleY, setPaddleY] = useState(CANVAS_HEIGHT / 2);

//   useEffect(() => {
//     // Generate a random player ID
//     setPlayerId(`player_${Math.random().toString(36).substr(2, 9)}`);
//   }, []);

//   useEffect(() => {
//     if (!playerId) return;

//     // Connect to WebSocket
//     const ws = new WebSocket(`ws://localhost:8000/ws/${roomId}/${playerId}`);
//     wsRef.current = ws;

//     ws.onopen = () => {
//       setIsConnected(true);
//       console.log("Connected to game server");
//     };

//     ws.onmessage = (event) => {
//       const data = JSON.parse(event.data);
//       if (data.type === "game_state") {
//         setGameState(data.state);
//         // Update local paddle position if we're player 2
//         if (playerId === data.state.players[1]) {
//           setPaddleY(data.state.paddles.player2.y);
//         } else if (playerId === data.state.players[0]) {
//           setPaddleY(data.state.paddles.player1.y);
//         }
//       }
//     };

//     // Handle keyboard input
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if (!wsRef.current || !gameState) return;

//       let newY = paddleY;
//       const moveAmount = 20;

//       if (e.key === "ArrowUp") {
//         newY = Math.max(0, paddleY - moveAmount);
//         setPaddleY(newY);
//       } else if (e.key === "ArrowDown") {
//         newY = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, paddleY + moveAmount);
//         setPaddleY(newY);
//       } else {
//         return; // Don't send update for other keys
//       }

//       const player = gameState.players[0] === playerId ? "player1" : "player2";
//       console.log(`Sending paddle move: ${player} to ${newY}`); // Debug log

//       wsRef.current.send(
//         JSON.stringify({
//           type: "paddle_move",
//           player,
//           y: newY,
//         })
//       );
//     };

//     // Add both keydown and keyup event listeners
//     window.addEventListener("keydown", handleKeyDown);

//     return () => {
//       ws.close();
//       window.removeEventListener("keydown", handleKeyDown);
//     };
//   }, [playerId, roomId, paddleY]); // Add paddleY to dependencies

//   // Update the canvas rendering
//   useEffect(() => {
//     if (!canvasRef.current || !gameState) return;

//     const ctx = canvasRef.current.getContext("2d");
//     if (!ctx) return;

//     // Clear canvas
//     ctx.fillStyle = "#000";
//     ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

//     // Draw paddles
//     ctx.fillStyle = "#fff";
//     Object.values(gameState.paddles).forEach((paddle) => {
//       ctx.fillRect(paddle.x, paddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
//     });

//     // Draw ball
//     if (gameState.ball) {
//       ctx.beginPath();
//       ctx.arc(gameState.ball.x, gameState.ball.y, 10, 0, Math.PI * 2);
//       ctx.fill();
//     }

//     // Draw obstacles
//     ctx.fillStyle = "#ff4444";
//     gameState.obstacles.forEach((obstacle) => {
//       ctx.fillRect(
//         obstacle.x - obstacle.size / 2,
//         obstacle.y - obstacle.size / 2,
//         obstacle.size,
//         obstacle.size
//       );
//     });
//   }, [gameState]);

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
//       <Card className="p-6 bg-gray-800 text-white">
//         <div className="text-center mb-4">
//           <h1 className="text-2xl font-bold mb-2">Pong Game - Room {roomId}</h1>
//           <div className="text-xl mb-4">
//             {gameState && (
//               <div className="flex justify-center gap-8">
//                 <span>Player 1: {gameState.scores.player1}</span>
//                 <span>Player 2: {gameState.scores.player2}</span>
//               </div>
//             )}
//           </div>
//         </div>

//         <canvas
//           ref={canvasRef}
//           width={CANVAS_WIDTH}
//           height={CANVAS_HEIGHT}
//           className="border border-gray-600 bg-black"
//         />

//         <div className="mt-4 text-center">
//           {!gameState?.is_active && (
//             <Button
//               onClick={() => {
//                 wsRef.current?.send(JSON.stringify({ type: "start_game" }));
//               }}
//               className="bg-blue-500 hover:bg-blue-600"
//             >
//               Start Game
//             </Button>
//           )}
//           <div className="mt-2 text-sm">
//             {isConnected ? (
//               <span className="text-green-500">Connected as {playerId}</span>
//             ) : (
//               <span className="text-red-500">Disconnected</span>
//             )}
//           </div>
//         </div>
//       </Card>
//     </div>
//   );
// }

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

  // Constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const PADDLE_HEIGHT = 100;
  const PADDLE_WIDTH = 20;
  const MOVE_AMOUNT = 20;

  // Add refs with proper type initialization
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const paddleYRef = useRef<number>(CANVAS_HEIGHT / 2);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setPlayerId(`player_${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  // Handle continuous paddle movement
  const updatePaddlePosition = () => {
    if (!wsRef.current || !gameState) return;

    let newY = paddleYRef.current;

    if (keysPressedRef.current["ArrowUp"]) {
      newY = Math.max(0, newY - MOVE_AMOUNT);
    }
    if (keysPressedRef.current["ArrowDown"]) {
      newY = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newY + MOVE_AMOUNT);
    }

    if (newY !== paddleYRef.current) {
      paddleYRef.current = newY;
      const player = gameState.players[0] === playerId ? "player1" : "player2";

      wsRef.current.send(
        JSON.stringify({
          type: "paddle_move",
          player,
          y: newY,
        })
      );
    }

    // Store the animation frame ID
    animationFrameRef.current =
      window.requestAnimationFrame(updatePaddlePosition);
  };

  useEffect(() => {
    if (!playerId) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/${roomId}/${playerId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log("Connected to game server");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "game_state") {
        setGameState(data.state);
        // Update paddle position reference
        if (playerId === data.state.players[1]) {
          paddleYRef.current = data.state.paddles.player2.y;
        } else if (playerId === data.state.players[0]) {
          paddleYRef.current = data.state.paddles.player1.y;
        }
      }
    };

    // Handle keyboard events
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault(); // Prevent page scrolling
        keysPressedRef.current[e.key] = true;
        if (!animationFrameRef.current) {
          animationFrameRef.current =
            window.requestAnimationFrame(updatePaddlePosition);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        keysPressedRef.current[e.key] = false;
        // If no keys are pressed, cancel the animation frame
        if (
          !keysPressedRef.current["ArrowUp"] &&
          !keysPressedRef.current["ArrowDown"]
        ) {
          if (animationFrameRef.current) {
            window.cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      ws.close();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [playerId, roomId]);

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
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border border-gray-600 bg-black"
          tabIndex={0}
        />

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
