"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PlaybackState } from "@/lib/types";

interface YouTubePlayerProps {
  currentSong: {
    id: number;
    youtube_id: string;
    title: string;
    thumbnail?: string;
    duration?: number;
    added_by?: string;
    is_played?: boolean;
    created_at?: string;
    room_id?: string;
  };
  playbackState: PlaybackState;
  onVideoEnded: () => void;
}

export default function YoutubePlayer({
  currentSong,
  playbackState,
  onVideoEnded
}: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const checkEndIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const lastVideoIdRef = useRef<string | null>(null);
  
  // Create YouTube embed URL
  const getYouTubeEmbedUrl = () => {
    if (!currentSong?.youtube_id) return "about:blank";
    
    const startTime = Math.floor(playbackState.playback_position || 0);
    
    // Parameters:
    // autoplay=1: Auto-play the video
    // start=X: Start at specific time
    // controls=1: Show player controls
    // modestbranding=1: Hide YouTube logo
    // rel=0: Don't show related videos
    // fs=1: Allow fullscreen
    // playsinline=1: Play inline on mobile
    // enablejsapi=1: Enable JavaScript API
    // origin: Set the origin for security
    return `https://www.youtube.com/embed/${currentSong.youtube_id}?autoplay=1&start=${startTime}&controls=1&modestbranding=1&rel=0&fs=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
  };
  
  // Set up a listener for postMessage events from YouTube iframe
  useEffect(() => {
    if (!currentSong?.youtube_id) return;
    
    // Listen for messages from the iframe
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const data = JSON.parse(event.data);
        
        // Check if this is a YouTube player event
        if (data.event === 'onStateChange' && data.info === 0) {
          console.log('YouTube video ended via postMessage, triggering onVideoEnded callback');
          onVideoEnded();
        }
      } catch (error) {
        // Not a JSON message or not relevant
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [currentSong?.youtube_id, onVideoEnded]);
  
  // Set up a fallback mechanism to check if the video has ended
  useEffect(() => {
    if (!currentSong?.youtube_id) return;
    
    // Clear any existing interval
    if (checkEndIntervalRef.current) {
      clearInterval(checkEndIntervalRef.current);
      checkEndIntervalRef.current = null;
    }
    
    // Check if the video ID has changed
    if (lastVideoIdRef.current !== currentSong.youtube_id) {
      lastVideoIdRef.current = currentSong.youtube_id;
      console.log(`Video ID changed to: ${currentSong.youtube_id}`);
    }
    
    // Start a new interval to check if the video has ended
    // This is a fallback in case the postMessage event doesn't fire
    const songDuration = currentSong.duration || 0;
    const checkInterval = 2000; // Check every 2 seconds
    
    checkEndIntervalRef.current = setInterval(() => {
      // If we have a duration, use it to check if the video has ended
      if (songDuration > 0) {
        const elapsed = (Date.now() - playbackState.timestamp) / 1000;
        const currentPosition = (playbackState.playback_position || 0) + elapsed;
        
        // If we're near the end of the song (within 5 seconds), trigger the ended callback
        if (currentPosition >= songDuration - 5) {
          console.log('YouTube video ended via duration check, triggering onVideoEnded callback');
          onVideoEnded();
          
          // Clear the interval
          if (checkEndIntervalRef.current) {
            clearInterval(checkEndIntervalRef.current);
            checkEndIntervalRef.current = null;
          }
        }
      } else {
        // If we don't have a duration, check if the iframe is still available
        // If it's not, it might indicate that the video has ended
        if (iframeRef.current && document.contains(iframeRef.current) === false) {
          console.log('YouTube iframe not in document, triggering onVideoEnded callback');
          onVideoEnded();
          
          // Clear the interval
          if (checkEndIntervalRef.current) {
            clearInterval(checkEndIntervalRef.current);
            checkEndIntervalRef.current = null;
          }
        }
      }
    }, checkInterval);
    
    // Clean up
    return () => {
      if (checkEndIntervalRef.current) {
        clearInterval(checkEndIntervalRef.current);
        checkEndIntervalRef.current = null;
      }
    };
  }, [currentSong?.youtube_id, currentSong?.duration, playbackState, onVideoEnded]);
  
  // Force trigger onVideoEnded if the video doesn't play within a timeout
  useEffect(() => {
    if (!currentSong?.youtube_id) return;
    
    // Set a timeout to check if the video is playing
    const timeoutId = setTimeout(() => {
      // If the video hasn't changed after 30 seconds, assume it's stuck and trigger onVideoEnded
      if (currentSong?.youtube_id === lastVideoIdRef.current) {
        console.log('Video appears to be stuck, triggering onVideoEnded callback');
        onVideoEnded();
      }
    }, 30000); // 30 seconds
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentSong?.youtube_id, onVideoEnded]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (checkEndIntervalRef.current) {
        clearInterval(checkEndIntervalRef.current);
        checkEndIntervalRef.current = null;
      }
    };
  }, []);
  
  return (
    <Card>
      <CardContent className="p-0 overflow-hidden">
        <div className="relative">
          {/* YouTube Player */}
          <div className="aspect-video w-full bg-black">
            {currentSong?.youtube_id ? (
              <iframe
                ref={iframeRef}
                key={`yt-iframe-${currentSong.youtube_id}`}
                src={getYouTubeEmbedUrl()}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onError={() => setPlayerError("Failed to load video")}
              ></iframe>
            ) : (
              <div className="flex items-center justify-center h-full bg-black">
                <p className="text-white">No song selected</p>
              </div>
            )}
            
            {playerError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <p className="text-white">{playerError}</p>
              </div>
            )}
          </div>
          
          {/* Title Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-20">
            <div className="text-white truncate">
              {currentSong?.title || "No song playing"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 