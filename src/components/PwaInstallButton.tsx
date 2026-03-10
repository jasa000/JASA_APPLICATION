"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Download, Share, EllipsisVertical, PlusSquare } from 'lucide-react';
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
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    
    try {
        // Show the install prompt
        installPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await installPrompt.userChoice;
        
        if (outcome === 'accepted') {
          toast({
            title: 'Installation Started',
            description: 'The app is being added to your device.',
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
            <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isStandalone ? 'App Already Installed' : (installPrompt ? 'Install Jasa Essential' : 'How to Install')}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  {isStandalone ? (
                    'You are already using the Jasa App in standalone mode! You can find it on your home screen or app drawer.'
                  ) : isIos ? (
                    <div className="space-y-4">
                      <p>To install Jasa Essential on your iPhone/iPad:</p>
                      <ol className="list-decimal pl-5 space-y-2">
                        <li className="flex items-center gap-2">
                          Tap the Share button <Share className="h-4 w-4 inline text-blue-500" /> in Safari.
                        </li>
                        <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                        <li>Tap <strong>"Add"</strong> in the top right corner.</li>
                      </ol>
                    </div>
                  ) : installPrompt ? (
                    'Install this app on your device for a faster and smoother shopping experience. It works just like a native app.'
                  ) : (
                    <div className="space-y-4">
                      <p>If the automatic "Install" button doesn't appear, you can install it manually:</p>
                      <div className="bg-muted p-3 rounded-md space-y-3">
                        <p className="font-semibold">For Chrome on Android:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                          <li>Tap the menu <EllipsisVertical className="h-4 w-4 inline" /> in the top right.</li>
                          <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                        </ol>
                        <p className="font-semibold pt-2">For Samsung Internet:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                          <li>Tap the menu button at the bottom.</li>
                          <li>Select <strong>"Add page to"</strong> and then <strong>"Home screen"</strong>.</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
                {installPrompt && !isStandalone && (
                  <AlertDialogAction onClick={handleInstallClick} className="bg-blue-600 hover:bg-blue-700 text-white">
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