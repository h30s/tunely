"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { User } from "@/lib/types";

interface ParticipantListProps {
  participants: User[];
  hostId: string;
  roomId: string;
}

export default function ParticipantList({ participants, hostId, roomId }: ParticipantListProps) {
  const [localParticipants, setLocalParticipants] = useState<User[]>(participants);
  
  // Update local participants when prop changes
  useEffect(() => {
    setLocalParticipants(participants);
  }, [participants]);
  
  // Get initials from name
  const getInitials = (name: string | null | undefined) => {
    if (!name || name.trim() === '') return "U"; // "U" for User instead of "?"
    
    const nameParts = name.trim().split(" ");
    if (nameParts.length === 0) return "U";
    
    if (nameParts.length === 1) {
      // If only one name, take first two letters
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    
    // Otherwise take first letter of first and last name
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants ({localParticipants.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {localParticipants.map((participant) => (
            <div 
              key={participant.id} 
              className="flex items-center gap-3"
            >
              <Avatar>
                <AvatarImage 
                  src={participant.image || ""} 
                  alt={participant.name || "User"} 
                />
                <AvatarFallback>
                  {getInitials(participant.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {participant.name || "Anonymous"}
                  {participant.id === hostId && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Host
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
          
          {localParticipants.length === 0 && (
            <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
              <Users className="h-10 w-10 mb-2 opacity-50" />
              <p>No participants yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 