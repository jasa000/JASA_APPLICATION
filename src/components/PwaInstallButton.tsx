
"use client";

import { useState, useEffect } from 'react';
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

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
        }
    } catch (error) {
        console.error('Error during PWA installation:', error);
    } finally {
        setInstallPrompt(null);
    }
  };

  if (!isMounted || !installPrompt) {
    return null;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <SidebarMenuButton className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground">
          <Download className="h-4 w-4" />
          <span className="font-semibold">Install Jasa App</span>
        </SidebarMenuButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Install Jasa Essential?</AlertDialogTitle>
          <AlertDialogDescription>
            Install this app on your device for a faster and smoother shopping experience.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Later</AlertDialogCancel>
          <AlertDialogAction onClick={handleInstallClick}>
            Install Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PwaInstallButton;
