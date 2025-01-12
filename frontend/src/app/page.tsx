// app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      router.push(`/game/${roomId}`);
    }
  };

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substr(2, 9);
    router.push(`/game/${newRoomId}`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <Card className="w-[400px] bg-gray-800 text-white">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Multiplayer Pong Game
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="bg-gray-700 border-gray-600"
            />
            <Button
              onClick={handleJoinRoom}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              Join Room
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-800 px-2 text-gray-400">or</span>
            </div>
          </div>
          <Button
            onClick={handleCreateRoom}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            Create New Room
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
