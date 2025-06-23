
"use client";

import { useState } from 'react';
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
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const signupSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const resetSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});


type LoginInputs = z.infer<typeof loginSchema>;
type SignupInputs = z.infer<typeof signupSchema>;
type ResetInputs = z.infer<typeof resetSchema>;


export default function LoginPage() {
    const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { logIn, signUp, resetPassword } = useAuth();
    const { toast } = useToast();

    const loginForm = useForm<LoginInputs>({ resolver: zodResolver(loginSchema) });
    const signupForm = useForm<SignupInputs>({ resolver: zodResolver(signupSchema) });
    const resetForm = useForm<ResetInputs>({ resolver: zodResolver(resetSchema) });

    const handleLogin: SubmitHandler<LoginInputs> = async (data) => {
        setIsLoading(true);
        try {
            await logIn(data.email, data.password);
        } catch (error: any) {
            toast({
                title: "Login Failed",
                description: error.message.replace('Firebase: ', ''),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSignup: SubmitHandler<SignupInputs> = async (data) => {
        setIsLoading(true);
        try {
            await signUp(data.email, data.password);
        } catch (error: any) {
             toast({
                title: "Sign Up Failed",
                description: error.message.replace('Firebase: ', ''),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePasswordReset: SubmitHandler<ResetInputs> = async (data) => {
        setIsLoading(true);
        try {
            await resetPassword(data.email);
            toast({
                title: "Password Reset Email Sent",
                description: `If an account exists for ${data.email}, you will receive instructions to reset your password. Please be sure to check your spam folder.`,
            });
            setMode('login');
        } catch (error: any) {
            toast({
                title: "Reset Failed",
                description: error.message.replace('Firebase: ', ''),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAuthMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        loginForm.reset();
        signupForm.reset();
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md shadow-strong">
             <CardHeader className="items-center text-center">
              <ChatWaveLogo className="h-16 w-auto mb-4" />
                {mode === 'login' && (
                    <>
                        <CardTitle className="text-2xl">Welcome Back!</CardTitle>
                        <CardDescription>Sign in to continue to BLAH BLAH.</CardDescription>
                    </>
                )}
                {mode === 'signup' && (
                    <>
                        <CardTitle className="text-2xl">Create an Account</CardTitle>
                        <CardDescription>Enter your details to get started.</CardDescription>
                    </>
                )}
                {mode === 'reset' && (
                     <>
                        <CardTitle className="text-2xl">Reset Your Password</CardTitle>
                        <CardDescription>Enter your email to receive a password reset link.</CardDescription>
                    </>
                )}
            </CardHeader>

            <CardContent>
                {mode === 'login' && (
                     <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
                        <div className="space-y-2">
                           <Label htmlFor="email-login">Email</Label>
                           <Input id="email-login" type="email" autoComplete="email" placeholder="you@example.com" {...loginForm.register("email")} />
                           {loginForm.formState.errors.email && <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>}
                        </div>
                        <div className="space-y-2 relative">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password-login">Password</Label>
                                <Button variant="link" type="button" className="h-auto p-0 text-xs" onClick={() => setMode('reset')}>
                                    Forgot Password?
                                </Button>
                            </div>
                            <Input id="password-login" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" {...loginForm.register("password")} />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-7 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </Button>
                            {loginForm.formState.errors.password && <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>}
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Log In
                        </Button>
                    </form>
                )}
                {mode === 'signup' && (
                    <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-6">
                         <div className="space-y-2">
                           <Label htmlFor="email-signup">Email</Label>
                           <Input id="email-signup" type="email" autoComplete="email" placeholder="you@example.com" {...signupForm.register("email")} />
                           {signupForm.formState.errors.email && <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>}
                        </div>

                        <div className="space-y-2 relative">
                            <Label htmlFor="password-signup">New Password</Label>
                            <Input id="password-signup" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="At least 6 characters" {...signupForm.register("password")} />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-7 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </Button>
                            {signupForm.formState.errors.password && <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>}
                        </div>
                        <div className="space-y-2 relative">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="••••••••" {...signupForm.register("confirmPassword")} />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-7 h-7 w-7 text-muted-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </Button>
                            {signupForm.formState.errors.confirmPassword && <p className="text-sm text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>}
                        </div>
                        
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Account
                        </Button>
                    </form>
                )}
                {mode === 'reset' && (
                    <form onSubmit={resetForm.handleSubmit(handlePasswordReset)} className="space-y-6">
                        <div className="space-y-2">
                           <Label htmlFor="email-reset">Email</Label>
                           <Input id="email-reset" type="email" autoComplete="email" placeholder="you@example.com" {...resetForm.register("email")} />
                           {resetForm.formState.errors.email && <p className="text-sm text-destructive">{resetForm.formState.errors.email.message}</p>}
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Reset Link
                        </Button>
                    </form>
                )}
            </CardContent>
            <CardFooter className="flex-col">
                 {mode === 'reset' ? (
                     <Button variant="link" onClick={() => setMode('login')}>
                         <ArrowLeft className="mr-2 h-4 w-4" />
                         Back to Login
                     </Button>
                 ) : (
                    <Button variant="link" onClick={toggleAuthMode}>
                       {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                   </Button>
                 )}
            </CardFooter>
          </Card>
        </div>
    );
}
