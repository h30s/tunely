"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface JoinRoomFormProps {
  userId: string;
}

export function JoinRoomForm({ userId }: JoinRoomFormProps) {
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setErrorMessage(null);
    
    if (!roomCode.trim()) {
      toast({
        title: "Room code required",
        description: "Please enter a valid room code",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const formattedCode = roomCode.trim().toUpperCase();
      
      // Use server-side API endpoint to join the room
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: formattedCode,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        let errorMsg = data.error || 'Failed to join room';
        
        // Handle specific error cases
        if (response.status === 404) {
          errorMsg = 'Room not found. Please check the room code and try again.';
        } else if (response.status === 403) {
          errorMsg = data.error || 'You cannot join this room.';
        }
        
        setErrorMessage(errorMsg);
        toast({
          title: "Error joining room",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }
      
      // Redirect to room
      toast({
        title: "Success!",
        description: "Joining room...",
      });
      router.push(`/room/${formattedCode}`);
    } catch (error) {
      console.error("Error joining room:", error);
      setErrorMessage("Network error. Please check your connection and try again.");
      toast({
        title: "Connection error",
        description: "Please check your internet connection and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleJoinRoom} className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Enter Room Code</h3>
          <p className="text-sm text-muted-foreground">
            Enter the 6-character code provided by the room host.
          </p>
        </div>
        
        <div className="space-y-4">
          <Input
            placeholder="Enter room code (e.g. ABC123)"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="text-center uppercase"
            maxLength={6}
            aria-invalid={errorMessage ? "true" : "false"}
          />
          
          {errorMessage && (
            <p className="text-sm text-red-500">{errorMessage}</p>
          )}
          
          <Button 
            type="submit" 
            disabled={isLoading || !roomCode.trim()} 
            className="w-full"
          >
            {isLoading ? "Joining..." : "Join Room"}
          </Button>
        </div>
      </form>
    </Card>
  );
}