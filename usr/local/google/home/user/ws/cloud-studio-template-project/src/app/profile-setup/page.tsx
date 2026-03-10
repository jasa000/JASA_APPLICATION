
"use client";

import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUserProfile } from "@/lib/users";
import { Loader2 } from "lucide-react";

const addressSchema = z.object({
  type: z.enum(['Home', 'Work']),
  line1: z.string().min(1, "Address Line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(6, "Pincode must be 6 digits.").max(6, "Pincode must be 6 digits."),
});

const profileSetupSchema = z.object({
  altMobiles: z.array(z.object({ value: z.string().regex(/^\d{10}$/, "Must be a 10-digit number.") })).optional(),
  addresses: z.array(addressSchema).optional(),
});

type ProfileSetupFormData = z.infer<typeof profileSetupSchema>;

export default function ProfileSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<ProfileSetupFormData>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      altMobiles: [{ value: "" }],
      addresses: [],
    },
  });

  const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
    control: form.control,
    name: "addresses",
  });

  const { fields: altMobiles, append: appendAltMobile, remove: removeAltMobile } = useFieldArray({
    control: form.control,
    name: "altMobiles",
  });
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  async function onSubmit(values: ProfileSetupFormData) {
    if (!user) return;
    try {
      const profileData = {
          altMobiles: values.altMobiles?.filter(m => m.value),
          addresses: values.addresses,
      };
      await updateUserProfile(user.uid, profileData);
      toast({
        title: "Profile Updated",
        description: "Your additional information has been saved.",
      });
      router.push('/'); // Redirect to homepage after setup
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. " + error.message,
      });
    }
  }

  const handleSkip = () => {
    router.push('/');
  }

  if (authLoading || !user) {
      return (
          <div className="flex min-h-screen items-center justify-center p-4">
              <Loader2 className="h-12 w-12 animate-spin" />
          </div>
      )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle className="text-2xl font-headline">Complete Your Profile</CardTitle>
                <CardDescription>
                    Add some more details to your account. You can also do this later from your profile page.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-medium">Alternative Mobile Numbers</h3>
                            {altMobiles.map((field, index) => (
                                <FormField
                                    key={field.id}
                                    control={form.control}
                                    name={`altMobiles.${index}.value`}
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-2">
                                            <FormControl>
                                                <Input type="number" {...field} placeholder={`Alternative Mobile ${index + 1}`} />
                                            </FormControl>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeAltMobile(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                            {altMobiles.length < 2 && (
                                <Button type="button" variant="outline" size="sm" onClick={() => appendAltMobile({ value: '' })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Number
                                </Button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-medium">Shipping Addresses</h3>
                             {addressFields.map((field, index) => (
                                <div key={field.id} className="space-y-4 rounded-lg border p-4">
                                     <div className="flex justify-between items-center">
                                        <h4 className="font-semibold">Address {index + 1}</h4>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAddress(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                    <FormField control={form.control} name={`addresses.${index}.type`} render={({ field }) => (
                                        <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Home">Home</SelectItem><SelectItem value="Work">Work</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name={`addresses.${index}.line1`} render={({ field }) => (
                                        <FormItem><FormLabel>Line 1</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name={`addresses.${index}.line2`} render={({ field }) => (
                                        <FormItem><FormLabel>Line 2 (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField control={form.control} name={`addresses.${index}.city`} render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`addresses.${index}.state`} render={({ field }) => (<FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`addresses.${index}.postalCode`} render={({ field }) => (<FormItem><FormLabel>Pincode</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                </div>
                             ))}
                             {addressFields.length < 2 && (
                                <Button type="button" variant="outline" size="sm" onClick={() => appendAddress({ type: 'Home', line1: '', city: '', state: '', postalCode: '' })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Address
                                </Button>
                             )}
                        </div>
                        <CardFooter className="flex justify-end gap-2 p-0 pt-6">
                            <Button type="button" variant="ghost" onClick={handleSkip}>Do it Later</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : "Save & Continue"}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  )
}
