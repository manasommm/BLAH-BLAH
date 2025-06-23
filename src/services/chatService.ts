import { db, storage } from "@/lib/firebase";
import type { ChatMessage, ChatRoom, User, ActiveChat, DirectMessageInfo } from "@/types/chat";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Unsubscribe,
  type FirestoreError,
  where,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Sets up a real-time listener for messages in a specific chat.
 * @param chatId The ID of the chat to listen to.
 * @param onMessagesUpdate A callback function that receives the array of messages.
 * @param onError A callback function for handling errors.
 * @returns An unsubscribe function to detach the listener.
 */
export const getMessagesListener = (
  chatId: string,
  onMessagesUpdate: (messages: ChatMessage[]) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe => {
  const messagesCollection = collection(db, "chats", chatId, "messages");
  const q = query(messagesCollection, orderBy("timestamp", "asc"));

  const unsubscribe = onSnapshot(q, 
    (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          text: data.text,
          timestamp: data.timestamp?.toMillis() || Date.now(),
          edited: data.edited,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          status: data.status,
          starred: data.starred,
        } as ChatMessage;
      });
      onMessagesUpdate(messages);
    }, 
    (error) => {
      console.error(`Error fetching messages for chat ${chatId}:`, error);
      onError(error);
    }
  );

  return unsubscribe;
};

/**
 * Creates a new chat room.
 * @param name The name of the new chat room.
 * @param createdBy The user who is creating the room.
 */
export const createChatRoom = async (name: string, createdBy: User): Promise<void> => {
  const roomsCollection = collection(db, "chats");
  await addDoc(roomsCollection, {
    name,
    type: 'room',
    createdBy: createdBy.id,
    createdAt: serverTimestamp(),
    participants: [createdBy.id],
    avatarUrl: `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`,
    unreadCounts: { [createdBy.id]: 0 },
  });
};

/**
 * Adds members to an existing chat room.
 * @param chatId The ID of the chat room.
 * @param userIdsToAdd An array of user IDs to add.
 */
export const addMembersToRoom = async (chatId: string, userIdsToAdd: string[]): Promise<void> => {
  if (!userIdsToAdd.length) return;

  const chatRef = doc(db, "chats", chatId);

  const updates: { [key: string]: any } = {
    participants: arrayUnion(...userIdsToAdd),
  };

  userIdsToAdd.forEach(userId => {
    updates[`unreadCounts.${userId}`] = 0;
  });

  await updateDoc(chatRef, updates);
};

/**
 * Sets up a real-time listener for chat rooms a user is part of.
 * @param userId The ID of the user.
 * @param onRoomsUpdate A callback that receives the array of chat rooms.
 * @param onError A callback for handling errors.
 * @returns An unsubscribe function.
 */
export const getChatRoomsListener = (
  userId: string,
  onRoomsUpdate: (rooms: ChatRoom[]) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe => {
  const roomsCollection = collection(db, "chats");
  const q = query(
    roomsCollection,
    where("type", "==", "room"),
    where("participants", "array-contains", userId)
  );

  const unsubscribe = onSnapshot(q,
    (querySnapshot) => {
      const rooms = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const unreadCounts = data.unreadCounts || {};
        return {
          id: doc.id,
          name: data.name,
          type: 'room',
          avatarUrl: data.avatarUrl,
          participants: data.participants,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          lastMessage: data.lastMessage ? {
            ...data.lastMessage,
            timestamp: data.lastMessage.timestamp?.toMillis() || 0,
          } : undefined,
          unreadCount: unreadCounts[userId] || 0,
        } as ChatRoom;
      });
      onRoomsUpdate(rooms);
    },
    (error) => {
      console.error(`Error fetching chat rooms for user ${userId}:`, error);
      onError(error);
    }
  );

  return unsubscribe;
};

/**
 * Sets up a real-time listener for a user's direct messages.
 * @param userId The current user's ID.
 * @param onDmsUpdate Callback with the list of DMs.
 * @param onError Error callback.
 * @returns Unsubscribe function.
 */
