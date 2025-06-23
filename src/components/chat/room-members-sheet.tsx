
"use client";

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

interface RoomMembersSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  room: ChatRoom | null;
  allUsers: User[];
  currentUser: User;
}

export function RoomMembersSheet({ isOpen, onOpenChange, room, allUsers, currentUser }: RoomMembersSheetProps) {
  if (!room) return null;

  const members = [...allUsers, currentUser] // Make sure current user is in the list
    .filter(user => room.participants.includes(user.id))
    .sort((a, b) => {
        // Sort current user to the top
        if (a.id === currentUser.id) return -1;
        if (b.id === currentUser.id) return 1;
        // Then sort by name
        return a.name.localeCompare(b.name);
    });

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
        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
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
