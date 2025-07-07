import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { auth } from "../../auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  try {
    console.log("Starting song add process");
    
    // Get session and verify user is authenticated
    const session = await auth();
    
    if (!session?.user) {
      console.log("User not authenticated");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log("User authenticated:", session.user.id);
    
    // Parse request body
    const body = await request.json();
    const { roomId, youtubeId, title, artist, duration, thumbnailUrl } = body;
    
    console.log("Received song data:", { roomId, youtubeId, title, duration, thumbnailUrl });
    
    // Validate required fields
    if (!roomId || !youtubeId || !title) {
      console.log("Missing required fields");
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create Supabase client
    const supabase = createSupabaseClient();
    
    // Check if the room exists
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (roomError || !room) {
      console.log("Room not found:", roomError);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    console.log("Room found:", room.id);
    
    // Check if user is in the room
    const { data: participant, error: participantError } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', session.user.id)
      .single();
    
    if (participantError || !participant) {
      console.log("User not in room:", participantError);
      return NextResponse.json({ error: 'You are not in this room' }, { status: 403 });
    }
    
    console.log("User is a participant in the room");
    
    // Check if the song already exists in the queue
    const { data: existingSongs, error: songCheckError } = await supabase
      .from('songs')
      .select('*')
      .eq('room_id', roomId)
      .eq('youtube_id', youtubeId)
      .eq('is_played', false);
    
    if (existingSongs && existingSongs.length > 0) {
      console.log("Song already in queue");
      return NextResponse.json({ error: 'Song is already in the queue' }, { status: 400 });
    }
    
    console.log("Song not in queue, proceeding to add");
    
    // Add the song to the queue
    const { data: newSong, error: insertError } = await supabase
      .from('songs')
      .insert({
        room_id: roomId,
        youtube_id: youtubeId,
        title,
        thumbnail: thumbnailUrl || '',
        duration: duration || 0,
        added_by: session.user.id,
        is_played: false
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error adding song:', insertError);
      return NextResponse.json({ error: 'Failed to add song' }, { status: 500 });
    }
    
    console.log("Song added successfully:", newSong);
    
    // Update the room's updated_at timestamp to trigger WebSocket events
    await supabase
      .from('rooms')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', roomId);
    
    console.log("Room updated_at timestamp updated");
    
    return NextResponse.json({ success: true, song: newSong });
  } catch (error) {
    console.error('Error adding song:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 