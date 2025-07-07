import { redirect } from 'next/navigation';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { createSupabaseClient } from '@/lib/supabase/server';
import RoomClient from '@/components/room/room-client';
import { Room, User } from "@/lib/types";

interface RoomPageProps {
  params: {
    roomId: string;
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = params;
  
  // Get the session
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }
  
  // Create Supabase client
  const supabase = createSupabaseClient();
  
  // Check if the room exists
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .eq('is_active', true)
    .single();
  
  if (roomError || !room) {
    console.error("Room not found or inactive:", roomError);
    redirect('/dashboard?error=room_not_found');
  }
  
  // Check if user is a participant
  const { data: participant, error: participantError } = await supabase
    .from("room_participants")
    .select()
    .eq("room_id", roomId)
    .eq("user_id", session.user.id)
    .single();
  
  // If not a participant, add them
  if (!participant && !participantError) {
    try {
      const { error: joinError } = await supabase
        .from("room_participants")
        .insert({
          room_id: roomId,
          user_id: session.user.id
        });
      
      if (joinError) {
        console.error("Error joining room:", joinError);
        redirect('/dashboard?error=join_failed');
      }
    } catch (error) {
      console.error("Error joining room:", error);
      redirect('/dashboard?error=join_failed');
    }
  } else if (participantError && participantError.code !== 'PGRST116') {
    // PGRST116 is "no rows returned" which is expected if user is not a participant
    console.error("Error checking participant:", participantError);
    redirect('/dashboard?error=participant_check_failed');
  }
  
  // Get all participants with user details
  const { data: participants, error: participantsError } = await supabase
    .from("room_participants")
    .select(`
      user_id,
      joined_at,
      users (
        id,
        name,
        email,
        image
      )
    `)
    .eq("room_id", roomId);
  
  if (participantsError) {
    console.error("Error fetching participants:", participantsError);
    redirect('/dashboard?error=fetch_participants_failed');
  }
  
  // Map participants to the expected User format
  const formattedParticipants: User[] = participants?.map(p => ({
    id: p.user_id,
    name: p.users?.name || 'Anonymous',
    email: p.users?.email,
    image: p.users?.image
  })) || [];
  
  return (
    <RoomClient 
      roomId={roomId}
      room={room as Room}
      participants={formattedParticipants}
      session={session}
    />
  );
} 