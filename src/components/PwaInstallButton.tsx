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
    if (!installPrompt) {
      toast({
        title: 'App Status',
        description: 'The app is already installed or your device handles installation automatically.',
      });
      return;
    }
    
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

  if (!isMounted) {
    return null;
  }

  return (
    <SidebarGroup className="bg-blue-600/10 dark:bg-blue-600/20 rounded-lg p-2 mb-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <SidebarMenuButton className="w-full justify-start gap-2 bg-blue-600 text-white hover:bg-blue-700 hover:text-white transition-colors">
                <Download className="h-4 w-4" />
                <span className="font-semibold">Download Jasa App</span>
              </SidebarMenuButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {installPrompt ? 'Install Jasa Essential?' : 'App Status'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {installPrompt 
                    ? 'Install this app on your device for a faster and smoother shopping experience. It works just like a native app.' 
                    : 'You are already using the Jasa App or your device has it installed. You can find it in your app drawer or home screen.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
                {installPrompt && (
                  <AlertDialogAction onClick={handleInstallClick}>
                    Install Now
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
};

export default PwaInstallButton;
