
"use client";

import { useState } from 'react';
import type { User, ChatRoom } from '@/types/chat';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UserAvatar } from './user-avatar';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  room: ChatRoom | null;
  allUsers: User[];
  onAddMembers: (userIds: string[]) => Promise<void>;
}

export function AddMemberDialog({ isOpen, onOpenChange, room, allUsers, onAddMembers }: AddMemberDialogProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (!room) return null;

  const usersNotInRoom = allUsers.filter(user => !room.participants.includes(user.id));

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleAdd = async () => {
    if (selectedUserIds.length === 0) {
      toast({
        title: 'No users selected',
        description: 'Please select at least one user to add.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      await onAddMembers(selectedUserIds);
      toast({ title: 'Members Added!', description: 'The new members have been added to the group.' });
      onOpenChange(false);
      setSelectedUserIds([]);
    } catch (error) {
      console.error("Error adding members:", error);
      toast({
        title: 'Failed to Add Members',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
      if(isLoading) return;
      onOpenChange(false);
      setSelectedUserIds([]);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Members to "{room.name}"</DialogTitle>
          <DialogDescription>
            Select users to invite to this chat room.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-64 pr-4">
            <div className="space-y-4 py-4">
            {usersNotInRoom.length > 0 ? (
                usersNotInRoom.map(user => (
                    <div key={user.id} className="flex items-center space-x-3">
                         <Checkbox
                            id={`user-${user.id}`}
                            checked={selectedUserIds.includes(user.id)}
                            onCheckedChange={() => handleToggleUser(user.id)}
                        />
                        <Label
                            htmlFor={`user-${user.id}`}
                            className="flex items-center gap-3 w-full cursor-pointer"
                        >
                           <UserAvatar user={user} size="md" />
                           <div className="flex-1">
                                <p className="font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.online ? 'Online' : 'Offline'}</p>
                           </div>
                        </Label>
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                    All available users are already in this room.
                </p>
            )}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleAdd} disabled={isLoading || selectedUserIds.length === 0}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add to Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
