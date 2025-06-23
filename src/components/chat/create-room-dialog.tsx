
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateRoomDialogProps {
  onCreateRoom: (name: string) => Promise<void>;
  trigger?: React.ReactNode;
}

export function CreateRoomDialog({ onCreateRoom, trigger }: CreateRoomDialogProps) {
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (roomName.trim().length < 3) {
      toast({
        title: 'Invalid Name',
        description: 'Room name must be at least 3 characters.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      await onCreateRoom(roomName.trim());
      toast({ title: 'Room Created!', description: `The room "${roomName.trim()}" is now ready.` });
      setOpen(false); // Close dialog on success
      setRoomName(''); // Reset input
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: 'Failed to Create Room',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-primary"
            aria-label="New Chat Room"
          >
            <MessageSquarePlus size={20} />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Chat Room</DialogTitle>
          <DialogDescription>
            Give your new chat room a name. You can invite others later (feature coming soon!).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="room-name" className="text-right">
              Name
            </Label>
            <Input
              id="room-name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Project Phoenix"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleCreate} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
