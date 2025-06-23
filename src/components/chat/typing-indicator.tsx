
"use client";

import type { User } from "@/types/chat";

interface TypingIndicatorProps {
  typingUsers: Pick<User, "name">[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) {
    return <div className="h-6 px-4 py-2"></div>; // Keep space consistent
  }

  let text = "";
  if (typingUsers.length === 1) {
    text = `${typingUsers[0].name} is typing...`;
  } else if (typingUsers.length === 2) {
    text = `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
  } else {
    text = `${typingUsers.slice(0, 2).map(u => u.name).join(", ")} and others are typing...`;
  }

  return (
    <div className="h-6 px-4 py-1 text-xs text-muted-foreground animate-pulse">
      {text}
    </div>
  );
}
