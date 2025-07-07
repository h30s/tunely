import { User as NextAuthUser } from "next-auth";

// Extend NextAuth User type
export interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
}

// Room types
export interface Room {
  id: string;
  name?: string;
  host_id: string;
  created_at: string;
  created_by?: string;
  is_active: boolean;
  updated_at: string;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  is_admin: boolean;
  created_at: string;
}

// Song types
export interface Song {
  id: number;
  room_id: string;
  youtube_id: string;
  title: string;
  thumbnail: string;
  duration: number;
  added_by: string;
  is_played: boolean;
  created_at: string;
  added_by_name?: string;
  upvotes?: number;
  downvotes?: number;
  userVote?: 'up' | 'down' | null;
}

export interface Vote {
  song_id: number;
  user_id: string;
  vote_type: 'up' | 'down';
}

// Playback state
export interface PlaybackState {
  id?: string;
  room_id?: string;
  current_song_id?: string | null;
  is_playing: boolean;
  playback_position: number;
  timestamp?: number;
  updated_at?: number;
}

export interface VideoDetails {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: number; // in seconds
} 