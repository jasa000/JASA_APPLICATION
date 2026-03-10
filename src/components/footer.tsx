
"use client";

import Link from 'next/link';
import { ShoppingCart, MapPin, Phone, Mail, Instagram, Youtube, MessageSquare } from 'lucide-react';
import { getContactInfo, addQuery } from '@/lib/data';
import { useState, useEffect } from 'react';
import type { ContactInfo } from '@/lib/types';
import { useAuth } from '@/context/auth-provider';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const MAX_WORDS = 100;

export default function Footer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getContactInfo().then(setContactInfo);
  }, []);

  const socialLinks = [
    { href: contactInfo?.instagram, icon: Instagram, label: 'Instagram' },
    { href: contactInfo?.youtube, icon: Youtube, label: 'YouTube' },
    { href: contactInfo?.whatsapp, icon: MessageSquare, label: 'WhatsApp' },
  ].filter(link => link.href);

  const handleQuerySubmit = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Login Required', description: 'You must be logged in to send a message.' });
        return;
    }
    if (!query.trim()) {
        toast({ variant: 'destructive', title: 'Message Empty', description: 'Please type a message before submitting.' });
        return;
    }
     if (query.trim().split(/\s+/).length > MAX_WORDS) {
      toast({
        variant: "destructive",
        title: "Message Too Long",
        description: `Please limit your message to ${MAX_WORDS} words.`,
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
        await addQuery({
            message: query,
            userId: user.uid,
            userName: user.name || 'N/A',
            userMobile: user.mobile || 'N/A',
        });
        toast({ title: 'Message Sent!', description: 'Thank you for your feedback. We will get back to you shortly.' });
        setQuery('');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: `Failed to send message: ${error.message}` });
    } finally {
        setIsSubmitting(false);
    }
  };

  const wordCount = query.trim().split(/\s+/).filter(Boolean).length;
  
  const startYear = contactInfo?.startYear || new Date().getFullYear();
  const currentYear = new Date().getFullYear();
  const yearString = startYear >= currentYear ? currentYear : `${startYear} - ${currentYear}`;


  return (
    <footer className="bg-black text-white dark:bg-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="font-headline text-3xl font-bold flex items-center justify-center gap-2">
            JASA ESSENTIAL <ShoppingCart />
          </h2>
          <p className="mt-2 text-muted-foreground max-w-2xl mx-auto text-gray-400">
            Your trusted partner for quality stationery products for students and professionals. We offer a wide range of supplies at competitive prices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Connect With Us */}
          <div>
            <h3 className="font-headline text-lg font-bold mb-4">Connect with us</h3>
             <div className="flex space-x-4 mb-6">
                {socialLinks.map(social => (
                     <AlertDialog key={social.label}>
                        <AlertDialogTrigger asChild>
                            <button className="text-gray-400 hover:text-white">
                                <social.icon className="h-6 w-6" />
                                <span className="sr-only">{social.label}</span>
                            </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Redirect Confirmation</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You are about to be redirected to our {social.label} page. Do you want to continue?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction asChild>
                                    <Link href={social.href!} target="_blank" rel="noopener noreferrer">Continue</Link>
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                ))}
              </div>
              <div>
                <h4 className="font-semibold mb-2">Send a Message</h4>
                <div className='space-y-2'>
                    <Textarea 
                        placeholder="Type your message here..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white rounded-lg focus:ring-primary focus:border-primary"
                    />
                    <div className="text-xs text-right text-gray-400">
                      {wordCount}/{MAX_WORDS} words
                    </div>
                    <AlertDialog>
                       <AlertDialogTrigger asChild>
                          <Button 
                            className="w-full bg-primary hover:bg-primary/90" 
                            disabled={isSubmitting || !query.trim()}
                          >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Submit
                          </Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                           <AlertDialogDescription>
                               Are you sure you want to send this message to the admin?
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleQuerySubmit}>
                                Send Message
                            </AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                    </AlertDialog>
                </div>
              </div>
          </div>

          {/* Shop Links */}
          <div>
            <h3 className="font-headline text-lg font-bold mb-4">Shop Link</h3>
            <ul className="space-y-2">
              <li><Link href="/stationary" className="text-gray-400 hover:text-white">Stationary</Link></li>
              <li><Link href="/books" className="text-gray-400 hover:text-white">Books</Link></li>
              <li><Link href="/electronics" className="text-gray-400 hover:text-white">Electronic Kit</Link></li>
              <li><Link href="/xerox" className="text-gray-400 hover:text-white">Xerox</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="font-headline text-lg font-bold mb-4">Customer Service</h3>
            <ul className="space-y-2">
              <li><Link href="/profile" className="text-gray-400 hover:text-white">My Profile</Link></li>
              <li><Link href="/orders" className="text-gray-400 hover:text-white">Order History</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white">Shopping Policy</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white">Return & Exchanges</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-white">Terms & Conditions</Link></li>
            </ul>
          </div>

          {/* Contact Us */}
          <div>
            <h3 className="font-headline text-lg font-bold mb-4">Contact Us</h3>
            {contactInfo ? (
              <ul className="space-y-4 text-gray-400">
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 mt-1 flex-shrink-0" />
                  <span>{contactInfo.address}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 flex-shrink-0" />
                  <a href={`tel:${contactInfo.phone}`} className="hover:text-white">{contactInfo.phone}</a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 flex-shrink-0" />
                  <a href={`mailto:${contactInfo.email}`} className="hover:text-white">{contactInfo.email}</a>
                </li>
              </ul>
            ) : <p>Loading contact info...</p>}
          </div>
        </div>
      </div>
      <div className="border-t border-gray-700 py-4">
        <div className="container mx-auto text-center text-sm text-gray-400">
          &copy; {yearString} JASA ESSENTIAL. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
