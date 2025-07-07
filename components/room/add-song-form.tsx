"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { extractYoutubeVideoId, fetchVideoDetails } from "@/lib/youtube/api";
import { Song } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface AddSongFormProps {
  roomId: string;
  onSongAdded?: () => void;
  directSetSongs?: (songs: Song[]) => void;
}

export default function AddSongForm({ roomId, onSongAdded, directSetSongs }: AddSongFormProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const validateYouTubeUrl = (url: string): boolean => {
    const videoId = extractYoutubeVideoId(url);
    if (!videoId) {
      setError("Please enter a valid YouTube URL");
      return false;
    }
    setError(null);
    return true;
  };
  
  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoUrl) {
      setError("Please enter a YouTube URL");
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive"
      });
      return;
    }
    
    // Validate YouTube URL
    if (!validateYouTubeUrl(videoUrl)) {
      toast({
        title: "Error",
        description: "Invalid YouTube URL",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Extract video ID from URL
      const videoId = extractYoutubeVideoId(videoUrl);
      
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }
      
      console.log("Adding song with YouTube ID:", videoId);
      
      // Fetch video details from YouTube API
      const videoDetails = await fetchVideoDetails(videoId);
      
      if (!videoDetails) {
        throw new Error("Failed to fetch video details");
      }
      
      console.log("Fetched video details:", videoDetails);
      
      // Check if song is too long (over 10 minutes)
      if (videoDetails.duration > 600) {
        throw new Error("Song is too long (maximum 10 minutes)");
      }
      
      // Add song to database
      const response = await fetch("/api/songs/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          roomId,
          youtubeId: videoId,
          title: videoDetails.title,
          thumbnailUrl: videoDetails.thumbnailUrl,
          duration: videoDetails.duration
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error adding song:", errorData);
        throw new Error(errorData.error || "Failed to add song");
      }
      
      const responseData = await response.json();
      console.log("Song added successfully:", responseData);
      
      // Clear form
      setVideoUrl("");
      
      // Show success message
      toast({
        title: "Success",
        description: "Song added to queue",
      });

      // Wait a moment to ensure the database has updated
      await new Promise(resolve => setTimeout(resolve, 300));

      // Force an immediate refresh of the queue by fetching songs directly
      try {
        console.log("Fetching updated song list after adding song");
        const songsResponse = await fetch(`/api/songs?roomId=${roomId}&includeVotes=true`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          }
        });
        
        if (!songsResponse.ok) {
          throw new Error(`Failed to fetch songs: ${songsResponse.status}`);
        }
        
        const songData = await songsResponse.json();
        console.log("Fetched updated songs:", songData);
        
        // Directly update the songs state if the function is provided
        if (directSetSongs && songData.songs && Array.isArray(songData.songs)) {
          console.log("Directly updating songs state with new data");
          directSetSongs(songData.songs);
        }
        
        // Notify parent component that a song was added
        if (onSongAdded) {
          console.log("Calling onSongAdded callback to refresh queue");
          onSongAdded();
        }
      } catch (error) {
        console.error("Error fetching updated songs:", error);
        // Still call onSongAdded as a fallback
        if (onSongAdded) {
          onSongAdded();
        }
      }
    } catch (error) {
      console.error("Error adding song:", error);
      setError(error instanceof Error ? error.message : "Failed to add song");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add song",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      <form onSubmit={handleAddSong} className="flex gap-2">
        <Input
          placeholder="Paste YouTube URL"
          value={videoUrl}
          onChange={(e) => {
            setVideoUrl(e.target.value);
            if (e.target.value) validateYouTubeUrl(e.target.value);
            else setError(null);
          }}
          disabled={isLoading}
          className={`flex-1 ${error ? 'border-red-500' : ''}`}
        />
        <Button type="submit" disabled={isLoading || !videoUrl.trim()}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add"
          )}
        </Button>
      </form>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
} 