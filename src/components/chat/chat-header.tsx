
"use client";

import type { ActiveChat, User } from "@/types/chat";
import { UserAvatar } from "./user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, MoreVertical, ShieldAlert, FileText, Loader2, BellOff, UserX, Palette, UserPlus } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  activeChat: ActiveChat | null;
  authUser: User | null;
  className?: string;
  onClearActiveChat?: () => void;
  onSummarizeChat?: () => void;
  isSummarizing?: boolean;
  onMuteChat?: () => void;
  onBlockUser?: () => void;
  onAddMembersClick?: () => void;
  onShowMembers?: () => void;
  onThemeChange?: (theme: string) => void;
  activeChatTheme?: string;
}

export function ChatHeader({ 
  activeChat,
  authUser,
  className, 
  onClearActiveChat,
  onSummarizeChat,
  isSummarizing,
  onMuteChat,
  onBlockUser,
  onAddMembersClick,
  onShowMembers,
  onThemeChange,
  activeChatTheme,
}: ChatHeaderProps) {
  const { isMobile, toggleSidebar } = useSidebar();

  if (!activeChat) {
    return (
      <div className={cn("p-4 border-b h-[73px] flex items-center justify-center bg-card shadow-sm", className)}>
        <p className="text-muted-foreground">Select a chat to start messaging</p>
      </div>
    );
  }

  const name = activeChat.type === 'room' ? activeChat.name : activeChat.otherUserName;
  const avatarUrl = activeChat.type === 'room' ? activeChat.avatarUrl : activeChat.otherUserAvatar;
  const online = activeChat.type === 'dm' ? activeChat.otherUserOnline : undefined;
  
  const isMuted = activeChat && authUser?.mutedChats?.includes(activeChat.id);
  const otherUserId = activeChat?.type === 'dm' ? (activeChat.userIds.find(id => id !== authUser?.id) || '') : '';
  const isBlocked = activeChat?.type === 'dm' && !!otherUserId && authUser?.blockedUsers?.includes(otherUserId);
  const isRoom = activeChat.type === 'room';

  return (
    <div className={cn("p-3 border-b flex items-center justify-between h-[73px] bg-card shadow-sm", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {(isMobile || (onClearActiveChat && isMobile)) && (
           <Button variant="ghost" size="icon" onClick={onClearActiveChat || toggleSidebar} className="md:hidden -ml-2">
             <ArrowLeft size={20} />
             <span className="sr-only">Back to chat list</span>
           </Button>
        )}
        
        <button
          className="flex items-center gap-3 min-w-0 text-left disabled:cursor-default group"
          onClick={isRoom ? onShowMembers : undefined}
          disabled={!isRoom}
          aria-label={isRoom ? "View group members" : undefined}
        >
          {avatarUrl && (
            <UserAvatar user={{ name, avatarUrl, online: online ?? false }} size="md" />
          )}
          {!avatarUrl && activeChat.type === 'dm' && ( 
            <UserAvatar user={{ name, avatarUrl: '', online: online ?? false }} size="md" />
          )}

          <div className="flex-1 min-w-0">
            <h2 className={cn("text-lg font-semibold text-foreground truncate", isRoom && "group-hover:underline")}>{name}</h2>
            {activeChat.type === 'dm' && (
              <p className={cn(
                "text-xs truncate",
                online ? "text-green-500" : "text-muted-foreground"
              )}>
                {online ? "Online" : "Offline"}
              </p>
            )}
            {activeChat.type === 'room' && (
              <p className="text-xs text-muted-foreground truncate">{activeChat.participants.length} members</p>
            )}
          </div>
        </button>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary rounded-full">
            <MoreVertical size={20} />
            <span className="sr-only">Chat options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {onSummarizeChat && (
            <DropdownMenuItem onClick={onSummarizeChat} disabled={isSummarizing || !activeChat}>
              {isSummarizing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              <span>{isSummarizing ? "Summarizing..." : "Summarize Chat"}</span>
            </DropdownMenuItem>
          )}
          {activeChat.type === 'room' && onAddMembersClick && (
            <DropdownMenuItem onClick={onAddMembersClick}>
                <UserPlus className="mr-2 h-4 w-4" />
                <span>Add Members</span>
            </DropdownMenuItem>
          )}
           {onThemeChange && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette className="mr-2 h-4 w-4" />
                <span>Change Theme</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={activeChatTheme} onValueChange={onThemeChange}>
                    <DropdownMenuRadioItem value="default">Default</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="sunset">Sunset</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ocean">Ocean</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="forest">Forest</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="candy">Candy</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}
          <DropdownMenuSeparator />
           <DropdownMenuItem onClick={onMuteChat}>
             <BellOff className="mr-2 h-4 w-4" />
             <span>{isMuted ? "Unmute Chat" : "Mute Chat"}</span>
          </DropdownMenuItem>
          {activeChat.type === 'dm' && (
           <DropdownMenuItem onClick={onBlockUser}>
             <UserX className="mr-2 h-4 w-4" />
             <span>{isBlocked ? "Unblock User" : "Block User"}</span>
          </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
             <ShieldAlert className="mr-2 h-4 w-4" />
             <span>Report (coming soon)</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
