"use client";

import { useState, useEffect, useMemo } from "react";
import { Song, Vote } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Play, RefreshCw, ThumbsUp, ThumbsDown, Loader2, Music, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Session } from "next-auth";

interface SongQueueProps {
  songs: Song[];
  isHost: boolean;
  roomId: string;
  session: Session | null;
  onSongUpdated?: () => void;
  onSongRemoved?: () => void;
  refreshCounter?: number;
}

interface SongWithVotes extends Song {
  upvotes?: number;
  downvotes?: number;
  userVote?: 'up' | 'down' | null;
  isBeingRemoved?: boolean;
}

export default function SongQueue({
  songs,
  isHost,
  roomId,
  session,
  onSongUpdated,
  onSongRemoved,
  refreshCounter = 0
}: SongQueueProps) {
  const [localSongs, setLocalSongs] = useState<SongWithVotes[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [votes, setVotes] = useState<Record<number, { up: number, down: number }>>({});
  const [userVotes, setUserVotes] = useState<Record<number, 'up' | 'down' | null>>({});
  const [loadingVotes, setLoadingVotes] = useState<Record<number, boolean>>({});
  const [showPlayedSongs, setShowPlayedSongs] = useState(false);
  const { toast } = useToast();

  // Update local songs when songs prop changes
  useEffect(() => {
    console.log("Songs prop or refreshCounter changed, updating local songs");
    
    // Map songs to include vote data
    const updatedSongs = songs.map(song => ({
      ...song,
      upvotes: song.upvotes || votes[song.id]?.up || 0,
      downvotes: song.downvotes || votes[song.id]?.down || 0,
      userVote: song.userVote || userVotes[song.id] || null
    }));
    
    console.log("Updated songs with vote data:", updatedSongs);
    setLocalSongs(updatedSongs);
    
    // Fetch votes if we have songs and a session
    if (songs.length > 0 && session?.user?.id && !Object.keys(votes).length) {
      console.log("Fetching votes for songs");
      fetchVotes();
    }
  }, [songs, refreshCounter, votes, userVotes, session]);

  // Fetch votes when component mounts
  useEffect(() => {
    if (songs.length > 0 && session?.user?.id) {
      fetchVotes();
    }
  }, [songs, session]);

  // Add effect to animate songs that are newly marked as played
  useEffect(() => {
    const newlyPlayedSongs = localSongs.filter(song => song.is_played && !song.isBeingRemoved);
    
    if (newlyPlayedSongs.length > 0) {
      // Mark songs for animation
      setLocalSongs(prev => 
        prev.map(song => 
          song.is_played && !song.isBeingRemoved
            ? { ...song, isBeingRemoved: true }
            : song
        )
      );
      
      // After animation completes, we don't need to do anything else
      // as the displayedSongs will filter them out if showPlayedSongs is false
    }
  }, [localSongs]);

  // Function to fetch votes for all songs
  const fetchVotes = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch(`/api/songs/vote?roomId=${roomId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error("Failed to fetch votes");
      
      const data = await response.json();
      
      if (data.votes) {
        // Process votes into a more usable format
        const votesByType: Record<number, { up: number, down: number }> = {};
        const userVotesByType: Record<number, 'up' | 'down' | null> = {};
        
        data.votes.forEach((vote: Vote) => {
          if (!votesByType[vote.song_id]) {
            votesByType[vote.song_id] = { up: 0, down: 0 };
          }
          
          votesByType[vote.song_id][vote.vote_type]++;
          
          // Track user's own votes
          if (vote.user_id === session.user.id) {
            userVotesByType[vote.song_id] = vote.vote_type;
          }
        });
        
        setVotes(votesByType);
        setUserVotes(userVotesByType);
      }
    } catch (error) {
      console.error("Error fetching votes:", error);
    }
  };

  // Function to refresh songs directly
  const refreshSongs = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/songs?roomId=${roomId}&includeVotes=true`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error("Failed to refresh songs");
      
      const data = await response.json();
      
      if (data.songs && Array.isArray(data.songs)) {
        setLocalSongs(data.songs.map(song => ({
          ...song,
          upvotes: votes[song.id]?.up || 0,
          downvotes: votes[song.id]?.down || 0,
          userVote: userVotes[song.id] || null
        })));
        console.log(`Refreshed song queue. Found ${data.songs.length} songs.`);
        
        // Fetch votes
        fetchVotes();
        
        // Call the parent's callback if provided
        if (onSongUpdated) onSongUpdated();
      }
    } catch (error) {
      console.error("Error refreshing songs:", error);
      toast({
        title: "Error",
        description: "Failed to refresh song queue",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to remove a song
  const removeSong = async (songId: number) => {
    try {
      const response = await fetch(`/api/songs?roomId=${roomId}&songId=${songId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error("Failed to remove song");
      
      // Update local state first for immediate feedback
      setLocalSongs(prev => prev.filter(song => song.id !== songId));
      
      // Notify parent
      if (onSongRemoved) onSongRemoved();
      
      toast({
        title: "Song Removed",
        description: "The song has been removed from the queue"
      });
    } catch (error) {
      console.error("Error removing song:", error);
      toast({
        title: "Error",
        description: "Failed to remove song",
        variant: "destructive"
      });
    }
  };

  // Function to play a specific song (mark all previous as played)
  const playSong = async (songId: number) => {
    try {
      // Update the local state first
      setLocalSongs(prev => 
        prev.map(song => ({
          ...song,
          is_played: song.id === songId ? false : (song.id < songId),
          isBeingRemoved: song.id < songId && !song.is_played
        }))
      );
      
      // Call the API to update all songs
      const response = await fetch(`/api/songs/update?roomId=${roomId}&songId=${songId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          playNow: true
        })
      });
      
      if (!response.ok) throw new Error("Failed to update song playback");
      
      // Notify parent
      if (onSongUpdated) onSongUpdated();
      
      toast({
        title: "Song Updated",
        description: "The song will play next"
      });
    } catch (error) {
      console.error("Error playing song:", error);
      toast({
        title: "Error",
        description: "Failed to update song playback",
        variant: "destructive"
      });
      // Refresh to get the correct state
      refreshSongs();
    }
  };

  // Function to handle voting
  const handleVote = async (songId: number, voteType: 'up' | 'down') => {
    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to vote",
        variant: "destructive"
      });
      return;
    }
    
    // Set loading state for this song
    setLoadingVotes(prev => ({ ...prev, [songId]: true }));
    
    try {
      const currentVote = userVotes[songId];
      let method = 'POST';
      let action = 'add';
      
      // If user already voted this way, remove the vote
      if (currentVote === voteType) {
        method = 'DELETE';
        action = 'remove';
      } 
      // If user already voted the other way, update the vote
      else if (currentVote) {
        method = 'PUT';
        action = 'update';
      }
      
      const response = await fetch('/api/songs/vote', {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          songId,
          userId: session.user.id,
          voteType
        })
      });
      
      if (!response.ok) throw new Error("Failed to vote");
      
      // Update local state for immediate feedback
      setUserVotes(prev => ({
        ...prev,
        [songId]: action === 'remove' ? null : voteType
      }));
      
      // Update vote counts
      setVotes(prev => {
        const oldVotes = prev[songId] || { up: 0, down: 0 };
        const newVotes = { ...oldVotes };
        
        // Handle different actions
        if (action === 'add') {
          // Add new vote
          newVotes[voteType]++;
        } else if (action === 'remove') {
          // Remove existing vote
          newVotes[voteType]--;
        } else if (action === 'update') {
          // Update vote (remove old, add new)
          const oppositeType = voteType === 'up' ? 'down' : 'up';
          newVotes[oppositeType]--;
          newVotes[voteType]++;
        }
        
        return { ...prev, [songId]: newVotes };
      });
      
      // Update local songs with new vote counts
      setLocalSongs(prev => 
        prev.map(song => 
          song.id === songId 
            ? { 
                ...song, 
                userVote: action === 'remove' ? null : voteType,
                upvotes: votes[songId]?.up || 0,
                downvotes: votes[songId]?.down || 0
              }
            : song
        )
      );
      
      // Show success toast
      toast({
        title: "Vote Recorded",
        description: action === 'remove' 
          ? "Your vote has been removed" 
          : `You ${action === 'update' ? 'changed your vote' : 'voted'} ${voteType === 'up' ? 'up' : 'down'}`,
      });
      
      // Call parent callback if provided
      if (onSongUpdated) onSongUpdated();
    } catch (error) {
      console.error("Error voting:", error);
      toast({
        title: "Error",
        description: "Failed to record your vote",
        variant: "destructive"
      });
    } finally {
      // Clear loading state
      setLoadingVotes(prev => ({ ...prev, [songId]: false }));
    }
  };

  // Sort unplayed songs by votes (highest upvotes - downvotes first)
  const sortSongsByVotes = (songs: SongWithVotes[]) => {
    return [...songs].sort((a, b) => {
      // First sort by played status
      if (a.is_played !== b.is_played) {
        return a.is_played ? 1 : -1; // Unplayed songs first
      }
      
      // Then sort by vote score
      const aScore = (a.upvotes || 0) - (a.downvotes || 0);
      const bScore = (b.upvotes || 0) - (b.downvotes || 0);
      
      if (bScore !== aScore) {
        return bScore - aScore; // Higher score first
      }
      
      // If scores are equal, sort by creation time (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  // Memoize sorted songs to avoid recalculating on every render
  const sortedSongs = useMemo(() => sortSongsByVotes(localSongs), [localSongs]);
  
  // Get the currently playing song (first unplayed song)
  const currentlyPlayingSongId = useMemo(() => {
    const firstUnplayed = sortedSongs.find(song => !song.is_played);
    return firstUnplayed?.id;
  }, [sortedSongs]);

  // Filter songs based on played status
  const displayedSongs = useMemo(() => {
    return showPlayedSongs 
      ? sortedSongs 
      : sortedSongs.filter(song => !song.is_played);
  }, [sortedSongs, showPlayedSongs]);

  // Count played songs
  const playedSongsCount = useMemo(() => {
    return sortedSongs.filter(song => song.is_played).length;
  }, [sortedSongs]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Song Queue</CardTitle>
        <div className="flex items-center gap-2">
          {/* Toggle to show/hide played songs */}
          {playedSongsCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPlayedSongs(!showPlayedSongs)}
              className="flex items-center gap-1"
            >
              {showPlayedSongs ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Hide Played</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">Show Played ({playedSongsCount})</span>
                  <span className="inline sm:hidden">{playedSongsCount}</span>
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {localSongs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No songs in queue. Add a song to get started!</p>
          </div>
        ) : displayedSongs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No songs in queue. All songs have been played.</p>
            <Button 
              variant="link" 
              onClick={() => setShowPlayedSongs(true)}
              className="mt-2"
            >
              Show played songs
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedSongs.map((song) => (
              <div 
                key={song.id}
                className={`flex items-center justify-between p-3 rounded-md transition-all duration-300 ${
                  song.isBeingRemoved 
                    ? 'opacity-0 transform translate-x-full h-0 p-0 my-0 overflow-hidden' 
                    : song.is_played 
                      ? 'bg-muted/50 text-muted-foreground' 
                      : song.id === currentlyPlayingSongId
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-card hover:bg-accent/10'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3">
                      {song.thumbnail ? (
                        <img 
                          src={song.thumbnail} 
                          alt={song.title} 
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Music className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center">
                        <p className="font-medium truncate">{song.title}</p>
                        {song.is_played && (
                          <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Added by {song.added_by_name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {/* Vote buttons */}
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${song.userVote === 'up' ? 'bg-green-100 text-green-600' : ''}`}
                      onClick={() => handleVote(song.id, 'up')}
                      disabled={song.is_played || loadingVotes[song.id]}
                    >
                      {loadingVotes[song.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsUp className={`h-4 w-4 ${song.userVote === 'up' ? 'fill-current' : ''}`} />
                      )}
                    </Button>
                    <span className="text-sm min-w-[1.5rem] text-center">{song.upvotes || 0}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${song.userVote === 'down' ? 'bg-red-100 text-red-600' : ''}`}
                      onClick={() => handleVote(song.id, 'down')}
                      disabled={song.is_played || loadingVotes[song.id]}
                    >
                      {loadingVotes[song.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsDown className={`h-4 w-4 ${song.userVote === 'down' ? 'fill-current' : ''}`} />
                      )}
                    </Button>
                    <span className="text-sm min-w-[1.5rem] text-center">{song.downvotes || 0}</span>
                  </div>
                  
                  {/* Host controls */}
                  {isHost && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeSong(song.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* Play now button (host only) */}
                  {isHost && !song.is_played && song.id !== currentlyPlayingSongId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => playSong(song.id)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 