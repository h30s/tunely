import { auth } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { JoinRoomForm } from "@/components/room/join-room-form";

export default async function JoinRoomPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container py-12">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Join a Room</h1>
          <p className="text-muted-foreground mt-2">
            Enter a room code to join an existing music session.
          </p>
        </div>
        
        <JoinRoomForm userId={session.user.id} />
      </div>
    </div>
  );
} 