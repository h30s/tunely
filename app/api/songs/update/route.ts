import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../auth/[...nextauth]/route';
import { createSupabaseClient } from '@/lib/supabase/server';

export async function PUT(req: NextRequest) {
  try {
    // Get the session
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get song ID from query params
    const searchParams = req.nextUrl.searchParams;
    const songId = searchParams.get('songId');

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    // Parse request body
    const body = await req.json();
    const { is_played } = body;

    if (typeof is_played !== 'boolean') {
      return NextResponse.json({ error: 'is_played field must be a boolean' }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createSupabaseClient();

    // Get the song to verify room access
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('room_id')
      .eq('id', songId)
      .single();

    if (songError || !song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Check if the user is in the room
    const { data: participant, error: participantError } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', song.room_id)
      .eq('user_id', session.user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'You are not a participant in this room' },
        { status: 403 }
      );
    }

    // Update the song
    const { data: updatedSong, error: updateError } = await supabase
      .from('songs')
      .update({ is_played })
      .eq('id', songId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating song:', updateError);
      return NextResponse.json(
        { error: 'Failed to update song' },
        { status: 500 }
      );
    }

    // Update the room's updated_at timestamp
    await supabase
      .from('rooms')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', song.room_id);

    return NextResponse.json({
      success: true,
      song: updatedSong
    });
  } catch (error) {
    console.error('Error updating song:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// For backward compatibility, also support POST
export async function POST(req: NextRequest) {
  return PUT(req);
} 