"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Download, Share, EllipsisVertical, Monitor, Smartphone, Tablet } from 'lucide-react';
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
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Device detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(userAgent));
    
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      setDeviceType('tablet');
    } else if (/mobile|iphone|android|blackberry|iemobile|kindle|opera mini|opera mobi/i.test(userAgent)) {
      setDeviceType('mobile');
    } else {
      setDeviceType('desktop');
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
    if (!installPrompt) {
      return;
    }
    
    try {
        installPrompt.prompt();
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

  const getDeviceIcon = () => {
    switch(deviceType) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

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
                <AlertDialogTitle className="flex items-center gap-2">
                  {getDeviceIcon()}
                  {isStandalone ? 'App Already Installed' : (installPrompt ? 'Install Jasa Essential' : 'How to Install')}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="text-sm">
                    {isStandalone ? (
                      <p>You are already using the Jasa App in standalone mode! You can find it on your home screen, desktop, or app drawer.</p>
                    ) : isIos ? (
                      <div className="space-y-4">
                        <p>To install Jasa Essential on your iPhone or iPad:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                          <li className="flex items-center gap-2">
                            Tap the Share button <Share className="h-4 w-4 inline text-blue-500" /> in Safari.
                          </li>
                          <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                          <li>Tap <strong>"Add"</strong> in the top right corner.</li>
                        </ol>
                      </div>
                    ) : installPrompt ? (
                      <p>Install this app on your {deviceType} for a faster and smoother shopping experience. It works just like a native application.</p>
                    ) : (
                      <div className="space-y-4">
                        <p>If the automatic "Install" button doesn't appear, you can install it manually based on your browser:</p>
                        <div className="bg-muted p-3 rounded-md space-y-3">
                          <div>
                            <p className="font-semibold">Desktop (Chrome/Edge):</p>
                            <p className="text-xs">Look for the install icon <Download className="h-3 w-3 inline" /> in the address bar (right side).</p>
                          </div>
                          <div>
                            <p className="font-semibold">Android (Chrome):</p>
                            <ol className="list-decimal pl-5 text-xs space-y-1">
                              <li>Tap the menu <EllipsisVertical className="h-3 w-3 inline" /> in the top right.</li>
                              <li>Select <strong>"Install app"</strong>.</li>
                            </ol>
                          </div>
                          <div>
                            <p className="font-semibold">Samsung Internet:</p>
                            <p className="text-xs">Tap the menu at the bottom and select <strong>"Add page to"</strong> &gt; <strong>"Home screen"</strong>.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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