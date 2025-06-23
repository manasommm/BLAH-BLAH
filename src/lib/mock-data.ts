
import type { User, ChatRoom, ChatMessage, DirectMessageInfo } from '@/types/chat';

// currentUserMock is no longer used. authUser from AuthContext is the source of truth.
// The user's own profile is now managed via Firebase Authentication and Firestore.

// usersMock is no longer used. Users are now fetched from the 'users' collection in Firestore.
export const usersMock: User[] = [];

// Chat rooms are now fetched from Firestore. This mock is no longer used.

// Messages are now fetched from Firestore in real-time. This mock is no longer used.
export const messagesMock: { [chatId: string]: ChatMessage[] } = {};

// Note: currentAuthUserId is the ID of the currently authenticated Firebase user
export const getDirectMessageInfo = (currentAuthUserId: string, otherUserId: string, allUsers: User[]): DirectMessageInfo | null => {
  const otherUser = allUsers.find(u => u.id === otherUserId);
  if (!otherUser) return null;

  // Ensure IDs are consistently ordered for the DM ID.
  const sortedUserIds = [currentAuthUserId, otherUser.id].sort();
  const dmId = `dm_${sortedUserIds[0]}_${sortedUserIds[1]}`;
  
  return {
    id: dmId,
    type: 'dm',
    userIds: [currentAuthUserId, otherUser.id], // Store actual UIDs
    otherUserName: otherUser.name,
    otherUserAvatar: otherUser.avatarUrl,
    otherUserOnline: otherUser.online,
  };
};
