
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { getContactInfo, updateContactInfo } from "@/lib/data";
import type { ContactInfo } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Instagram, Youtube, MessageSquare, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const contactSchema = z.object({
  address: z.string().min(1, "Address is required."),
  phone: z.string().min(1, "Phone number is required."),
  email: z.string().email("Invalid email address."),
  startYear: z.coerce.number().min(2000, "Year must be 2000 or later.").optional(),
  instagram: z.string().url().or(z.literal("")).optional(),
  youtube: z.string().url().or(z.literal("")).optional(),
  whatsapp: z.string().url().or(z.literal("")).optional(),
});

type FormData = z.infer<typeof contactSchema>;

export default function ManageContactPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      address: "",
      phone: "",
      email: "",
      startYear: new Date().getFullYear(),
      instagram: "",
      youtube: "",
      whatsapp: "",
    },
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user || !user.roles.includes('admin')) {
        toast({ variant: 'destructive', title: 'Access Denied' });
        router.push('/');
      } else {
        fetchContact();
      }
    }
  }, [user, authLoading, router, toast]);

  const fetchContact = async () => {
    setIsLoading(true);
    try {
      const contactData = await getContactInfo();
      form.reset(contactData);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch contact information." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (values: FormData) => {
    try {
      await updateContactInfo(values);
      toast({ title: "Success", description: "Contact information updated successfully." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="mt-2 h-4 w-3/4" />
        <Card className="mt-8">
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-8">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">Manage Contact Details</h1>
      <p className="mt-2 text-muted-foreground">Update the contact and social media information displayed in the site footer.</p>

      <Card className="mt-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g., +91 12345 67890" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input type="email" {...field} placeholder="e.g., contact@example.com" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Address</FormLabel>
                    <FormControl><Textarea {...field} placeholder="Complete business address" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <h3 className="text-lg font-medium pt-4 border-t">Site Settings</h3>
               <FormField
                control={form.control}
                name="startYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Copyright Start Year</FormLabel>
                    <FormControl><Input type="number" {...field} placeholder="e.g., 2024" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <h3 className="text-lg font-medium pt-4 border-t">Social Media Links</h3>
              <FormField
                control={form.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Instagram className="h-4 w-4" /> Instagram URL</FormLabel>
                    <FormControl><Input {...field} placeholder="https://instagram.com/yourprofile" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="youtube"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Youtube className="h-4 w-4" /> YouTube URL</FormLabel>
                    <FormControl><Input {...field} placeholder="https://youtube.com/yourchannel" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> WhatsApp Link</FormLabel>
                    <FormControl><Input {...field} placeholder="https://wa.me/91..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
}
