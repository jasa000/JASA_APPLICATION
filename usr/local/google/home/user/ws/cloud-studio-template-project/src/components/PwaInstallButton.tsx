
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download } from 'lucide-react';
import { SidebarMenuButton } from './ui/sidebar';
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

const PwaInstallButton = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const { toast } = useToast();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // This effect should run only once on the client
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    setIsReady(true); // Component is now mounted and can check for install prompt

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    try {
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        
        if (outcome === 'accepted') {
          toast({
            title: 'Installation Started',
            description: 'The app is being added to your home screen.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Installation Cancelled',
          });
        }
    } catch (error) {
        console.error('Error during PWA installation:', error);
        toast({
            variant: 'destructive',
            title: 'Installation Failed',
            description: 'There was an issue starting the installation.',
        });
    } finally {
        setInstallPrompt(null);
    }
  };

  if (!isReady) {
    // Render nothing on the server or before hydration
    return null;
  }
  
  if (!installPrompt) {
     return (
        <SidebarMenuButton tooltip="App is already installed or not installable on this browser." size="icon" disabled>
            <Download />
        </SidebarMenuButton>
     )
  }

  return (
    <AlertDialog>
        <AlertDialogTrigger asChild>
            <SidebarMenuButton tooltip="Install App" size="icon">
                <Download />
            </SidebarMenuButton>
        </AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Install Jasa Essentials App?</AlertDialogTitle>
                <AlertDialogDescription>
                    Install this application on your device for quick and easy access, just like a native app.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleInstallClick}>
                    Install
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  );
};

export default PwaInstallButton;
