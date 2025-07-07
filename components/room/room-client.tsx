"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Song, User, Room, PlaybackState } from "@/lib/types";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import YoutubePlayer from "./youtube-player";
import AddSongForm from "./add-song-form";
import SongQueue from "./song-queue";
import RoomHeader from "./room-header";
import ParticipantList from "./participant-list";
import { useToast } from "@/hooks/use-toast";
import { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { Play, SkipForward } from "lucide-react";

interface RoomClientProps {
  roomId: string;
  room: Room;
  participants: User[];
  session: Session | null;
}

export default function RoomClient({
  roomId,
  room,
  participants,
  session,
}: RoomClientProps) {
  const socket = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const isHost = room.host_id === session?.user?.id;
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentParticipants, setCurrentParticipants] = useState(participants);
  const [isPlaybackInitialized, setIsPlaybackInitialized] = useState(false);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    is_playing: false,
    playback_position: 0,
    timestamp: 0,
    updated_at: 0,
  });
  
  // Track component mounted state to prevent API calls after unmounting
  const isMounted = useRef(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update timestamps on client-side only
  useEffect(() => {
    setPlaybackState(prev => ({
      ...prev,
      timestamp: Date.now(),
      updated_at: Date.now()
    }));
    
    // Auto-start playback if there are songs in the queue when component mounts
    if (currentSong && !hasPlaybackStarted) {
      console.log("Auto-starting playback for initial song");
      // We use a small timeout to ensure the component is fully mounted
      const timer = setTimeout(() => {
        startPlayback();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [currentSong, hasPlaybackStarted]);

  // Add effect to ensure playback starts when a song is available
  useEffect(() => {
    // If we have a song and playback is initialized but not started, start it
    if (currentSong && isPlaybackInitialized && !hasPlaybackStarted) {
      console.log("Song available and playback initialized but not started, starting playback");
      const timer = setTimeout(() => {
        startPlayback();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [currentSong, isPlaybackInitialized, hasPlaybackStarted]);

  // Add a safety mechanism to ensure playback starts correctly
  useEffect(() => {
    if (!currentSong) return;
    
    // This effect helps ensure that playback starts correctly on initial load
    console.log("Setting up playback safety mechanism");
    
    // First attempt - immediate
    const immediateTimer = setTimeout(() => {
      if (currentSong && !hasPlaybackStarted) {
        console.log("Safety mechanism (immediate): Starting playback");
        startPlayback();
      }
    }, 100);
    
    // Second attempt - delayed
    const delayedTimer = setTimeout(() => {
      if (currentSong && !hasPlaybackStarted) {
        console.log("Safety mechanism (delayed): Starting playback");
        startPlayback();
      }
    }, 3000);
    
    // Force refresh the queue to ensure we have the latest data
    const refreshTimer = setTimeout(() => {
      console.log("Safety mechanism: Refreshing queue");
      setRefreshCounter(prev => prev + 1);
    }, 1500);
    
    return () => {
      clearTimeout(immediateTimer);
      clearTimeout(delayedTimer);
      clearTimeout(refreshTimer);
    };
  }, [currentSong?.id]);

  const ws = useRef<WebSocket | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const [webSocketActive, setWebSocketActive] = useState(false);
  const [webSocketError, setWebSocketError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
      
      // Clear all intervals and timeouts
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Close WebSocket connection
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      
      console.log("Room client component unmounted, all cleanup completed");
    };
  }, []);

  // Memoize the refreshQueue function to avoid unnecessary re-renders
  const refreshQueue = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      // Fetch all songs for this room
      const songsResponse = await fetch(`/api/songs?roomId=${roomId}`, {
        credentials: 'include' // Add credentials to ensure cookies are sent
      });
      
      if (songsResponse.ok) {
        const songsData = await songsResponse.json();
        setSongs(songsData.songs || []);
        
        // Update current song if needed
        const unplayedSongs = songsData.songs?.filter((song: Song) => !song.is_played) || [];
        if (unplayedSongs.length > 0 && (!currentSong || currentSong.id !== unplayedSongs[0].id)) {
          setCurrentSong(unplayedSongs[0]);
        } else if (unplayedSongs.length === 0 && currentSong) {
          setCurrentSong(null);
        }
      } else {
        console.error("Failed to fetch songs:", await songsResponse.text());
      }
    } catch (error) {
      console.error("Error refreshing queue:", error);
    }
  }, [roomId, currentSong]);

  // Handle video ended event
  const handleVideoEnded = useCallback(async () => {
    if (!currentSong) return;
    
    try {
      console.log(`Song ended: ${currentSong.title}`);
      
      // Immediately update local state to mark the song as played
      setSongs(prevSongs => 
        prevSongs.map(song => 
          song.id === currentSong.id 
            ? { ...song, is_played: true } 
            : song
        )
      );
      
      // 1. Mark the current song as played
      await fetch(`/api/songs/update?songId=${currentSong.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_played: true
        }),
        credentials: 'include' // Add credentials to ensure cookies are sent
      });
      
      // 2. Get the next song from the queue
      const nextSongsResponse = await fetch(`/api/songs?roomId=${roomId}&played=false&limit=1`, {
        credentials: 'include' // Add credentials to ensure cookies are sent
      });
      
      if (nextSongsResponse.ok) {
        const nextSongsData = await nextSongsResponse.json();
        const nextSongs = nextSongsData.songs;
        
        if (nextSongs && nextSongs.length > 0) {
          console.log("Next song:", nextSongs[0].title);
          
          // Update the current song
          setCurrentSong(nextSongs[0]);
          
          // Update playback state with the new song
          await fetch(`/api/playback?roomId=${roomId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              is_playing: true, // Always auto-play the next song
              playback_position: 0,
              current_song_id: nextSongs[0].id
            }),
            credentials: 'include' // Add credentials to ensure cookies are sent
          });
          
          // Update local playback state
          setPlaybackState({
            is_playing: true,
            playback_position: 0,
            timestamp: Date.now(),
            updated_at: Date.now(),
            current_song_id: nextSongs[0].id
          });
          
          // Ensure playback has been started
          setHasPlaybackStarted(true);
          
          // Force a refresh to ensure UI is updated
          setRefreshCounter(prev => prev + 1);
          
          // Show a toast notification for the next song
          toast({
            title: "Now Playing",
            description: nextSongs[0].title,
          });
        } else {
          console.log("No more songs in queue");
          setCurrentSong(null);
          
          // Set playback state to not playing
          setPlaybackState({
            ...playbackState,
            is_playing: false,
            current_song_id: null
          });
          
          // Show a toast notification that the queue is empty
          toast({
            title: "Queue Completed",
            description: "Add more songs to continue playback",
          });
        }
      } else {
        console.error("Failed to fetch next songs:", await nextSongsResponse.text());
      }
      
      // 3. Finally refresh the entire queue to ensure UI is updated
      refreshQueue();
    } catch (error) {
      console.error("Error handling video ended:", error);
      toast({
        title: "Error",
        description: "Failed to process song completion",
        variant: "destructive"
      });
      
      // Try to refresh the queue anyway
      refreshQueue();
    }
  }, [currentSong, roomId, refreshQueue, toast, playbackState, hasPlaybackStarted]);

  // Handle playback toggling
  const togglePlayback = async () => {
    try {
      const newPlaybackState = { ...playbackState, is_playing: !playbackState.is_playing };
      setPlaybackState(newPlaybackState);
      await fetch(`/api/playback?roomId=${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_playing: newPlaybackState.is_playing,
          playback_position: newPlaybackState.playback_position,
          timestamp: Date.now()
        }),
        credentials: 'include' // Add credentials to ensure cookies are sent
      });
    } catch (error) {
      console.error("Error toggling playback:", error);
      toast({
        title: "Error",
        description: "Failed to toggle playback",
        variant: "destructive"
      });
    }
  };

  // Set up socket connection
  useEffect(() => {
    if (!roomId) return;

    const setupWebSocketConnection = () => {
      // Close any existing connection
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        ws.current.close();
      }

      // Create a new WebSocket connection
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws?roomId=${roomId}`;
        ws.current = new WebSocket(wsUrl);

        // Handle connection open
        ws.current.onopen = () => {
          console.log('WebSocket connection established');
          setWebSocketActive(true);
          setWebSocketError(null);
          // Clear polling interval if it's active
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
        };

        // Handle connection close
        ws.current.onclose = (event) => {
          console.log('WebSocket connection closed', event);
          setWebSocketActive(false);
          // Start polling as fallback
          startPolling();
        };

        // Handle connection error
        ws.current.onerror = (error) => {
          console.error('WebSocket connection error:', error);
          setWebSocketActive(false);
          setWebSocketError('Failed to connect via WebSocket');
          // Start polling as fallback
          startPolling();
        };

        // Handle incoming messages
        ws.current.onmessage = (event) => {
          try {
            console.log('WebSocket message received:', event.data);
            const data = JSON.parse(event.data);
            if (data.type === 'ROOM_UPDATE') {
              console.log('Room update received, refreshing data');
              // Trigger a refresh of the room data
              setRefreshCounter(prev => prev + 1);
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };
      } catch (error) {
        console.error('Error setting up WebSocket:', error);
        setWebSocketActive(false);
        setWebSocketError('Failed to set up WebSocket connection');
        // Start polling as fallback
        startPolling();
      }
    };

    const startPolling = () => {
      // Only start if not already polling
      if (!pollingInterval.current) {
        console.log('Starting polling as WebSocket fallback');
        // Poll every 5 seconds
        pollingInterval.current = setInterval(() => {
          setRefreshCounter(prev => prev + 1);
        }, 5000);
      }
    };

    // Set up the initial connection
    setupWebSocketConnection();

    // Reconnect on network status change
    const handleOnline = () => {
      console.log('Network is online, reconnecting WebSocket');
      setupWebSocketConnection();
    };

    window.addEventListener('online', handleOnline);

    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      
      if (ws.current) {
        ws.current.close();
      }
      
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [roomId]);

  // Initialize playback state when joining a room
  useEffect(() => {
    const initializePlayback = async () => {
      if (isPlaybackInitialized) return;
      
      try {
        // Get current playback state from the server
        const res = await fetch(`/api/playback/initialize?roomId=${roomId}`, {
          credentials: 'include' // Add credentials to ensure cookies are sent
        });
        
        if (res.ok) {
          const data = await res.json();
          
          // Update local state with server state
          if (data.playback_state) {
            // Preserve playback position from server
            const serverPosition = data.playback_state.playback_position || 0;
            
            setPlaybackState({
              ...data.playback_state,
              playback_position: serverPosition,
              timestamp: Date.now(),
              updated_at: Date.now()
            });
            
            console.log("Initialized playback state:", {
              ...data.playback_state,
              playback_position: serverPosition
            });
            
            // If there's a current song, set it
            if (data.current_song) {
              setCurrentSong(data.current_song);
            }
          }
          
          // Add a small delay before marking initialization as complete
          // This ensures components have time to properly set up
          setTimeout(() => {
            setIsPlaybackInitialized(true);
            console.log("Playback initialization completed with delay");
          }, 1000);
        }
      } catch (error) {
        console.error('Error initializing playback:', error);
      }
    };
    
    if (session && !isPlaybackInitialized) {
      initializePlayback();
    }
  }, [session, roomId, isPlaybackInitialized]);

  // Refresh songs on mount and when refresh counter changes
  useEffect(() => {
    console.log("Running refreshQueue effect with roomId:", roomId, "refreshCounter:", refreshCounter);
    refreshQueue();
  }, [refreshCounter, roomId, refreshQueue]);

  // Display current song info
  const currentSongInfo = currentSong ? {
    id: currentSong.id,
    youtube_id: currentSong.youtube_id,
    title: currentSong.title,
    thumbnail: currentSong.thumbnail,
    duration: currentSong.duration,
    added_by: currentSong.added_by,
    is_played: currentSong.is_played,
    created_at: currentSong.created_at,
    room_id: currentSong.room_id
  } : null;

  const forceRefresh = useCallback(() => {
    console.log("Force refreshing song queue");
    setRefreshCounter(prev => prev + 1);
  }, []);

  // Initialize component and load data
  useEffect(() => {
    // Force immediate load of songs when component mounts
    console.log("Component mounted, forcing immediate data load");
    
    const loadInitialData = async () => {
      try {
        // Force refresh songs
        const data = await refreshQueue();
        console.log("Initial data load complete:", data);
        
        // Set up polling for songs
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        
        pollingIntervalRef.current = setInterval(() => {
          // Only poll if component is still mounted
          if (isMounted.current) {
            console.log("Polling for songs...");
            refreshQueue();
          } else {
            // Clear interval if component unmounted
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }, 5000);
        
        return () => {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        };
      } catch (error) {
        console.error("Error in initial data load:", error);
      }
    };
    
    loadInitialData();
  }, [refreshQueue]);  // Include refreshQueue in the dependency array

  // Manual refresh handler for debugging
  const handleManualRefresh = async () => {
    try {
      console.log("Manual refresh triggered");
      
      // First, get all songs
      const songs = await refreshQueue();
      
      // If no current song is set, try to find one
      if (!currentSong) {
        const nextSong = songs?.songs?.find((s: Song) => !s.is_played);
        if (nextSong) {
          console.log(`Setting current song to: ${nextSong.title}`);
          setCurrentSong(nextSong);
        }
      }
      
      // Refresh participants
      const participantsRes = await fetch(`/api/rooms/join?roomId=${roomId}`);
      if (participantsRes.ok) {
        const data = await participantsRes.json();
        if (data.participants) {
          setCurrentParticipants(data.participants);
        }
      }
      
      setRefreshCounter(prev => prev + 1);
      
      toast({
        title: "Refreshed",
        description: "Queue and participants updated",
      });
    } catch (error) {
      console.error("Manual refresh error:", error);
      toast({
        title: "Refresh Error",
        description: "Failed to update queue or participants",
        variant: "destructive"
      });
    }
  };
  
  // Skip current song
  const skipCurrentSong = async () => {
    if (!currentSong) return;
    
    try {
      console.log(`Skipping song: ${currentSong.title}`);
      await handleVideoEnded();
      
      toast({
        title: "Skipped",
        description: "Current song skipped",
      });
    } catch (error) {
      console.error("Error skipping song:", error);
      toast({
        title: "Error",
        description: "Failed to skip song",
        variant: "destructive"
      });
    }
  };

  // Start playback of the first song
  const startPlayback = async () => {
    if (!currentSong) {
      toast({
        title: "No songs in queue",
        description: "Add songs to the queue first",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log("Starting playback for song:", currentSong.title);
      
      // Set playback state to playing and position to 0
      const playbackResponse = await fetch(`/api/playback/initialize?roomId=${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_playing: true,
          playback_position: 0
        })
      });
      
      if (!playbackResponse.ok) {
        console.warn("Failed to update playback state:", await playbackResponse.text());
        throw new Error("Failed to start playback");
      }
      
      console.log("Started playback for song:", currentSong.title);
      
      // Update playback state locally
      const now = Date.now();
      setPlaybackState({
        is_playing: true,
        playback_position: 0,
        timestamp: now,
        updated_at: now
      });
      
      // Mark that playback has been manually started at least once
      setHasPlaybackStarted(true);
      
      // Force a refresh to ensure UI is updated
      setRefreshCounter(prev => prev + 1);
      
      toast({
        title: "Playback Started",
        description: `Now playing: ${currentSong.title}`
      });
    } catch (error) {
      console.error("Error starting playback:", error);
      toast({
        title: "Error",
        description: "Failed to start playback",
        variant: "destructive"
      });
    }
  };

  // Handle leaving the room
  const handleLeaveRoom = useCallback(() => {
    // Set mounted flag to false to prevent further API calls
    isMounted.current = false;
    
    // Clear all intervals
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Close WebSocket connection
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    console.log("Leaving room, all resources cleaned up");
    router.push('/dashboard');
  }, [router]);

  // Listen for room-closing event
  useEffect(() => {
    const handleRoomClosing = (event: CustomEvent) => {
      console.log("Room closing event detected, cleaning up resources");
      
      // Set mounted flag to false to prevent further API calls
      isMounted.current = false;
      
      // Clear all intervals
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Close WebSocket connection
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      
      console.log("Room closing, all resources cleaned up");
    };
    
    window.addEventListener('room-closing', handleRoomClosing as EventListener);
    
    return () => {
      window.removeEventListener('room-closing', handleRoomClosing as EventListener);
    };
  }, []);

  // Set up Supabase real-time subscription
  useEffect(() => {
    if (!roomId) return;

    const supabase = createSupabaseClient();
    
    console.log("Setting up Supabase real-time subscription for room:", roomId);
    
    // Subscribe to changes in the songs table
    const songsSubscription = supabase
      .channel('songs-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'songs',
          filter: `room_id=eq.${roomId}`
        }, 
        (payload) => {
          console.log("Received real-time update for songs:", payload);
          refreshQueue();
        }
      )
      .subscribe((status) => {
        console.log("Songs subscription status:", status);
      });
      
    // Subscribe to changes in the votes table
    const votesSubscription = supabase
      .channel('votes-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'votes',
          filter: `song_id=in.(${songs.map(s => s.id).join(',')})` 
        }, 
        (payload) => {
          console.log("Received real-time update for votes:", payload);
          refreshQueue();
        }
      )
      .subscribe((status) => {
        console.log("Votes subscription status:", status);
      });
      
    // Subscribe to changes in the playback_state table
    const playbackSubscription = supabase
      .channel('playback-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'playback_state',
          filter: `room_id=eq.${roomId}`
        }, 
        (payload) => {
          console.log("Received real-time update for playback state:", payload);
          
          // Only non-host users should update their playback state from real-time updates
          if (!isHost) {
            const newData = payload.new;
            if (newData) {
              setPlaybackState(prev => ({
                ...prev,
                is_playing: newData.is_playing,
                playback_position: newData.playback_position,
                current_song_id: newData.current_song_id,
                updated_at: Date.now()
              }));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("Playback subscription status:", status);
      });
      
    // Subscribe to changes in the room_participants table
    const participantsSubscription = supabase
      .channel('participants-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`
        }, 
        (payload) => {
          console.log("Received real-time update for participants:", payload);
          fetchParticipants();
        }
      )
      .subscribe((status) => {
        console.log("Participants subscription status:", status);
      });
    
    // Function to fetch participants
    const fetchParticipants = async () => {
      try {
        const response = await fetch(`/api/rooms/join?roomId=${roomId}&getParticipants=true`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.participants) {
            setCurrentParticipants(data.participants);
          }
        }
      } catch (error) {
        console.error("Error fetching participants:", error);
      }
    };
    
    // Clean up subscriptions when component unmounts
    return () => {
      console.log("Cleaning up Supabase real-time subscriptions");
      supabase.channel('songs-changes').unsubscribe();
      supabase.channel('votes-changes').unsubscribe();
      supabase.channel('playback-changes').unsubscribe();
      supabase.channel('participants-changes').unsubscribe();
    };
  }, [roomId, isHost, songs, refreshQueue]);

  // Force complete component refresh after a delay if playback hasn't started
  useEffect(() => {
    if (!currentSong) return;
    
    // This is a last resort - try to start playback again
    const forceRefreshTimer = setTimeout(() => {
      if (currentSong && !hasPlaybackStarted) {
        console.log("Force starting playback after delay");
        
        // Try to start playback again
        const startTimer = setTimeout(() => {
          startPlayback();
        }, 500);
        
        return () => clearTimeout(startTimer);
      }
    }, 7000);
    
    return () => clearTimeout(forceRefreshTimer);
  }, [currentSong?.id, hasPlaybackStarted]);

  // Add a manual play function
  const manualPlay = async () => {
    try {
      // First, refresh the queue to make sure we have the latest data
      await refreshQueue();
      
      // Get the current song
      let songToPlay = currentSong;
      
      // If no current song, check if there are any songs in the queue
      if (!songToPlay && songs.length > 0) {
        const unplayedSongs = songs.filter(song => !song.is_played);
        if (unplayedSongs.length > 0) {
          songToPlay = unplayedSongs[0];
          setCurrentSong(songToPlay);
        }
      }
      
      if (!songToPlay) {
        toast({
          title: "No song to play",
          description: "Add a song to the queue first",
          variant: "destructive"
        });
        return;
      }
      
      console.log("Manually starting playback for song:", songToPlay.title);
      
      // Update the playback state on the server using the initialize endpoint
      const playbackResponse = await fetch(`/api/playback/initialize?roomId=${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_playing: true,
          playback_position: 0,
          current_song_id: songToPlay.id
        }),
        credentials: 'include'
      });
      
      if (!playbackResponse.ok) {
        throw new Error("Failed to update playback state");
      }
      
      // Then update local state
      const now = Date.now();
      setPlaybackState({
        is_playing: true,
        playback_position: 0,
        timestamp: now,
        updated_at: now,
        current_song_id: songToPlay.id
      });
      
      // Mark that playback has been manually started
      setHasPlaybackStarted(true);
      
      toast({
        title: "Playback Started",
        description: "Video playback has been started"
      });
    } catch (error) {
      console.error("Error starting playback:", error);
      toast({
        title: "Error",
        description: "Failed to start playback",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <RoomHeader
        room={room}
        isHost={isHost}
        onLeaveRoom={handleLeaveRoom}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="relative">
            <YoutubePlayer
              currentSong={currentSong || { id: 0, youtube_id: "", title: "" }}
              playbackState={playbackState}
              onVideoEnded={handleVideoEnded}
            />
          </div>
          
          {/* Manual Play Button - Only visible to host */}
          {isHost && (
            <div className="flex justify-center gap-4 my-4">
              <Button 
                variant="default"
                size="lg"
                onClick={manualPlay}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-8 py-6 text-lg"
              >
                <Play className="h-6 w-6" /> Play Current Song
              </Button>
              
              <Button 
                variant="outline"
                size="lg"
                onClick={skipCurrentSong}
                className="flex items-center gap-2"
                disabled={!currentSong}
              >
                <SkipForward className="h-5 w-5" /> Skip Song
              </Button>
            </div>
          )}
          
          <AddSongForm 
            roomId={roomId} 
            onSongAdded={async () => {
              await refreshQueue();
              // Auto-start playback if this is the first song and playback hasn't started yet
              if (!hasPlaybackStarted && currentSong) {
                startPlayback();
              }
            }} 
            directSetSongs={setSongs}
          />
          
          <SongQueue
            songs={songs}
            isHost={isHost}
            roomId={roomId}
            onSongUpdated={refreshQueue}
            onSongRemoved={refreshQueue}
            refreshCounter={refreshCounter}
            session={session}
          />
        </div>
        
        <div>
          <ParticipantList 
            participants={currentParticipants} 
            hostId={room.host_id} 
            roomId={roomId}
          />
        </div>
      </div>
    </div>
  );
}