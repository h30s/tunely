import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";

// This is needed for WebSocket support in Next.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Handle WebSocket connection
export async function GET(request: NextRequest) {
  try {
    // Get roomId from query parameters
    const searchParams = request.nextUrl.searchParams;
    const roomId = searchParams.get('roomId');
    
    if (!roomId) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
    }
    
    // Get the session
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Create Supabase client
    const supabase = createSupabaseClient();
    
    // Get all participants for the room
    const { data: participants, error: participantsError } = await supabase
      .from('room_participants')
      .select(`
        user_id,
        joined_at,
        users:user_id (
          name,
          image
        )
      `)
      .eq('room_id', roomId);
    
    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
    }
    
    return NextResponse.json({ participants });
  } catch (error) {
    console.error("Error handling WebSocket connection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Handle regular HTTP POST request to join a room
export async function POST(request: NextRequest) {
  try {
    // Get the room ID from the request body
    const body = await request.json();
    const { roomId } = body;
    
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }
    
    // Get the session
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      console.error('Room not found:', roomError);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    // Check if the room is active
    if (!room.is_active) {
      return NextResponse.json({ error: 'This room is no longer active' }, { status: 403 });
    }
    
    // Check if the user is already in the room
    const { data: participant, error: participantError } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', session.user.id)
      .single();
    
    if (participant) {
      // User is already in the room, just return success
      return NextResponse.json({ roomId, message: 'Already joined room' });
    }
    
    if (participantError && participantError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected if user is not a participant
      console.error('Error checking participant:', participantError);
      return NextResponse.json({ error: 'Failed to check room participation' }, { status: 500 });
    }
    
    // Add the user to the room
    const { error: joinError } = await supabase
      .from('room_participants')
      .insert({
        room_id: roomId,
        user_id: session.user.id,
        joined_at: new Date().toISOString()
      });
    
    if (joinError) {
      console.error('Error joining room:', joinError);
      return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
    }
    
    // Update the room's updated_at timestamp
    await supabase
      .from('rooms')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', roomId);
    
    return NextResponse.json({ roomId, message: 'Successfully joined room' });
  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 