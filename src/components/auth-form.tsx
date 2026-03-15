
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, ShoppingCart, LogIn, UserPlus, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  createUserWithEmailAndPassword,
  updateProfile,
  type User,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PasswordStrength from '@/components/password-strength';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  confirmEmail: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine(data => data.email === data.confirmEmail, {
  message: "Emails don't match",
  path: ["confirmEmail"],
});

type AuthFormProps = {
  defaultTab?: 'login' | 'signup';
  onSuccess?: () => void;
};

const generateShortId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export default function AuthForm({ defaultTab = 'login', onSuccess }: AuthFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [userToVerify, setUserToVerify] = useState<User | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot Password States
  const [isForgotPwdOpen, setIsForgotPwdOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      confirmEmail: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      loginForm.setValue('email', rememberedEmail);
      setRememberMe(true);
    }
  }, [loginForm]);

  async function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', values.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      toast({
        title: "Login Successful",
        description: "Welcome back! You are now logged in.",
      });
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or password.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await signOut(auth);
        toast({
          variant: "destructive",
          title: "Account Not Found",
          description: "You don't have an account with this Google email. Please register using the 'Sign Up' tab first.",
        });
      } else {
        toast({
          title: "Login Successful",
          description: `Welcome back, ${user.displayName || 'User'}!`,
        });
        onSuccess?.();
      }
    } catch (error: any) {
       if (error.code !== 'auth/popup-closed-by-user') {
         toast({
          variant: "destructive",
          title: "Sign-In Failed",
          description: error.message,
        });
       }
    } finally {
      setLoading(false);
    }
  }

  async function onSignupSubmit(values: z.infer<typeof signupSchema>) {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(userCredential.user, { displayName: values.name });

      const shortId = generateShortId();
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        shortId: shortId,
        name: values.name,
        email: values.email,
        roles: ['user'],
        createdAt: new Date(),
      });

      toast({
        title: "Account Created!",
        description: "You have successfully registered. Please complete your profile details.",
      });
      
      onSuccess?.();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }
  
  async function handlePasswordReset() {
    if (!forgotEmail) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
      });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      toast({
        title: "Reset Link Sent",
        description: "Check your inbox for instructions to reset your password.",
      });
      setIsForgotPwdOpen(false);
      setForgotEmail("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSendingReset(false);
    }
  }

  const handleResendVerification = async () => {
    if (!userToVerify) return;
    setLoading(true);
    try {
        await sendEmailVerification(userToVerify);
        toast({ title: "Verification Email Sent" });
    } catch(error: any) {
        toast({ variant: "destructive", title: "Failed", description: error.message });
    } finally {
        setLoading(false);
    }
  };
  
  return (
    <>
      <AlertDialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Email Verification Required</AlertDialogTitle>
            <AlertDialogDescription>
              Check your inbox for a verification link for <span className="font-bold">{verificationEmail}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResendVerification} disabled={loading}>
              {loading ? "Sending..." : "Resend Link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isForgotPwdOpen} onOpenChange={setIsForgotPwdOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Reset Password
            </DialogTitle>
            <DialogDescription>
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email Address</Label>
              <Input 
                id="forgot-email" 
                type="email" 
                placeholder="m@example.com" 
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePasswordReset();
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex sm:justify-between gap-2">
            <Button variant="ghost" onClick={() => setIsForgotPwdOpen(false)}>Cancel</Button>
            <Button onClick={handlePasswordReset} disabled={isSendingReset}>
              {isSendingReset ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="w-full max-w-md rounded-xl border border-black dark:border-white bg-background/80 p-4 sm:p-6 shadow-lg backdrop-blur-sm">
          <div className="text-center mb-6">
              <h2 className="font-headline text-2xl font-bold uppercase mt-4 flex items-center justify-center gap-2">
                JASA ESSENTIAL <ShoppingCart />
              </h2>
          </div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')} >
              <TabsList className="grid w-full grid-cols-2 bg-blue-600 p-1 h-auto rounded-md">
                  <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white h-auto py-1 px-1 text-xs sm:text-sm">Login</TabsTrigger>
                  <TabsTrigger value="signup" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white h-auto py-1 px-1 text-xs sm:text-sm">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                   <h3 className="font-headline text-xl mt-4 mb-2 text-muted-foreground font-bold uppercase flex items-center justify-center gap-2">
                       <LogIn /> LOGIN FORM
                   </h3>
                   <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4 pt-4">
                          <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                  <Input type="email" placeholder="m@example.com" {...field} disabled={loading} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                          <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Password</FormLabel>
                              <div className="relative">
                                  <FormControl>
                                  <Input type={showPassword ? 'text' : 'password'} placeholder="Password" {...field} disabled={loading} />
                                  </FormControl>
                                  <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                                  onClick={() => setShowPassword((prev) => !prev)}
                                  >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                              </div>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked as boolean)} disabled={loading} />
                              <Label htmlFor="remember-me" className="font-normal">
                                Remember me
                              </Label>
                            </div>
                            <Button 
                              type="button" 
                              variant="link" 
                              className="p-0 font-normal h-auto" 
                              onClick={() => {
                                setForgotEmail(loginForm.getValues("email"));
                                setIsForgotPwdOpen(true);
                              }} 
                              disabled={loading}
                            >
                                Forgot Password?
                            </Button>
                          </div>
                          <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? 'Logging in...' : 'Login'}
                          </Button>
                      </form>
                  </Form>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or login with
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full border-primary text-primary hover:bg-primary/5 h-11" 
                    onClick={handleGoogleLogin} 
                    disabled={loading}
                  >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.53v2.77h2.63c1.62-1.5 2.56-3.7 2.56-6.32z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-2.63-2.77c-.73.5-1.66.81-2.65.81-2.04 0-3.77-1.39-4.38-3.26H4.07v3.33C5.89 21.39 8.74 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M7.62 15.11C7.46 14.63 7.38 14.12 7.38 13.6s.08-1.02.24-1.51V8.76H4.07C3.54 9.81 3.25 11.01 3.25 12.25s.29 2.44.82 3.49l3.53-2.63z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 7.25c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 3.74 14.97 3 12 3 8.74 3 5.89 4.61 4.07 7.25l3.55 3.33c.61-1.87 2.34-3.26 4.38-3.26z"
                        fill="#EA4335"
                      />
                    </svg>
                    Sign in with Google
                  </Button>
              </TabsContent>
              <TabsContent value="signup">
                   <h3 className="font-headline text-xl mt-4 mb-2 text-muted-foreground font-bold uppercase flex items-center justify-center gap-2">
                       <UserPlus/> REGISTRATION FORM
                   </h3>
                  <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4 pt-4 px-1">
                      <FormField
                      control={signupForm.control}
                      name="name"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                              <Input placeholder="John Doe" {...field} disabled={loading}/>
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                          control={signupForm.control}
                          name="email"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                  <Input type="email" placeholder="m@example.com" {...field} disabled={loading}/>
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                          <FormField
                          control={signupForm.control}
                          name="confirmEmail"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Confirm Email</FormLabel>
                              <FormControl>
                                  <Input type="email" placeholder="Re-enter email" {...field} disabled={loading}/>
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                      </div>

                      <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Password</FormLabel>
                          <div className="relative">
                              <FormControl>
                              <Input type={showPassword ? 'text' : 'password'} placeholder="Password" {...field} onChange={(e) => {
                                  field.onChange(e);
                                  setPassword(e.target.value);
                              }} disabled={loading}/>
                              </FormControl>
                              <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                              onClick={() => setShowPassword((prev) => !prev)}
                              >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                          </div>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                      <PasswordStrength password={password} />
                      <FormField
                      control={signupForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <div className="relative">
                              <FormControl>
                              <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Password" {...field} disabled={loading}/>
                              </FormControl>
                              <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                                  >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                          </div>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                      
                      <div className="text-xs text-muted-foreground pt-2">
                        By creating an account, you agree to our{' '}
                        <Link href="/terms" className="text-primary underline">
                          Terms & Conditions and Privacy Policy
                        </Link>
                        . You can complete your address and mobile details later.
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Creating Account...' : 'Create Account'}
                      </Button>
                  </form>
                  </Form>
              </TabsContent>
          </Tabs>
      </div>
    </>
  );
}
