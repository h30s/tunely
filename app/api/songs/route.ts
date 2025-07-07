import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../auth/[...nextauth]/route';
import { createSupabaseClient } from '@/lib/supabase/server';

// GET: Fetch songs for a room
export async function GET(req: NextRequest) {
  try {
    // Get the session
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get room ID from query params
    const searchParams = req.nextUrl.searchParams;
    const roomId = searchParams.get('roomId');
    const unplayedOnly = searchParams.get('unplayedOnly') === 'true';
    const includeVotes = searchParams.get('includeVotes') === 'true';
    const played = searchParams.get('played');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createSupabaseClient();

    // Check if the user is in the room
    const { data: participant, error: participantError } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', session.user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'You are not a participant in this room' },
        { status: 403 }
      );
    }

    // Query to get songs
    let query = supabase
      .from('songs')
      .select('*')
      .eq('room_id', roomId);

    // Filter by played status if requested
    if (unplayedOnly || played === 'false') {
      query = query.eq('is_played', false);
    } else if (played === 'true') {
      query = query.eq('is_played', true);
    }

    // Order by creation date
    query = query.order('created_at', { ascending: true });
    
    // Apply limit if provided
    if (limit && !isNaN(limit)) {
      query = query.limit(limit);
    }

    // Execute the query
    const { data: songs, error: songsError } = await query;

    if (songsError) {
      console.error('Error fetching songs:', songsError);
      return NextResponse.json(
        { error: 'Failed to fetch songs' },
        { status: 500 }
      );
    }

    // Get user information for all songs
    const userIds = Array.from(new Set(
      songs
        .map(song => song.added_by)
        .filter(Boolean)
    ));

    let userMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);

      if (!usersError && users) {
        userMap = users.reduce((acc, user) => ({
          ...acc,
          [user.id]: user
        }), {});
      }
    }

    // Get votes if requested
    let votesMap: Record<number, { up: number; down: number; userVote?: 'up' | 'down' | null }> = {};
    
    if (includeVotes && songs.length > 0) {
      const songIds = songs.map(song => song.id);
      
      // Get all votes for these songs
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .in('song_id', songIds);
      
      if (!votesError && votes) {
        // Initialize vote counts for each song
        songIds.forEach(songId => {
          votesMap[songId] = { up: 0, down: 0, userVote: null };
        });
        
        // Count votes by type
        votes.forEach((vote: any) => {
          if (votesMap[vote.song_id]) {
            votesMap[vote.song_id][vote.vote_type]++;
            
            // Track the user's own vote
            if (vote.user_id === session.user.id) {
              votesMap[vote.song_id].userVote = vote.vote_type;
            }
          }
        });
      }
    }

    // Add user info and votes to songs
    const songsWithInfo = songs.map(song => {
      const songWithInfo: any = {
        ...song,
        added_by_name: song.added_by && userMap[song.added_by] 
          ? userMap[song.added_by].name 
          : 'Unknown user'
      };
      
      // Add vote information if requested
      if (includeVotes && votesMap[song.id]) {
        songWithInfo.upvotes = votesMap[song.id].up;
        songWithInfo.downvotes = votesMap[song.id].down;
        songWithInfo.userVote = votesMap[song.id].userVote;
      }
      
      return songWithInfo;
    });

    return NextResponse.json({
      songs: songsWithInfo
    });
  } catch (error) {
    console.error('Error fetching songs:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// ... existing POST and DELETE code ... 