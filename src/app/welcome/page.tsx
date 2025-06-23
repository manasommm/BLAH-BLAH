
"use client";

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatWaveLogo } from '@/components/icons/ChatWaveLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { updateUserProfile } from '@/services/userService';

const profileSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }).max(50, { message: "Name cannot be longer than 50 characters" }),
});

type ProfileFormInputs = z.infer<typeof profileSchema>;

export default function WelcomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const { authUser } = useAuth();
  const { toast } = useToast();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFormInputs>({
    resolver: zodResolver(profileSchema),
  });
  
  useEffect(() => {
    // Pre-fill the form with the user's current name
    if (authUser?.name) {
      setValue('name', authUser.name);
    }
  }, [authUser, setValue]);


  const onSubmit: SubmitHandler<ProfileFormInputs> = async (data) => {
    if (!authUser) {
        toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
      // The AuthContext listener will automatically handle the redirect upon data change
      await updateUserProfile(authUser.id, { name: data.name, profileComplete: true });
      toast({ title: "Profile Updated!", description: `Welcome to BLAH BLAH, ${data.name}!` });
      // No need to router.push here, AuthContext will handle it
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
    // Don't setIsLoading(false) on success because the page will be navigating away
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-strong">
        <CardHeader className="items-center text-center">
          <ChatWaveLogo className="h-16 w-auto mb-4" />
          <CardTitle className="text-2xl">Welcome to BLAH BLAH!</CardTitle>
          <CardDescription>Let's set up your profile. How should others see you?</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" type="text" placeholder="e.g., Jane Doe" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !authUser}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save and Continue
            </Button>
          </form>
        </CardContent>
         <CardFooter/>
      </Card>
    </div>
  );
}
