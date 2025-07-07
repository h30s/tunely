"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "next-auth/react";
import { User } from "@/lib/types";
import { useState } from "react";

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get initials from user's name
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-end">
        <p className="text-sm font-medium">{user.name}</p>
        <Button 
          variant="link" 
          onClick={handleLogout} 
          disabled={isLoading} 
          className="h-auto p-0 text-xs text-muted-foreground"
        >
          {isLoading ? "Signing out..." : "Sign out"}
        </Button>
      </div>
      <Avatar>
        <AvatarImage src={user.image || ""} alt={user.name || "User"} />
        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      </Avatar>
    </div>
  );
} 