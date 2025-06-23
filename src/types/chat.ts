export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  online: boolean;
  profileComplete?: boolean;
  bio?: string;
  mutedChats?: string[];
  blockedUsers?: string[];
  chatThemes?: { [chatId: string]: string };
}

export interface ChatMessage {
  id:string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: number; 
  edited?: boolean;
  fileUrl?: string;
  fileName?: string;
  status?: 'sent' | 'delivered' | 'read'; 
  starred?: boolean;
}

export interface LastMessage {
  text: string;
  timestamp: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'room';
  avatarUrl?: string; 
  participants: string[]; 
  createdBy: string;
  createdAt: number;
  typing?: string[];
  lastMessage?: LastMessage;
  unreadCount?: number;
}

export interface DirectMessageInfo {
  id: string; 
  type: 'dm';
  userIds: [string, string]; 
  otherUserName: string;
  otherUserAvatar: string;
  otherUserOnline: boolean;
  typing?: string[];
  lastMessage?: LastMessage;
  unreadCount?: number;
}

export type ActiveChat = ChatRoom | DirectMessageInfo;
