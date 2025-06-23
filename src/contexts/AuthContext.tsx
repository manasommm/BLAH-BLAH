
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
  type Unsubscribe,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import type { User } from '@/types/chat';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUserStatus } from '@/services/userService';

interface AuthContextType {
  authUser: User | null;
  loading: boolean;
  signUp: (email: string, pass: string) => Promise<FirebaseUser | null>;
  logIn: (email: string, pass:string) => Promise<FirebaseUser | null>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FirebaseNotConfigured = () => (
  <div className="flex min-h-screen items-center justify-center bg-background p-4">
    <div className="w-full max-w-lg rounded-lg border border-destructive/50 bg-card p-6 text-center shadow-strong">
      <h1 className="text-2xl font-bold text-destructive mb-3">Firebase Not Configured</h1>
      <p className="text-foreground mb-2">The application cannot connect to Firebase because the necessary API keys are missing.</p>
      <p className="text-muted-foreground">To fix this, create a file named <code className="bg-muted px-1.5 py-1 rounded-sm text-sm font-semibold text-foreground">.env.local</code> in the project's root directory. Then, copy the contents of <code className="bg-muted px-1.5 py-1 rounded-sm text-sm font-semibold text-foreground">.env.example</code> into it and fill in your Firebase project credentials.</p>
    </div>
  </div>
);


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    };
    
    const handleBeforeUnload = async () => {
        if (auth.currentUser) {
            // This is a best-effort attempt. The browser doesn't guarantee completion.
            await updateUserStatus(auth.currentUser.uid, false);
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    let userDocListener: Unsubscribe | undefined;

    const authStateListener = onAuthStateChanged(auth, (firebaseUser) => {
      if (userDocListener) {
        userDocListener();
      }

      if (firebaseUser) {
        setLoading(true);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        userDocListener = onSnapshot(userRef, async (docSnap) => {
          try {
              if (docSnap.exists()) {
                const userData = docSnap.data() as User;
                setAuthUser(userData);
                if (!userData.online) {
                    await updateUserStatus(firebaseUser.uid, true);
                }
              } else {
                const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User';
                const newUser: User = {
                  id: firebaseUser.uid,
                  name,
                  avatarUrl: `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`,
                  online: true,
                  profileComplete: false,
                };
                await setDoc(userRef, newUser);
              }
          } catch(error: any) {
             console.error("Error processing user data:", error);
             toast({ title: "Error", description: "Could not sync user profile.", variant: "destructive" });
             await logOut();
          } finally {
             setLoading(false);
          }
        }, (error) => {
            console.error("User doc listener error:", error);
            toast({ title: "Connection Error", description: "Failed to listen for profile updates.", variant: "destructive" });
            logOut();
            setLoading(false);
        });

      } else {
        setAuthUser(null);
        setLoading(false);
      }
    });

    return () => {
      authStateListener();
      if (userDocListener) {
        userDocListener();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);
  

  useEffect(() => {
    if (loading || !isFirebaseConfigured) return;

    const isAuthPage = pathname === '/login' || pathname === '/signup';
    const isWelcomePage = pathname === '/welcome';

    if (!authUser) {
      if (!isAuthPage && !isWelcomePage) {
        router.push('/login');
      }
    } else {
      if (!authUser.profileComplete) {
        if (!isWelcomePage) {
          router.push('/welcome');
        }
      } else {
        if (isAuthPage || isWelcomePage) {
          router.push('/');
        }
      }
    }
  }, [authUser, loading, pathname, router]);

  const signUp = async (email: string, pass: string): Promise<FirebaseUser | null> => {
    if (!isFirebaseConfigured) throw new Error("Firebase not configured");
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  };

  const logIn = async (email: string, pass: string): Promise<FirebaseUser | null> => {
    if (!isFirebaseConfigured) throw new Error("Firebase not configured");
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  };

  const logOut = async () => {
    if (!isFirebaseConfigured) return;
    if (authUser) {
      await updateUserStatus(authUser.id, false);
    }
    await signOut(auth);
    router.push('/login');
  };
  
  const resetPassword = async (email: string): Promise<void> => {
    if (!isFirebaseConfigured) throw new Error("Firebase not configured");
    await sendPasswordResetEmail(auth, email);
  };
  
  if (!isFirebaseConfigured) {
    return <FirebaseNotConfigured />;
  }


  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-foreground">Loading BLAH BLAH...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ authUser, loading, signUp, logIn, logOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
