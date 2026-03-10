"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Download } from 'lucide-react';
import { SidebarMenuButton, SidebarGroup, SidebarMenu, SidebarMenuItem } from './ui/sidebar';
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
  const [isStandalone, setIsStandalone] = useState(false);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Check if already running in standalone mode (installed app)
    if (
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true
    ) {
      setIsStandalone(true);
    }

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
          setInstallPrompt(null);
        }
    } catch (error) {
        console.error('Error during PWA installation:', error);
    }
  };

  // Don't show if:
  // 1. Not mounted (SSR protection)
  // 2. Already running as a standalone app
  // 3. Browser hasn't provided an install prompt (already installed on device or not supported)
  if (!isMounted || isStandalone || !installPrompt) {
    return null;
  }

  return (
    <SidebarGroup className="bg-primary/10 dark:bg-primary/20 rounded-lg py-2 my-2 border border-primary/20">
      <SidebarMenu>
        <SidebarMenuItem>
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
                  Install this app on your device for a faster and smoother shopping experience. It works just like a native app.
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
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
};

export default PwaInstallButton;
