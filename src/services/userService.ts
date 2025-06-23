import { db, storage } from "@/lib/firebase";
import type { User } from "@/types/chat";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
  type FirestoreError,
  getDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";


/**
 * Adds a new user to the 'users' collection in Firestore.
 * This is typically called on user signup.
 * @param user The user object to add.
 */
export const addUser = async (user: User): Promise<void> => {
  const userRef = doc(db, "users", user.id);
  // Use setDoc to create or overwrite a document with a specific ID.
  await setDoc(userRef, user);
};

/**
 * Sets up a real-time listener for all users in the 'users' collection.
 * @param onUsersUpdate A callback function that receives the array of users.
 * @param onError A callback function for handling errors.
 * @returns An unsubscribe function to detach the listener.
 */
export const getUsersListener = (
  onUsersUpdate: (users: User[]) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe => {
  const usersCollection = collection(db, "users");

  const unsubscribe = onSnapshot(usersCollection,
    (querySnapshot) => {
      const users = querySnapshot.docs.map(doc => doc.data() as User);
      onUsersUpdate(users);
    },
    (error) => {
      console.error("Error fetching users:", error);
      onError(error);
    }
  );

  return unsubscribe;
};

/**
 * Updates the online status of a user.
 * @param userId The ID of the user to update.
 * @param online The new online status.
 */
export const updateUserStatus = async (userId: string, online: boolean): Promise<void> => {
  if (!userId) return;
  const userRef = doc(db, "users", userId);
  try {
    // Use updateDoc to change the 'online' field without overwriting the whole document.
    await updateDoc(userRef, { online });
  } catch (error) {
    // This can happen if the document doesn't exist yet, which is a race condition
    // during signup. We can safely ignore it, as the user doc creation will set the status.
    if (error instanceof Error && (error as FirestoreError).code === 'not-found') {
      console.warn(`User document for ${userId} not found when updating status. This may be expected during initial signup.`);
    } else {
      console.error("Error updating user status:", error);
    }
  }
};

/**
 * Updates a user's profile information.
 * @param userId The ID of the user to update.
 * @param profileData A partial User object with the fields to update.
 */
export const updateUserProfile = async (userId: string, profileData: Partial<User>): Promise<void> => {
    if (!userId) return;
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, profileData);
};

/**
 * Updates a user's profile information, including a new avatar if provided.
 * @param userId The ID of the user to update.
 * @param profileData An object containing the new name and bio.
 * @param avatarFile The new avatar file to upload (optional).
 */
export const updateUserProfileAndAvatar = async (
  userId: string,
  profileData: { name: string; bio?: string },
  avatarFile?: File | null
): Promise<void> => {
  if (!userId) {
    throw new Error("User ID is required to update profile.");
  }

  const userRef = doc(db, "users", userId);
  const dataToUpdate: Partial<User> = { ...profileData };

  if (avatarFile) {
    // Create a storage reference with a unique path for the user's avatar.
    const storageRef = ref(storage, `avatars/${userId}/${avatarFile.name}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, avatarFile);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Add the URL to the data we're updating in Firestore
    dataToUpdate.avatarUrl = downloadURL;
  }

  // Update the user document in Firestore with the new data
  await updateDoc(userRef, dataToUpdate);
};

/**
 * Mutes or unmutes a chat for a user.
 * @param userId The ID of the user.
 * @param chatId The ID of the chat to mute/unmute.
 */
export const toggleMuteChat = async (userId: string, chatId: string): Promise<void> => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      const isMuted = userData.mutedChats?.includes(chatId);
      await updateDoc(userRef, {
          mutedChats: isMuted ? arrayRemove(chatId) : arrayUnion(chatId),
      });
  }
};

/**
 * Blocks or unblocks another user.
 * @param userId The ID of the user performing the action.
 * @param otherUserId The ID of the user to block/unblock.
 */
export const toggleBlockUser = async (userId: string, otherUserId: string): Promise<void> => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
   if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      const isBlocked = userData.blockedUsers?.includes(otherUserId);
      await updateDoc(userRef, {
          blockedUsers: isBlocked ? arrayRemove(otherUserId) : arrayUnion(otherUserId),
      });
   }
};

/**
 * Updates the theme for a specific chat for a user.
 * @param userId The ID of the user.
 * @param chatId The ID of the chat.
 * @param theme The new theme name.
 */
export const updateUserChatTheme = async (userId: string, chatId: string, theme: string): Promise<void> => {
    if (!userId || !chatId) return;
    const userRef = doc(db, "users", userId);
    try {
        await updateDoc(userRef, {
            [`chatThemes.${chatId}`]: theme,
        });
    } catch (error) {
        console.error("Error updating chat theme:", error);
    }
};
