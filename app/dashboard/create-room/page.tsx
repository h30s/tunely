import { auth } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { CreateRoomForm } from "@/components/room/create-room-form";

export default async function CreateRoomPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container py-12">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create a Room</h1>
          <p className="text-muted-foreground mt-2">
            Start a new music session and invite others to join.
          </p>
        </div>
        
        <CreateRoomForm userId={session.user.id} />
      </div>
    </div>
  );
} 