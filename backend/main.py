from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Set
from dataclasses import dataclass
import json
import random
import asyncio

app = FastAPI()

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # NextJS default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@dataclass
class GameState:
    # Constants
    CANVAS_WIDTH = 800
    CANVAS_HEIGHT = 600
    PADDLE_HEIGHT = 100
    PADDLE_WIDTH = 20
    BALL_SIZE = 10
    OBSTACLE_SIZE = 30
    
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.players = set()
        self.ball = {
            "x": self.CANVAS_WIDTH // 2,
            "y": self.CANVAS_HEIGHT // 2,
            "dx": 5,
            "dy": 5
        }
        self.paddles = {
            "player1": {"x": 50, "y": self.CANVAS_HEIGHT // 2},
            "player2": {"x": self.CANVAS_WIDTH - 50, "y": self.CANVAS_HEIGHT // 2}
        }
        self.scores = {"player1": 0, "player2": 0}
        self.obstacles = self.generate_obstacles()
        self.is_active = False

    def generate_obstacles(self):
        obstacles = []
        for _ in range(2):
            while True:
                x = random.randint(200, self.CANVAS_WIDTH - 200)
                y = random.randint(100, self.CANVAS_HEIGHT - 100)
                # Ensure obstacles don't overlap with center
                if abs(x - self.CANVAS_WIDTH/2) > 100 or abs(y - self.CANVAS_HEIGHT/2) > 100:
                    obstacles.append({"x": x, "y": y, "size": self.OBSTACLE_SIZE})
                    break
        return obstacles

    def to_dict(self):
        return {
            "ball": self.ball,
            "paddles": self.paddles,
            "scores": self.scores,
            "obstacles": self.obstacles,
            "is_active": self.is_active,
            "players": list(self.players)
        }

# Game rooms storage
game_rooms: Dict[str, GameState] = {}
connections: Dict[str, Dict[str, WebSocket]] = {}

async def broadcast_game_state(room_id: str):
    if room_id in game_rooms and room_id in connections:
        game_state = game_rooms[room_id]
        state_data = {
            "type": "game_state",
            "state": game_state.to_dict()
        }
        
        for connection in connections[room_id].values():
            try:
                await connection.send_json(state_data)
            except:
                continue

async def game_loop(room_id: str):
    game_state = game_rooms[room_id]
    
    while room_id in game_rooms:
        if game_state.is_active:
            # Update ball position
            game_state.ball["x"] += game_state.ball["dx"]
            game_state.ball["y"] += game_state.ball["dy"]
            
            # Ball collision with top and bottom walls
            if game_state.ball["y"] <= 0 or game_state.ball["y"] >= game_state.CANVAS_HEIGHT:
                game_state.ball["dy"] *= -1
            
            # Ball collision with paddles
            for player, paddle in game_state.paddles.items():
                if (abs(game_state.ball["x"] - paddle["x"]) < game_state.PADDLE_WIDTH and
                    paddle["y"] <= game_state.ball["y"] <= paddle["y"] + game_state.PADDLE_HEIGHT):
                    game_state.ball["dx"] *= -1
            
            # Ball collision with obstacles
            for obstacle in game_state.obstacles:
                if (abs(game_state.ball["x"] - obstacle["x"]) < obstacle["size"] and
                    abs(game_state.ball["y"] - obstacle["y"]) < obstacle["size"]):
                    game_state.ball["dx"] *= -1
                    game_state.ball["dy"] *= -1
            
            # Scoring
            if game_state.ball["x"] <= 0:
                game_state.scores["player2"] += 1
                game_state.ball = {
                    "x": game_state.CANVAS_WIDTH // 2,
                    "y": game_state.CANVAS_HEIGHT // 2,
                    "dx": 5,
                    "dy": 5
                }
            elif game_state.ball["x"] >= game_state.CANVAS_WIDTH:
                game_state.scores["player1"] += 1
                game_state.ball = {
                    "x": game_state.CANVAS_WIDTH // 2,
                    "y": game_state.CANVAS_HEIGHT // 2,
                    "dx": -5,
                    "dy": 5
                }
            
            await broadcast_game_state(room_id)
        
        await asyncio.sleep(1/60)  # 60 FPS

@app.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_id: str):
    await websocket.accept()
    print(f"Player {player_id} connected to room {room_id}")
    
    # Create new game room if it doesn't exist
    if room_id not in game_rooms:
        game_rooms[room_id] = GameState(room_id)
        connections[room_id] = {}
        # Start the game loop for this room
        asyncio.create_task(game_loop(room_id))
    
    game_state = game_rooms[room_id]
    
    try:
        # Add player to the game
        game_state.players.add(player_id)
        connections[room_id][player_id] = websocket
        
        # Start game if two players are connected
        if len(game_state.players) == 2:
            game_state.is_active = True
            print(f"Game started in room {room_id}")
            
        # Broadcast initial state
        await broadcast_game_state(room_id)
        
        while True:
            data = await websocket.receive_json()
            print(f"Received data from {player_id}: {data}")  # Debug log
            
            if data["type"] == "paddle_move":
                player = data["player"]
                new_y = data["y"]
                print(f"Moving paddle for {player} to {new_y}")  # Debug log
                
                # Validate paddle movement
                if 0 <= new_y <= game_state.CANVAS_HEIGHT - game_state.PADDLE_HEIGHT:
                    game_state.paddles[player]["y"] = new_y
                    await broadcast_game_state(room_id)
                    
            elif data["type"] == "start_game":
                game_state.is_active = True
                print(f"Game started manually in room {room_id}")
                await broadcast_game_state(room_id)
                
    except WebSocketDisconnect:
        print(f"Player {player_id} disconnected from room {room_id}")
        # Handle disconnection
        game_state.players.remove(player_id)
        connections[room_id].pop(player_id, None)
        game_state.is_active = False
        
        if len(game_state.players) == 0:
            # Clean up empty room
            game_rooms.pop(room_id, None)
            connections.pop(room_id, None)
        else:
            await broadcast_game_state(room_id)

@app.on_event("startup")
async def startup_event():
    pass  # We'll handle game loop creation when rooms are created