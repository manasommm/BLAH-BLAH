
"use client";

import type { ChatMessage, User } from "@/types/chat";
import { UserAvatar } from "./user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Edit3, Trash2, Paperclip, CornerDownLeft, X, Check, CheckCheck, Clock, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

interface MessageBubbleProps {
  message: ChatMessage;
  currentUser: User;
  onEdit: (messageId: string, newText: string) => void;
  onDelete: (messageId: string) => void;
  isEditing: boolean;
  onStartEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onToggleStar: (messageId: string, currentState: boolean) => void;
  chatTheme?: string;
}

function ReadReceiptIcon({ status }: { status?: 'sent' | 'delivered' | 'read' }) {
  if (status === 'read') {
    return <CheckCheck size={16} className="text-blue-400" />;
  }
  if (status === 'delivered') {
    return <CheckCheck size={16} className="opacity-70" />;
  }
  if (status === 'sent') {
    return <Check size={16} className="opacity-70" />;
  }
  return <Clock size={16} className="opacity-50" />; // Default for pending or unknown
}


export function MessageBubble({
  message,
  currentUser,
  onEdit,
  onDelete,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onToggleStar,
  chatTheme = 'default',
}: MessageBubbleProps) {
  const [editedText, setEditedText] = useState(message.text);
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    setEditedText(message.text);
  }, [message.text]);

  useEffect(() => {
    const updateTimestamp = () => {
      const now = Date.now();
      const seconds = Math.round((now - message.timestamp) / 1000);
      
      if (seconds < 5) {
        setTimeAgo("just now");
      } else if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`);
      } else if (seconds < 3600) {
        setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
      } else if (seconds < 86400) {
        setTimeAgo(`${Math.floor(seconds / 3600)}h ago`);
      } else {
        setTimeAgo(new Date(message.timestamp).toLocaleDateString());
      }
    };
    updateTimestamp();
    const interval = setInterval(updateTimestamp, 60000); 
    return () => clearInterval(interval);
  }, [message.timestamp]);


  const isCurrentUserMessage = message.userId === currentUser.id;

  const handleSaveEdit = () => {
    if (editedText.trim() !== message.text) {
      onEdit(message.id, editedText.trim());
    }
  };

  const isImage = message.fileUrl && /\.(jpeg|jpg|gif|png)$/i.test(message.fileUrl);
  
  const themeStyles = {
    default: { sent: "bg-blue-600", received: "bg-fuchsia-500", textClass: "text-white" },
    sunset: { sent: "bg-orange-500", received: "bg-purple-600", textClass: "text-white" },
    ocean: { sent: "bg-cyan-500", received: "bg-teal-500", textClass: "text-white" },
    forest: { sent: "bg-lime-600", received: "bg-green-600", textClass: "text-white" },
    candy: { sent: "bg-pink-400", received: "bg-yellow-300", textClass: "text-black" },
  };

  const currentTheme = themeStyles[chatTheme as keyof typeof themeStyles] || themeStyles.default;
  const bubbleColor = isCurrentUserMessage ? currentTheme.sent : currentTheme.received;
  const textColor = currentTheme.textClass;
  const isDarkText = textColor === 'text-black';

  return (
    <div
      className={cn(
        "flex items-end gap-2 my-2.5 group", // Reduced vertical margin
        isCurrentUserMessage ? "justify-end" : "justify-start"
      )}
    >
      {!isCurrentUserMessage && (
        <UserAvatar user={{ name: message.userName, avatarUrl: message.userAvatar, online: true }} size="sm" className="self-end mb-1" />
      )}
      <Card
        className={cn(
          "max-w-[75%] md:max-w-[65%] rounded-2xl shadow-md",
          bubbleColor,
          textColor,
          isCurrentUserMessage
            ? "rounded-br-lg"
            : "rounded-bl-lg"
        )}
      >
        {!isCurrentUserMessage && (
          <div className="px-3 pt-2 pb-0.5">
            <p className="text-xs font-medium opacity-80">{message.userName}</p>
          </div>
        )}
        <CardContent className={cn("p-3", isCurrentUserMessage ? "pb-1" : "pb-1 pt-1.5")}>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="text-sm bg-white text-black dark:bg-gray-800 dark:text-white h-20 resize-none focus:border-blue-500"
                aria-label="Edit message"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancelEdit} className="text-xs hover:bg-gray-200 dark:hover:bg-gray-600">
                  <X size={14} className="mr-1" /> Cancel
                </Button>
                <Button variant="secondary" size="sm" onClick={handleSaveEdit} className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800">
                  <CornerDownLeft size={14} className="mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
              {message.fileUrl && (
                <div className="mt-2">
                  {isImage ? (
                    <Image
                      src={message.fileUrl}
                      alt={message.fileName || "Shared image"}
                      width={200}
                      height={150}
                      className="rounded-lg object-cover border"
                      data-ai-hint="shared image"
                    />
                  ) : (
                    <Link
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-lg border transition-colors",
                        isDarkText
                          ? "border-black/20 hover:bg-black/10"
                          : "border-white/20 hover:bg-white/10"
                      )}
                    >
                      <Paperclip size={16} className={isDarkText ? "text-black/80" : "text-white/80"} />
                      <span className={cn("text-xs truncate", isDarkText ? "text-black/90" : "text-white/90")}>
                        {message.fileName || "Shared File"}
                      </span>
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="px-3 py-1.5 text-xs flex justify-end items-center gap-1">
          {message.edited && !isEditing && <span className="opacity-70 mr-1">(edited)</span>}
          {message.starred && !isEditing && (
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
          )}
          <span className={cn("opacity-70", isDarkText ? "text-black/70" : "text-white/70")}>{timeAgo}</span>
          {isCurrentUserMessage && <ReadReceiptIcon status={message.status} />}
        </CardFooter>
      </Card>
      {!isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity data-[state=open]:opacity-100 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <MoreVertical size={16} />
              <span className="sr-only">Message options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onToggleStar(message.id, !!message.starred)}>
              <Star size={14} className="mr-2" />
              <span>{message.starred ? 'Unstar Message' : 'Star Message'}</span>
            </DropdownMenuItem>
            {isCurrentUserMessage && (
              <>
                <DropdownMenuItem onClick={() => onStartEdit(message.id)}>
                  <Edit3 size={14} className="mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(message.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-500 dark:focus:text-red-500 dark:focus:bg-red-500/10">
                  <Trash2 size={14} className="mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
