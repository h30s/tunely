-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS playback_state CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS songs CASCADE;
DROP TABLE IF EXISTS room_participants CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  image TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create rooms table
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  host_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Auto-expire inactive rooms after 24 hours
  CONSTRAINT expire_inactive_rooms CHECK (
    is_active = FALSE OR created_at > NOW() - INTERVAL '24 hours'
  )
);

-- Create room participants table
CREATE TABLE room_participants (
  room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- Create songs table
CREATE TABLE songs (
  id SERIAL PRIMARY KEY,
  youtube_id TEXT NOT NULL,
  room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
  is_played BOOLEAN DEFAULT FALSE,
  added_by UUID REFERENCES users(id),
  title TEXT,
  thumbnail TEXT,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE votes (
  song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  vote_type TEXT CHECK (vote_type IN ('up', 'down')),
  PRIMARY KEY (song_id, user_id)
);

-- Create playback state table
CREATE TABLE playback_state (
  room_id TEXT PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  current_song_id INTEGER REFERENCES songs(id) ON DELETE SET NULL,
  playback_position FLOAT DEFAULT 0,
  is_playing BOOLEAN DEFAULT FALSE
);

-- Create indexes for performance
CREATE INDEX idx_songs_room_id ON songs(room_id);
CREATE INDEX idx_songs_is_played ON songs(is_played);
CREATE INDEX idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX idx_votes_song_id ON votes(song_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_state ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can read all users
CREATE POLICY "Users can read all users" ON users
  FOR SELECT USING (true);

-- Users can update their own user data
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Anyone can read active rooms
CREATE POLICY "Anyone can read active rooms" ON rooms
  FOR SELECT USING (is_active = true);

-- Room host can update their rooms
CREATE POLICY "Room host can update their rooms" ON rooms
  FOR UPDATE USING (auth.uid() = host_id);

-- Anyone can read room participants
CREATE POLICY "Anyone can read room participants" ON room_participants
  FOR SELECT USING (true);

-- Users can insert themselves as participants
CREATE POLICY "Users can insert themselves as participants" ON room_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete themselves from rooms
CREATE POLICY "Users can delete themselves from rooms" ON room_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Anyone can read songs
CREATE POLICY "Anyone can read songs" ON songs
  FOR SELECT USING (true);

-- Users can add songs to rooms they're in
CREATE POLICY "Users can add songs to rooms they're in" ON songs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_participants 
      WHERE room_participants.room_id = room_id 
      AND room_participants.user_id = auth.uid()
    )
  );

-- Anyone can read votes
CREATE POLICY "Anyone can read votes" ON votes
  FOR SELECT USING (true);

-- Users can vote on songs in rooms they're in
CREATE POLICY "Users can vote on songs in rooms they're in" ON votes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM songs 
      JOIN room_participants ON songs.room_id = room_participants.room_id 
      WHERE songs.id = song_id 
      AND room_participants.user_id = auth.uid()
    )
  );

-- Users can update their own votes
CREATE POLICY "Users can update their own votes" ON votes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes" ON votes
  FOR DELETE USING (auth.uid() = user_id);

-- Anyone can read playback state
CREATE POLICY "Anyone can read playback state" ON playback_state
  FOR SELECT USING (true);

-- Only room host can update playback state
CREATE POLICY "Only room host can update playback state" ON playback_state
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.id = room_id 
      AND rooms.host_id = auth.uid()
    )
  );

-- Users can create rooms
CREATE POLICY "Users can create rooms" ON rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Create Realtime publication for tables that need real-time updates
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    rooms, 
    room_participants, 
    songs, 
    votes, 
    playback_state;
COMMIT; 