
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from "next-themes";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/chat/user-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfileAndAvatar } from '@/services/userService';
import { ArrowLeft, Camera, Loader2, Moon, Sun } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const profileSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }).max(50),
  bio: z.string().max(160, { message: "Bio cannot be longer than 160 characters" }).optional(),
});

type ProfileFormInputs = z.infer<typeof profileSchema>;

const suggestedBios = [
  "Just here for the memes.",
  "Trying to be a rainbow in someone's cloud.",
  "Probably thinking about food.",
  "On a mission to pet all the dogs.",
  "Just a human bean.",
  "Making it up as I go.",
  "Professional overthinker.",
];


export default function SettingsPage() {
  const { authUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFormInputs>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: authUser?.name || '',
      bio: authUser?.bio || '',
    }
  });

  useEffect(() => {
    if (authUser) {
      setValue('name', authUser.name);
      setValue('bio', authUser.bio || '');
    }
  }, [authUser, setValue]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSuggestBio = (bio: string) => {
    setValue('bio', bio, { shouldValidate: true });
  };

  const onSubmit: SubmitHandler<ProfileFormInputs> = async (data) => {
    if (!authUser) {
      toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await updateUserProfileAndAvatar(authUser.id, data, avatarFile);
      toast({ title: "Profile Updated!", description: "Your changes have been saved successfully." });
      router.push('/');
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!authUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-4">
          <Button asChild variant="ghost" className="pl-0">
             <Link href="/" >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Chat
            </Link>
          </Button>
        </div>
        <Card className="w-full shadow-strong">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Manage your profile and application settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              
              <div>
                <h3 className="text-lg font-medium leading-6 text-foreground">Profile</h3>
                <p className="mt-1 text-sm text-muted-foreground">This information will be displayed publicly.</p>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative">
                  <UserAvatar 
                    user={{
                      ...authUser, 
                      avatarUrl: avatarPreview || authUser.avatarUrl,
                    }} 
                    size="lg" 
                    className="h-24 w-24"
                  />
                  <Label htmlFor="avatar-upload" className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90">
                    <Camera className="h-4 w-4" />
                    <Input id="avatar-upload" type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
                  </Label>
                </div>
                <div className="flex-1">
                   <h2 className="text-2xl font-bold">{authUser.name}</h2>
                   <p className="text-sm text-muted-foreground">{authUser.bio || "No bio yet."}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" placeholder="Tell everyone a little about yourself..." {...register("bio")} />
                  {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Or, pick a suggestion:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedBios.map((bio, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-1 px-2.5 rounded-full"
                        onClick={() => handleSuggestBio(bio)}
                      >
                        {bio}
                      </Button>
                    ))}
                  </div>
                </div>

              </div>

              <Separator />
              
              <div>
                <h3 className="text-lg font-medium leading-6 text-foreground">Appearance</h3>
                <p className="mt-1 text-sm text-muted-foreground">Customize the look and feel of the app.</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                      <Label htmlFor="dark-mode" className="font-normal flex items-center">
                          {theme === 'dark' ? <Moon className="mr-2 h-4 w-4"/> : <Sun className="mr-2 h-4 w-4" />}
                          Dark Mode
                      </Label>
                      <p className="text-sm text-muted-foreground">
                          Toggle between light and dark themes.
                      </p>
                  </div>
                  <Switch
                      id="dark-mode"
                      checked={theme === 'dark'}
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
              </div>


              <div className="flex justify-end gap-2 pt-4">
                 <Button type="button" variant="outline" onClick={() => router.push('/')}>
                   Cancel
                 </Button>
                 <Button type="submit" disabled={isLoading}>
                   {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Save Changes
                 </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