export const getDirectMessagesListener = (
  userId: string,
  onDmsUpdate: (dms: DirectMessageInfo[]) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe => {
  const dmsCollection = collection(db, "chats");
  const q = query(
    dmsCollection,
    where("type", "==", "dm"),
    where("participants", "array-contains", userId)
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const dms = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const unreadCounts = data.unreadCounts || {};

      return {
        id: doc.id,
        type: 'dm',
        userIds: data.participants,
        lastMessage: data.lastMessage ? {
          ...data.lastMessage,
          timestamp: data.lastMessage.timestamp?.toMillis() || 0
        } : undefined,
        unreadCount: unreadCounts[userId] || 0,
      } as DirectMessageInfo;
    });
    
    onDmsUpdate(dms);
  }, onError);

  return unsubscribe;
};


/**
 * Sends a new message to a chat, optionally with a file.
 * Also updates the chat document with last message info and unread counts.
 * @param chatId The ID of the chat.
 * @param payload An object containing the core message data.
 * @param file An optional file to upload and attach.
 */
export const sendMessage = async (
  chatId: string,
  payload: Omit<ChatMessage, 'id' | 'timestamp' | 'edited' | 'starred' | 'status'>,
  file?: File
) => {
  try {
    const messagesCollection = collection(db, "chats", chatId, "messages");
    
    const messageData: { [key: string]: any } = {
      ...payload,
      timestamp: serverTimestamp(),
      status: 'sent',
      edited: false,
      starred: false,
    };

    if (file) {
      try {
        const storageRef = ref(storage, `chatFiles/${chatId}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        messageData.fileUrl = downloadURL;
        messageData.fileName = file.name;
      } catch (uploadError) {
        console.error("File upload failed:", uploadError);
        throw new Error("Sorry, there was an error uploading your file. Please try again.");
      }
    }
    
    await addDoc(messagesCollection, messageData);

    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      const chatData = chatSnap.data();
      const participants = chatData.participants || [];
      const unreadCounts = chatData.unreadCounts || {};

      participants.forEach((pId: string) => {
        if (pId !== payload.userId) {
          unreadCounts[pId] = (unreadCounts[pId] || 0) + 1;
        }
      });
      
      const lastMessageText = payload.text ? payload.text : (file ? '📎 Attachment' : '...');

      await updateDoc(chatRef, {
        lastMessage: {
          text: lastMessageText,
          timestamp: serverTimestamp(),
        },
        unreadCounts,
      });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    throw new Error("Message could not be sent.");
  }
};

/**
 * Edits an existing message.
 * @param chatId The ID of the chat containing the message.
 * @param messageId The ID of the message to edit.
 * @param newText The new text for the message.
 */
export const editMessage = async (chatId: string, messageId: string, newText: string) => {
  const messageDocRef = doc(db, "chats", chatId, "messages", messageId);
  await updateDoc(messageDocRef, {
    text: newText,
    edited: true,
    timestamp: serverTimestamp(), // Optionally update timestamp on edit
  });
};

/**
 * Deletes a message.
 * @param chatId The ID of the chat containing the message.
 * @param messageId The ID of the message to delete.
 */
export const deleteMessage = async (chatId: string, messageId: string) => {
  const messageDocRef = doc(db, "chats", chatId, "messages", messageId);
  await deleteDoc(messageDocRef);
};

/**
 * Toggles the starred status of a message.
 * @param chatId The ID of the chat containing the message.
 * @param messageId The ID of the message to star/unstar.
 * @param currentState The current starred state of the message.
 */
export const toggleStarMessage = async (chatId: string, messageId: string, currentState: boolean): Promise<void> => {
  const messageDocRef = doc(db, "chats", chatId, "messages", messageId);
  await updateDoc(messageDocRef, {
    starred: !currentState,
  });
};

/**
 * Ensures a document for a given chat exists in Firestore.
 * This is particularly useful for DMs which might not have a document until the first interaction.
 * @param chat The active chat object.
 */
export const ensureChatDocument = async (chat: ActiveChat): Promise<void> => {
  const chatRef = doc(db, "chats", chat.id);
  const docSnap = await getDoc(chatRef);
  if (!docSnap.exists()) {
    if (chat.type === 'dm') {
      const unreadCounts: {[key: string]: number} = {};
      chat.userIds.forEach(id => unreadCounts[id] = 0);

      await setDoc(chatRef, {
        type: 'dm',
        participants: chat.userIds,
        typing: [], // Initialize typing field
        unreadCounts: unreadCounts,
      });
    }
    // Rooms are created explicitly, so they should already exist.
  }
};


/**
 * Updates the typing status for a user in a specific chat.
 * @param chatId The ID of the chat.
 * @param userId The ID of the user who is typing.
 * @param isTyping Whether the user is typing or has stopped.
 */
export const updateTypingStatus = async (chatId: string, userId: string, isTyping: boolean): Promise<void> => {
  const chatRef = doc(db, "chats", chatId);
  try {
    if (isTyping) {
      await updateDoc(chatRef, {
        typing: arrayUnion(userId),
      });
    } else {
      await updateDoc(chatRef, {
        typing: arrayRemove(userId),
      });
    }
  } catch (error) {
    if ((error as FirestoreError).code === 'not-found') {
        console.warn(`Chat document ${chatId} not found for typing update. It should be created on chat selection.`);
        // Fallback: create the document if it doesn't exist. This can happen in a race condition.
        const dataToSet = {
            typing: isTyping ? [userId] : [],
        };
        await setDoc(chatRef, dataToSet, { merge: true });
    } else {
        console.error("Error updating typing status:", error);
    }
  }
};

/**
 * Sets up a real-time listener for a chat's metadata (e.g., typing users).
 * @param chatId The ID of the chat to listen to.
 * @param onUpdate A callback function that receives the typing user IDs.
 * @param onError A callback for handling errors.
 * @returns An unsubscribe function.
 */
export const getChatMetadataListener = (
  chatId: string,
  onUpdate: (typingUserIds: string[]) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe => {
  const chatRef = doc(db, "chats", chatId);
  return onSnapshot(chatRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Return typing array, ensuring it's not undefined
        onUpdate(data.typing || []);
      } else {
        // Document might not exist yet for a new DM, so there are no typers.
        onUpdate([]);
      }
    },
    (error) => {
      console.error(`Error fetching chat metadata for ${chatId}:`, error);
      onError(error);
    }
  );
};

/**
 * Marks all messages in a chat as read for a specific user by setting their unread count to 0.
 * @param chatId The ID of the chat.
 * @param currentUserId The ID of the user whose perspective we are using.
 */
export const markMessagesAsRead = async (chatId: string, currentUserId: string): Promise<void> => {
    const chatRef = doc(db, "chats", chatId);
    try {
        const chatSnap = await getDoc(chatRef);
        if (chatSnap.exists()) {
            const unreadCount = chatSnap.data().unreadCounts?.[currentUserId] || 0;
            if (unreadCount > 0) {
                 await updateDoc(chatRef, {
                    [`unreadCounts.${currentUserId}`]: 0,
                });
                
                // Also update the read status of individual messages
                const messagesQuery = query(
                    collection(db, `chats/${chatId}/messages`),
                    where('userId', '!=', currentUserId),
                );
                
                const messagesToUpdateSnap = await getDocs(messagesQuery);
                
                const batch = writeBatch(db);
                messagesToUpdateSnap.docs.forEach(doc => {
                    if (doc.data().status !== 'read') {
                        batch.update(doc.ref, { status: 'read' });
                    }
                });
                await batch.commit();
            }
        }
    } catch (error) {
        if ((error as FirestoreError).code === 'not-found') {
            return;
        }
        console.error("Error marking messages as read:", error);
    }
};
