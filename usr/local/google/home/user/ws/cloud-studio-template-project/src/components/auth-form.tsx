
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, ShoppingCart, LogIn, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail, 
  createUserWithEmailAndPassword,
  updateProfile,
  type User,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PasswordStrength from '@/components/password-strength';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  mobile: z.string().regex(/^\d{10}$/, "A valid 10-digit mobile number is required."),
  confirmMobile: z.string().regex(/^\d{10}$/, "A valid 10-digit mobile number is required."),
  altMobile: z.string().regex(/^\d{10}$/, "A valid 10-digit number is required."),
  confirmAltMobile: z.string().regex(/^\d{10}$/, "A valid 10-digit number is required."),
  email: z.string().email('Invalid email address.'),
  confirmEmail: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  confirmPassword: z.string(),
  addressType: z.enum(['Home', 'Work']),
  addressLine1: z.string().min(1, "Address Line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(6, "Pincode must be 6 digits.").max(6, "Pincode must be 6 digits."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine(data => data.email === data.confirmEmail, {
  message: "Emails don't match",
  path: ["confirmEmail"],
}).refine(data => data.mobile === data.confirmMobile, {
    message: "Mobile numbers don't match",
    path: ["confirmMobile"],
}).refine(data => data.altMobile === data.confirmAltMobile, {
    message: "Alternative mobile numbers don't match",
    path: ["confirmAltMobile"],
});


type AuthFormProps = {
  defaultTab?: 'login' | 'signup';
  onSuccess?: () => void;
};

// Function to generate a random 6-character alphanumeric string
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


  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      mobile: '',
      confirmMobile: '',
      altMobile: '',
      confirmAltMobile: '',
      email: '',
      confirmEmail: '',
      password: '',
      confirmPassword: '',
      addressType: 'Home',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
    },
  });

  async function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Login Successful",
        description: "Welcome back! You are now logged in.",
      });
      onSuccess?.();
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid email or password.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
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
      
      const mainAddress = {
        type: values.addressType,
        line1: values.addressLine1,
        line2: values.addressLine2,
        city: values.city,
        state: values.state,
        postalCode: values.postalCode,
      }

      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        shortId: shortId,
        name: values.name,
        email: values.email,
        mobile: values.mobile,
        altMobiles: values.altMobile ? [{ value: values.altMobile }] : [],
        roles: ['user'],
        addresses: [mainAddress],
        createdAt: new Date(),
      });

      toast({
        title: "Account Created!",
        description: "You have successfully registered.",
        duration: 9000,
      });
      
      router.push('/');

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
  
  async function handleGoogleSignIn() {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const shortId = generateShortId();
        await setDoc(userDocRef, {
          uid: user.uid,
          shortId: shortId,
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          roles: ['user'],
          createdAt: new Date(),
        });
        router.push('/profile-setup');
      } else {
        const userData = userDoc.data();
        const updates: { [key: string]: any } = {};
        if (!userData.shortId) {
            updates.shortId = generateShortId();
        }
        if (!Array.isArray(userData.roles)) {
            updates.roles = ['user'];
            if (userData.role && typeof userData.role === 'string' && userData.role !== 'user') {
                updates.roles.push(userData.role);
            }
            updates.role = undefined;
        }
        if (Object.keys(updates).length > 0) {
            await updateDoc(userDocRef, updates);
        }
        router.push('/');
      }

      toast({
        title: "Sign In Successful",
        description: "Welcome! You have successfully signed in with Google.",
      });
      onSuccess?.();
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Google Sign-In Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    const email = loginForm.getValues("email");
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
      });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description:
          "A password reset link has been sent to your email. Please check your inbox and spam folder.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Password Reset Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  const handleResendVerification = async () => {
    if (!userToVerify) return;
    setLoading(true);
    try {
        await sendEmailVerification(userToVerify);
        toast({
            title: "Verification Email Sent",
            description: "A new verification link has been sent to your email address."
        });
    } catch(error: any) {
        toast({
            variant: "destructive",
            title: "Failed to Resend",
            description: error.message,
        });
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
              Your email address <span className="font-bold">{verificationEmail}</span> has not been verified. Please check your inbox for a verification link, or request a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResendVerification} disabled={loading}>
              {loading ? "Sending..." : "Resend Verification Link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="w-full max-w-md rounded-xl border bg-background/80 p-4 sm:p-6 shadow-lg backdrop-blur-sm">
          <div className="text-center mb-6">
              <h2 className="font-headline text-2xl font-bold uppercase mt-4 flex items-center justify-center gap-2">
                JASA ESSENTIALS <ShoppingCart />
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
                          <div className="text-sm flex justify-end items-center">
                              <Button type="button" variant="link" className="p-0 font-normal" onClick={handlePasswordReset} disabled={loading}>
                                  Forgot Password?
                              </Button>
                          </div>
                          <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? 'Logging in...' : 'Login'}
                          </Button>
                      </form>
                  </Form>
                   <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                      </span>
                      </div>
                  </div>

                  <Button 
                      className="w-full bg-blue-600 text-white hover:bg-blue-700" 
                      onClick={handleGoogleSignIn} 
                      disabled={loading}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="mr-2 h-5 w-5"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.233,4.14-4.082,5.571l6.19,5.238C44.962,35.933,48,30.286,48,24C48,22.659,47.862,21.35,47.611,20.083z"/></svg>
                      Google
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
                      <div className="grid grid-cols-2 gap-4">
                          <FormField
                              control={signupForm.control}
                              name="mobile"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Mobile Number</FormLabel>
                                      <FormControl><Input type="tel" maxLength={10} placeholder="10-digit number" {...field} disabled={loading}/></FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                           <FormField
                              control={signupForm.control}
                              name="confirmMobile"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Confirm Mobile</FormLabel>
                                      <FormControl><Input type="tel" maxLength={10} placeholder="Re-enter number" {...field} disabled={loading}/></FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <FormField
                              control={signupForm.control}
                              name="altMobile"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Alternative Mobile</FormLabel>
                                      <FormControl><Input type="tel" maxLength={10} placeholder="10-digit number" {...field} disabled={loading}/></FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                           <FormField
                              control={signupForm.control}
                              name="confirmAltMobile"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Confirm Alternative</FormLabel>
                                      <FormControl><Input type="tel" maxLength={10} placeholder="Re-enter number" {...field} disabled={loading}/></FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                      </div>
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

                      <h3 className="font-headline text-lg pt-4 border-t">ADDRESS DETAILS</h3>
                      <FormField control={signupForm.control} name="addressType" render={({ field }) => (<FormItem><FormLabel>Address Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select address type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Home">Home</SelectItem><SelectItem value="Work">Work</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField control={signupForm.control} name="addressLine1" render={({ field }) => (
                          <FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input {...field} placeholder="123 Main St" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={signupForm.control} name="addressLine2" render={({ field }) => (
                          <FormItem><FormLabel>Address Line 2 (Optional)</FormLabel><FormControl><Input {...field} placeholder="Apartment, suite, etc." /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <FormField control={signupForm.control} name="city" render={({ field }) => (
                              <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={signupForm.control} name="state" render={({ field }) => (
                              <FormItem><FormLabel>State / Province</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={signupForm.control} name="postalCode" render={({ field }) => (
                              <FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        By creating an account, you agree to our{' '}
                        <Link href="/terms" className="text-primary underline">
                          Terms & Conditions and Privacy Policy
                        </Link>
                        .
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
