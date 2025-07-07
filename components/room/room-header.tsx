"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Room } from "@/lib/types";

interface RoomHeaderProps {
  room: Room;
  isHost: boolean;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onLeaveRoom: () => void;
}

export default function RoomHeader({ room, isHost, isPlaying, onPlayPause, onLeaveRoom }: RoomHeaderProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(room.id);
    toast({
      title: "Room code copied",
      description: "Share this code with friends to invite them",
    });
  };
  
  const handleLeaveRoom = async () => {
    try {
      setIsLeaving(true);
      // Call the onLeaveRoom prop function passed from the parent component
      onLeaveRoom();
    } catch (error) {
      console.error("Error leaving room:", error);
      toast({
        title: "Error leaving room",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLeaving(false);
    }
  };
  
  const handleCloseRoom = async () => {
    try {
      setIsClosing(true);
      const supabase = createSupabaseClient();
      
      // Emit a custom event to notify components to clean up
      window.dispatchEvent(new CustomEvent('room-closing', { detail: { roomId: room.id } }));
      
      // Add a small delay to allow cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Set room to inactive
      await supabase
        .from("rooms")
        .update({ is_active: false })
        .eq("id", room.id);
      
      router.push("/dashboard");
    } catch (error) {
      console.error("Error closing room:", error);
      toast({
        title: "Error closing room",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsClosing(false);
    }
  };
  
  return (
    <div className="bg-card rounded-lg p-4 shadow-sm mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Room: {room.id}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">
              {isHost ? "You are the host" : "You are a participant"}
            </span>
            <Button variant="outline" size="sm" onClick={handleCopyRoomCode}>
              Copy Room Code
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onPlayPause && (
            <Button 
              variant="outline" 
              onClick={onPlayPause}
            >
              {isPlaying ? "Pause" : "Play"}
            </Button>
          )}
          
          {isHost ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive">Close Room</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Close Room</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to close this room? This will end the session for all participants.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {}}>Cancel</Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleCloseRoom} 
                    disabled={isClosing}
                  >
                    {isClosing ? "Closing..." : "Close Room"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Button 
              variant="outline" 
              onClick={handleLeaveRoom} 
              disabled={isLeaving}
            >
              {isLeaving ? "Leaving..." : "Leave Room"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 