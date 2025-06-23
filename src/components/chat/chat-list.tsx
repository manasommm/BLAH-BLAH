
"use client";

import type { ChatRoom, DirectMessageInfo, User, ActiveChat, LastMessage } from "@/types/chat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "./user-avatar";
import { cn } from "@/lib/utils";
import { Users, MessageSquare, Hash } from "lucide-react";
import { format } from 'date-fns';


const formatTimestamp = (timestamp: number) => {
  return format(new Date(timestamp), "HH:mm");
};

interface ChatListItemProps {
    chat: ChatRoom | DirectMessageInfo;
    isActive: boolean;
    onSelectChat: (chat: ActiveChat) => void;
    currentUser: User;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chat, isActive, onSelectChat, currentUser }) => {
    const isRoom = chat.type === 'room';
    const name = isRoom ? chat.name : chat.otherUserName;
    const avatarUrl = isRoom ? chat.avatarUrl : chat.otherUserAvatar;
    const online = isRoom ? undefined : chat.otherUserOnline;

    const lastMessageText = chat.lastMessage?.text ?? (isRoom ? 'No messages in this room yet.' : 'Start the conversation!');
    const lastMessageTime = chat.lastMessage?.timestamp ? formatTimestamp(chat.lastMessage.timestamp) : '';
    const unreadCount = chat.unreadCount ?? 0;

    return (
        <li>
            <button
                onClick={() => onSelectChat(chat)}
                className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors",
                    isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/50"
                )}
                aria-current={isActive ? "page" : undefined}
            >
                {isRoom && !avatarUrl ? (
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-muted-foreground shrink-0">
                        <Users size={20}/>
                    </div>
                ) : (
                    <UserAvatar user={{ name, avatarUrl: avatarUrl ?? '', online: online ?? false }} size="md" />
                )}

                <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold truncate text-foreground">{name}</p>
                        {lastMessageTime && (
                           <p className="text-xs text-muted-foreground shrink-0 ml-2">{lastMessageTime}</p>
                        )}
                    </div>
                    <div className="flex justify-between items-center">
                         <p className="text-sm text-muted-foreground truncate">{lastMessageText}</p>
                         {unreadCount > 0 && (
                            <div className="ml-2 shrink-0 bg-green-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                {unreadCount}
                            </div>
                         )}
                    </div>
                </div>
            </button>
        </li>
    );
};


interface ChatListProps {
  rooms: ChatRoom[];
  directMessages: DirectMessageInfo[];
  currentUser: User;
  activeChat: ActiveChat | null;
  onSelectChat: (chat: ActiveChat) => void;
  className?: string;
}

export function ChatList({
  rooms,
  directMessages,
  currentUser,
  activeChat,
  onSelectChat,
  className,
}: ChatListProps) {

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="p-2 space-y-4">
        <div>
          <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
            <Hash className="h-4 w-4 mr-2" /> Chat Rooms
          </h3>
          <ul className="space-y-1">
            {rooms.map((room) => (
              <ChatListItem
                key={room.id}
                chat={room}
                currentUser={currentUser}
                isActive={activeChat?.id === room.id}
                onSelectChat={onSelectChat}
              />
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" /> Direct Messages
          </h3>
          <ul className="space-y-1">
            {directMessages.map((dm) => (
               <ChatListItem
                key={dm.id}
                chat={dm}
                currentUser={currentUser}
                isActive={activeChat?.id === dm.id}
                onSelectChat={onSelectChat}
              />
            ))}
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
}
