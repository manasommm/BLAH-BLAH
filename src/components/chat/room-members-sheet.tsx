"use client";

import { useState, useEffect } from 'react';
import type { User, ChatRoom } from '@/types/chat';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserAvatar } from './user-avatar';
import { Separator } from '../ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RoomMembersSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  room: ChatRoom | null;
  allUsers: User[];
  currentUser: User;
  onUpdateRoomName: (newName: string) => Promise<void>;
}

export function RoomMembersSheet({ 
  isOpen, 
  onOpenChange, 
  room, 
  allUsers, 
  currentUser,
  onUpdateRoomName,
}: RoomMembersSheetProps) {
  const [newRoomName, setNewRoomName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (room) {
      setNewRoomName(room.name);
    }
  }, [isOpen, room]);

  if (!room) return null;

  const isRoomAdmin = room.createdBy === currentUser.id;

  const members = [...allUsers, currentUser] // Make sure current user is in the list
    .filter(user => room.participants.includes(user.id))
    .sort((a, b) => {
        // Sort current user to the top
        if (a.id === currentUser.id) return -1;
        if (b.id === currentUser.id) return 1;
        // Then sort by name
        return a.name.localeCompare(b.name);
    });

  const handleNameChange = async () => {
    if (!newRoomName.trim() || newRoomName.trim() === room.name) {
        return;
    }
    setIsUpdating(true);
    try {
        await onUpdateRoomName(newRoomName.trim());
        toast({ title: "Group name updated!" });
    } catch (error) {
        console.error("Error updating group name:", error);
        toast({ title: "Error", description: "Could not update group name.", variant: "destructive" });
    } finally {
        setIsUpdating(false);
    }
  };


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader className="text-left">
          <SheetTitle>{room.name}</SheetTitle>
          <SheetDescription>
            {room.participants.length} Member{room.participants.length === 1 ? '' : 's'}
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-4" />
        
        {isRoomAdmin && (
          <div className="mb-4 space-y-3">
            <Label htmlFor="group-name" className="font-semibold">Change Group Name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="group-name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                disabled={isUpdating}
                className="h-9"
              />
              <Button 
                onClick={handleNameChange} 
                disabled={isUpdating || !newRoomName.trim() || newRoomName.trim() === room.name}
                size="sm"
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
             <Separator />
          </div>
        )}

        <ScrollArea className="h-[calc(100%-10rem)] pr-4">
            <div className="space-y-4">
            {members.map(member => (
                <div key={member.id} className="flex items-center gap-4">
                   <UserAvatar user={member} size="md" />
                   <div className="flex-1">
                       <p className="font-medium">
                           {member.name}
                           {member.id === currentUser.id && <span className="text-muted-foreground text-sm"> (You)</span>}
                       </p>
                       <p className="text-xs text-muted-foreground">{member.id === room.createdBy ? 'Admin' : 'Member'}</p>
                   </div>
                </div>
            ))}
            </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
