
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { User, ChatMessage, ChatRoom, ActiveChat, DirectMessageInfo } from "@/types/chat";
import { getDirectMessageInfo } from "@/lib/mock-data"; 
import * as chatService from "@/services/chatService";
import * as userService from "@/services/userService";
import { getUsersListener } from "@/services/userService";
import { ChatWaveLogo } from "@/components/icons/ChatWaveLogo"; 
import { UserAvatar } from "@/components/chat/user-avatar";
import { ChatList } from "@/components/chat/chat-list";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessagesArea } from "@/components/chat/chat-messages-area";
import { MessageInput } from "@/components/chat/message-input";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { Search, LogOut, Settings, Loader2, MessageSquarePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { summarizeChat, type SummarizeChatInput } from "@/ai/flows/summarize-chat-flow";
import { suggestReplies, type SuggestRepliesInput } from "@/ai/flows/suggest-replies-flow";
import { useAuth } from "@/contexts/AuthContext";
import { CreateRoomDialog } from "@/components/chat/create-room-dialog";
import { AddMemberDialog } from "@/components/chat/add-member-dialog";
import { RoomMembersSheet } from "@/components/chat/room-members-sheet";
import Link from "next/link";


function ChatPageContent() {
  const { authUser, logOut } = useAuth();
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeDms, setActiveDms] = useState<DirectMessageInfo[]>([]);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { isMobile, openMobile, setOpenMobile } = useSidebar();

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [chatSummary, setChatSummary] = useState<string | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);

  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isMembersSheetOpen, setIsMembersSheetOpen] = useState(false);
  const [isDeleteGroupAlertOpen, setIsDeleteGroupAlertOpen] = useState(false);
  
  useEffect(() => {
    if (!authUser) return;

    const unsubscribeUsers = getUsersListener(
      (users) => {
        const nonBlockedUsers = users.filter(u => 
          u.id !== authUser.id &&
          !authUser.blockedUsers?.includes(u.id)
        );
        setAllUsers(nonBlockedUsers);
      },
      (error) => {
        console.error("Error fetching users:", error);
        toast({ title: "Error", description: "Could not fetch user list.", variant: "destructive"});
      }
    );

    const unsubscribeRooms = chatService.getChatRoomsListener(
        authUser.id,
        (rooms) => {
            const sortedRooms = rooms.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
            setChatRooms(sortedRooms);
        },
        (error) => {
            console.error("Error fetching chat rooms:", error);
            toast({ title: "Error", description: "Could not fetch chat rooms.", variant: "destructive" });
        }
    );
    
    // Listener for active DM conversations
    const unsubscribeDms = chatService.getDirectMessagesListener(
      authUser.id,
      (dms) => {
        setActiveDms(dms);
      },
      (error) => {
        console.error("Error fetching direct messages:", error);
        toast({ title: "Error", description: "Could not fetch direct messages.", variant: "destructive" });
      }
    );

    return () => {
        unsubscribeUsers();
        unsubscribeRooms();
        unsubscribeDms();
    };
  }, [authUser, toast]);

  const directMessages = useMemo(() => {
    if (!authUser) return [];
    
    const dmMap = new Map<string, DirectMessageInfo>();
    const allUsersPlusSelf = [...allUsers, authUser];

    // First, create a map of all potential DMs from the user list.
    // This ensures every user appears in the list, even without a chat history.
    allUsers.forEach(user => {
        const dmInfo = getDirectMessageInfo(authUser.id, user.id, allUsersPlusSelf);
        if(dmInfo) {
            dmMap.set(dmInfo.id, dmInfo);
        }
    });

    // Then, overwrite/enrich this map with data from active DMs that have messages.
    activeDms.forEach(dm => {
        const otherUser = allUsersPlusSelf.find(u => u.id === dm.userIds.find(id => id !== authUser.id));
        if(otherUser) {
           dmMap.set(dm.id, {
               ...dm,
               otherUserName: otherUser.name,
               otherUserAvatar: otherUser.avatarUrl,
               otherUserOnline: otherUser.online,
           });
        }
    });
    
    // Sort by last message timestamp, with chats without messages at the end.
    return Array.from(dmMap.values()).sort((a, b) => {
        const timeA = a.lastMessage?.timestamp || 0;
        const timeB = b.lastMessage?.timestamp || 0;
        return timeB - timeA;
    });

  }, [allUsers, activeDms, authUser]);

  useEffect(() => {
    if (!activeChat?.id || !authUser) {
      setMessages([]);
      return;
    }

    const unsubscribe = chatService.getMessagesListener(
      activeChat.id,
      (newMessages) => {
        // Filter out messages from users blocked by the current user
        const filteredMessages = newMessages.filter(msg => 
            !authUser.blockedUsers?.includes(msg.userId)
        );
        setMessages(filteredMessages);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        toast({ title: "Error", description: "Could not fetch messages.", variant: "destructive"});
      }
    );

    // After getting messages, update their status to 'read'
    if (authUser) {
      chatService.markMessagesAsRead(activeChat.id, authUser.id);
    }
    
    return () => unsubscribe();
  }, [activeChat?.id, authUser, toast]);

  // Typing indicator listener
  useEffect(() => {
    if (!activeChat?.id || !authUser) {
        setTypingUsers([]);
        return;
    }

    const unsubscribe = chatService.getChatMetadataListener(
        activeChat.id,
        (typingUserIds) => {
            const typingNow = allUsers.filter(user =>
                typingUserIds.includes(user.id) && user.id !== authUser.id
            );
            setTypingUsers(typingNow);
        },
        (error) => {
            console.error("Error fetching typing status:", error);
            toast({ title: "Error", description: "Could not fetch typing indicators.", variant: "destructive"});
        }
    );

    return () => unsubscribe();
  }, [activeChat?.id, allUsers, authUser, toast]);
  
  // AI-suggested replies listener
  useEffect(() => {
    if (!activeChat || !authUser || messages.length === 0) {
      setSuggestedReplies([]);
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.userId === authUser.id) {
      setSuggestedReplies([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsSuggesting(true);
      setSuggestedReplies([]);
      try {
        const messageContext = messages
          .slice(-5)
          .map(msg => `${msg.userName}: ${msg.text}`);
        
        const input: SuggestRepliesInput = { messages: messageContext };
        const result = await suggestReplies(input);
        
        if (result?.suggestions) {
            setSuggestedReplies(result.suggestions);
        }
      } catch (error) {
        console.error("Error fetching reply suggestions:", error);
      } finally {
        setIsSuggesting(false);
      }
    };

    const debounceTimeout = setTimeout(fetchSuggestions, 1000);

    return () => clearTimeout(debounceTimeout);
  }, [messages, activeChat, authUser]);

  const activeChatTheme = useMemo(() => {
    if (!activeChat || !authUser?.chatThemes) return "default";
    return authUser.chatThemes[activeChat.id] || "default";
  }, [activeChat, authUser?.chatThemes]);

  const handleSelectChat = async (chat: ActiveChat) => {
    if (!authUser) return;

    if (chat.type === 'dm') {
      await chatService.ensureChatDocument(chat);
    }
    setActiveChat(chat);
    setEditingMessageId(null);
    setSuggestedReplies([]);
    
    // Mark messages as read when opening a chat
    await chatService.markMessagesAsRead(chat.id, authUser.id);
    
    if (isMobile && openMobile) {
      setOpenMobile(false);
    }
  };
  
  const handleClearActiveChat = () => {
    setActiveChat(null);
  }

  const handleSendMessage = async (text: string, file?: File) => {
    if (!activeChat || !authUser || (text.trim() === "" && !file)) return;
    
    setSuggestedReplies([]);
    
    const messagePayload = {
      userId: authUser.id,
      userName: authUser.name,
      userAvatar: authUser.avatarUrl,
      text: text.trim(),
    };
    
    try {
        await chatService.sendMessage(activeChat.id, messagePayload, file);
    } catch(error: any) {
        console.error("Error sending message:", error);
        toast({ 
            title: "Error Sending Message", 
            description: error.message || "Could not send the message. Please try again.", 
            variant: "destructive"
        });
    }
  };

  const handleCreateRoom = async (roomName: string) => {
    if (!authUser) {
        toast({title: "Not Authenticated", description: "You must be logged in to create a room.", variant: "destructive"});
        return;
    }
    try {
        await chatService.createChatRoom(roomName, authUser);
    } catch (error) {
        console.error("Error creating room:", error);
        toast({title: "Error", description: "Could not create the chat room.", variant: "destructive"});
    }
  };
  
  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!activeChat) return;
    try {
      await chatService.editMessage(activeChat.id, messageId, newText);
      setEditingMessageId(null);
      toast({ title: "Message Edited", description: "Your message has been updated." });
    } catch(error) {
      console.error("Error editing message:", error);
      toast({ title: "Error", description: "Could not edit message.", variant: "destructive"});
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChat) return;
    try {
      await chatService.deleteMessage(activeChat.id, messageId);
      toast({ title: "Message Deleted", description: "Your message has been removed.", variant: "destructive" });
    } catch(error) {
      console.error("Error deleting message:", error);
      toast({ title: "Error", description: "Could not delete message.", variant: "destructive"});
    }
  };
  
  const handleStartEdit = (messageId: string) => {
    setEditingMessageId(messageId);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
  };

  const handleToggleStarMessage = async (messageId: string, currentState: boolean) => {
    if (!activeChat) return;
    try {
      await chatService.toggleStarMessage(activeChat.id, messageId, currentState);
    } catch(error) {
      console.error("Error starring message:", error);
      toast({ title: "Error", description: "Could not update message star.", variant: "destructive"});
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!activeChat || !authUser) return;
    chatService.updateTypingStatus(activeChat.id, authUser.id, isTyping);
  };

  const handleSummarizeChat = async () => {
    if (!activeChat || messages.length === 0) {
      toast({title: "Cannot Summarize", description: "There are no messages in this chat to summarize.", variant: "destructive"});
      return;
    }
    setIsSummarizing(true);
    setChatSummary(null);
    try {
      const messageTexts = messages.map(msg => `${msg.userName}: ${msg.text}`);
      const input: SummarizeChatInput = { messages: messageTexts };
      const result = await summarizeChat(input);
      setChatSummary(result.summary);
      setShowSummaryDialog(true);
    } catch (error) {
      console.error("Error summarizing chat:", error);
      toast({title: "Summarization Failed", description: "Could not summarize the chat at this time.", variant: "destructive"});
    } finally {
      setIsSummarizing(false);
    }
  };
  
  const handleMuteChat = async () => {
    if (!activeChat || !authUser) return;
    try {
        await userService.toggleMuteChat(authUser.id, activeChat.id);
        const isMuted = authUser.mutedChats?.includes(activeChat.id);
        toast({ title: !isMuted ? "Chat Muted" : "Chat Unmuted" });
    } catch (error) {
        console.error("Error toggling mute:", error);
        toast({ title: "Error", description: "Could not update mute status.", variant: "destructive" });
    }
  };

  const handleBlockUser = async () => {
      if (!activeChat || activeChat.type !== 'dm' || !authUser) return;
      const otherUserId = activeChat.userIds.find(id => id !== authUser.id);
      if (!otherUserId) return;

      try {
          await userService.toggleBlockUser(authUser.id, otherUserId);
          const isBlocked = authUser.blockedUsers?.includes(otherUserId);
          toast({ title: !isBlocked ? "User Blocked" : "User Unblocked" });
          
          if (!isBlocked) { // If user was just blocked
             setActiveChat(null);
          }
      } catch (error) {
          console.error("Error toggling block:", error);
          toast({ title: "Error", description: "Could not update block status.", variant: "destructive" });
      }
  };
  
  const handleAddMembers = async (userIds: string[]) => {
      if (!activeChat || activeChat.type !== 'room') {
          throw new Error("No active room selected.");
      }
      await chatService.addMembersToRoom(activeChat.id, userIds);
  };
  
  const handleConfirmDeleteGroup = async () => {
    if (!activeChat || activeChat.type !== 'room' || !authUser || authUser.id !== activeChat.createdBy) {
        toast({ title: "Unauthorized", description: "Only the group admin can delete this group.", variant: "destructive"});
        return;
    }
    try {
        await chatService.deleteChatRoom(activeChat.id);
        toast({ title: "Group Deleted", description: `The group "${activeChat.name}" has been permanently deleted.` });
        setActiveChat(null);
    } catch (error) {
        console.error("Error deleting group:", error);
        toast({ title: "Error", description: "Could not delete the group.", variant: "destructive"});
    } finally {
        setIsDeleteGroupAlertOpen(false);
    }
  };

  const handleSuggestionSelect = () => {
    setSuggestedReplies([]);
  };

  const handleThemeChange = async (theme: string) => {
    if (!activeChat || !authUser) return;
    try {
        await userService.updateUserChatTheme(authUser.id, activeChat.id, theme);
    } catch (error) {
        console.error("Failed to update theme", error);
        toast({ title: "Error", description: "Could not save theme preference.", variant: "destructive" });
    }
  };


  if (!authUser) {
    return null;
  }

  const filteredRooms = chatRooms.filter(room => room.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredDMs = directMessages.filter(dm => dm.otherUserName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-screen w-full bg-background antialiased overflow-hidden">
      <Sidebar collapsible="icon" className="border-r" side="left">
        <SidebarHeader className="p-3 border-b space-y-3">
          <div className="flex items-center justify-between">
            <ChatWaveLogo className="h-7 w-auto" />
            <div className="flex items-center gap-1">
              <CreateRoomDialog onCreateRoom={handleCreateRoom} />
              <div className="md:hidden">
                 <SidebarTrigger/>
              </div>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search chats..."
              className="pl-8 h-9 text-sm rounded-full focus:shadow-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <ChatList
            rooms={filteredRooms}
            directMessages={filteredDMs}
            currentUser={authUser} 
            activeChat={activeChat}
            onSelectChat={handleSelectChat}
          />
        </SidebarContent>
        <SidebarFooter className="p-3 border-t">
          <div className="flex items-center justify-between">
             <UserAvatar user={authUser} size="sm" />
            <div className="ml-2 flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate text-foreground">{authUser.name}</p>
              <p className="text-xs text-muted-foreground">{authUser.online ? 'Online' : 'Offline'}</p>
            </div>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Settings size={18} />
                  <span className="sr-only">Settings</span>
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={logOut}>
              <LogOut size={18} />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex-1 min-w-0 bg-white dark:bg-zinc-900"> 
         <div className={cn("md:hidden p-4 border-b h-[73px] flex items-center justify-between bg-card", activeChat ? "hidden" : "flex")}>
            <SidebarTrigger />
            <p className="text-muted-foreground text-sm">Select a chat</p>
            <div className="w-8"></div> 
        </div>
        <div className={cn("flex-1 flex flex-col max-h-full", activeChat ? "flex" : "hidden md:flex")}>
          <ChatHeader 
            activeChat={activeChat}
            authUser={authUser}
            onClearActiveChat={handleClearActiveChat}
            onSummarizeChat={handleSummarizeChat}
            isSummarizing={isSummarizing}
            onMuteChat={handleMuteChat}
            onBlockUser={handleBlockUser}
            onAddMembersClick={() => setIsAddMemberDialogOpen(true)}
            onShowMembers={() => setIsMembersSheetOpen(true)}
            onThemeChange={handleThemeChange}
            activeChatTheme={activeChatTheme}
            onDeleteGroup={() => setIsDeleteGroupAlertOpen(true)}
          />
          {activeChat ? (
            <>
              <ChatMessagesArea
                messages={messages}
                currentUser={authUser}
                editingMessageId={editingMessageId}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onToggleStar={handleToggleStarMessage}
                chatTheme={activeChatTheme}
                className="flex-grow overflow-y-auto"
              />
              <TypingIndicator typingUsers={typingUsers} />
              <MessageInput 
                onSendMessage={handleSendMessage} 
                onTyping={handleTyping}
                suggestions={suggestedReplies}
                isSuggesting={isSuggesting}
                onSuggestionSelect={handleSuggestionSelect}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-zinc-900">
              <ChatWaveLogo className="h-20 w-auto mb-8 opacity-60" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome to BLAH BLAH</h2>
              <p className="text-muted-foreground max-w-md">
                Select a chat or direct message to start blabbering!
                You can create a new chat room using the button in the sidebar.
              </p>
               <div className="md:hidden mt-6">
                  <SidebarTrigger asChild>
                    <Button variant="outline" className="rounded-full">Open Chats</Button>
                  </SidebarTrigger>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
      {showSummaryDialog && (
        <AlertDialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Chat Summary</AlertDialogTitle>
              <AlertDialogDescription className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap">
                {isSummarizing && !chatSummary ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>Generating summary...</span>
                  </div>
                ) : (
                  chatSummary || "Could not generate summary."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowSummaryDialog(false)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
       <AlertDialog open={isDeleteGroupAlertOpen} onOpenChange={setIsDeleteGroupAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                <span className="font-bold"> {activeChat?.type === 'room' ? activeChat.name : ''} </span>
                group and all of its messages.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteGroup}
                className={buttonVariants({ variant: "destructive" })}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      <AddMemberDialog
        isOpen={isAddMemberDialogOpen}
        onOpenChange={setIsAddMemberDialogOpen}
        room={activeChat?.type === 'room' ? activeChat : null}
        allUsers={allUsers}
        onAddMembers={handleAddMembers}
      />
      <RoomMembersSheet
        isOpen={isMembersSheetOpen}
        onOpenChange={setIsMembersSheetOpen}
        room={activeChat?.type === 'room' ? activeChat : null}
        allUsers={allUsers}
        currentUser={authUser}
      />
    </div>
  );
}


export default function ChatPage() {
  return (
    <SidebarProvider defaultOpen={true}>
      <ChatPageContent />
    </SidebarProvider>
  );
}
