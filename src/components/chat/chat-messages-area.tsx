
"use client";

import type { ChatMessage, User } from "@/types/chat";
import { MessageBubble } from "./message-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ChatMessagesAreaProps {
  messages: ChatMessage[];
  currentUser: User;
  editingMessageId: string | null;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId:string) => void;
  onStartEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onToggleStar: (messageId: string, currentState: boolean) => void;
  className?: string;
  chatTheme?: string;
}

export function ChatMessagesArea({
  messages,
  currentUser,
  editingMessageId,
  onEditMessage,
  onDeleteMessage,
  onStartEdit,
  onCancelEdit,
  onToggleStar,
  className,
  chatTheme,
}: ChatMessagesAreaProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if(scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages, editingMessageId]);

  if (messages.length === 0) {
    return (
      <div className={cn("flex-1 flex items-center justify-center text-muted-foreground p-4", className)}>
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }
  
  return (
    <ScrollArea className={cn("flex-1 p-4", className)} ref={scrollAreaRef}>
      <div className="space-y-2">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            currentUser={currentUser}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            isEditing={editingMessageId === msg.id}
            onStartEdit={onStartEdit}
            onCancelEdit={onCancelEdit}
            onToggleStar={onToggleStar}
            chatTheme={chatTheme}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
