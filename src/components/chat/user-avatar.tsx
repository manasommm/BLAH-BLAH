
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { User } from "@/types/chat";

interface UserAvatarProps {
  user: Pick<User, "name" | "avatarUrl" | "online">;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({ user, size = "md", className }: UserAvatarProps) {
  const avatarSizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const statusSizeClasses = {
    sm: "h-2 w-2 border",
    md: "h-2.5 w-2.5 border-2",
    lg: "h-3 w-3 border-2",
  };

  const statusPositionClasses = {
    sm: "bottom-0 right-0",
    md: "bottom-0 right-0",
    lg: "bottom-0.5 right-0.5",
  }

  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  return (
    <div className={cn("relative inline-block shrink-0", className)}>
      <Avatar className={avatarSizeClasses[size]} data-ai-hint="profile picture">
        <AvatarImage src={user.avatarUrl} alt={user.name} />
        <AvatarFallback className="bg-muted-foreground/20 text-muted-foreground">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
      {user.online && (
        <span
          title="Online"
          aria-label="Online status"
          className={cn(
            "absolute rounded-full bg-green-500 border-background",
            statusSizeClasses[size],
            statusPositionClasses[size]
          )}
        />
      )}
    </div>
  );
}
