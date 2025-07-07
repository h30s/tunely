"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface CreateRoomFormProps {
  userId: string;
}

export function CreateRoomForm({ userId }: CreateRoomFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const handleCreateRoom = async () => {
    try {
      setIsLoading(true);
      
      // Use a simple fetch to a server endpoint
      const response = await fetch("/api/rooms/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // No need to send userId anymore as the API will use the session
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create room");
      }
      
      toast({
        title: "Room created!",
        description: `Your room code is: ${data.roomCode}`,
      });
      
      // Redirect to room
      router.push(`/room/${data.roomCode}`);
    } catch (error: any) {
      console.error("Error creating room:", error);
      toast({
        title: "Error creating room",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Room Details</h3>
          <p className="text-sm text-muted-foreground">
            Create a new room with a randomly generated code.
            You'll be the host of this room and control playback.
          </p>
        </div>
        
        <Button 
          onClick={handleCreateRoom} 
          disabled={isLoading} 
          className="w-full"
        >
          {isLoading ? "Creating room..." : "Create Room"}
        </Button>
      </div>
    </Card>
  );
} 