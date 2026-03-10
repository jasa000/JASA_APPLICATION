"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Download, Share } from 'lucide-react';
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
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(userAgent));

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
      if (isIos) {
        toast({
          title: 'iOS Installation',
          description: 'To install, tap the Share button and select "Add to Home Screen".',
        });
      }
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

  if (!isMounted) return null;

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
                  {isStandalone ? 'App Already Installed' : (installPrompt || isIos ? 'Install Jasa Essential' : 'Installation Status')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isStandalone ? (
                    'You are already using the Jasa App in standalone mode! You can find it on your home screen or app drawer.'
                  ) : isIos ? (
                    <div className="space-y-4">
                      <p>To install Jasa Essential on your iPhone/iPad:</p>
                      <ol className="list-decimal pl-5 space-y-2">
                        <li className="flex items-center gap-2">
                          Tap the Share button <Share className="h-4 w-4 inline" /> in Safari.
                        </li>
                        <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                        <li>Tap <strong>"Add"</strong> in the top right corner.</li>
                      </ol>
                    </div>
                  ) : installPrompt ? (
                    'Install this app on your device for a faster and smoother shopping experience. It works just like a native app.'
                  ) : (
                    'The installation prompt is not available right now. This can happen if the app is already installed or if your browser doesn\'t support automatic prompts. Check your home screen or browser menu for "Install App".'
                  )}
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