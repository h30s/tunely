import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { auth } from "../../../api/auth/[...nextauth]/route";

// Get votes for a room
export async function GET(request: NextRequest) {
  try {
    // Get the session
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get room ID from query params
    const searchParams = request.nextUrl.searchParams;
    const roomId = searchParams.get('roomId');
    
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }
    
    // Create Supabase client
    const supabase = createSupabaseClient();
    
    // Verify the user is in the room
    const { data: roomParticipant, error: participantError } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', session.user.id)
      .single();
    
    if (participantError || !roomParticipant) {
      return NextResponse.json(
        { error: 'You are not a participant in this room' },
        { status: 403 }
      );
    }
    
    // Get all songs for this room
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('id')
      .eq('room_id', roomId);
    
    if (songsError) {
      return NextResponse.json(
        { error: 'Failed to fetch songs' },
        { status: 500 }
      );
    }
    
    // Get all votes for songs in this room
    const songIds = songs.map(song => song.id);
    
    if (songIds.length === 0) {
      return NextResponse.json({ votes: [] });
    }
    
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('*')
      .in('song_id', songIds);
    
    if (votesError) {
      return NextResponse.json(
        { error: 'Failed to fetch votes' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ votes: votes || [] });
  } catch (error: any) {
    console.error("Error fetching votes:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Add a new vote
export async function POST(request: Request) {
  try {
    // Get the session
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { songId, userId, voteType } = await request.json();

    if (!songId || !userId || !voteType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Verify the user is voting as themselves
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only vote as yourself" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseClient();
    
    const { error } = await supabase
      .from("votes")
      .insert({
        song_id: songId,
        user_id: userId,
        vote_type: voteType,
      });

    if (error) {
      console.error("Error adding vote:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error adding vote:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Update an existing vote
export async function PUT(request: Request) {
  try {
    // Get the session
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { songId, userId, voteType } = await request.json();

    if (!songId || !userId || !voteType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Verify the user is updating their own vote
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only update your own votes" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseClient();
    
    const { error } = await supabase
      .from("votes")
      .update({ vote_type: voteType })
      .match({
        song_id: songId,
        user_id: userId,
      });

    if (error) {
      console.error("Error updating vote:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating vote:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Delete a vote
export async function DELETE(request: Request) {
  try {
    // Get the session
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { songId, userId } = await request.json();

    if (!songId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Verify the user is deleting their own vote
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only delete your own votes" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseClient();
    
    const { error } = await supabase
      .from("votes")
      .delete()
      .match({
        song_id: songId,
        user_id: userId,
      });

    if (error) {
      console.error("Error deleting vote:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting vote:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 