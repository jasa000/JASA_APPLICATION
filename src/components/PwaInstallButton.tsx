
"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Download, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
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
import { useIsMobile } from '@/hooks/use-mobile';

const PwaInstallButton = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
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
        toast({
            variant: 'destructive',
            title: 'Installation Failed',
            description: 'There was an issue starting the installation.',
        });
    } finally {
        setInstallPrompt(null);
        setIsDialogOpen(false);
    }
  };

  const renderDialogContent = () => {
    if (installPrompt) {
      return (
        <>
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
        </>
      );
    }

    return (
      <>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            App Not Installable
          </AlertDialogTitle>
          <AlertDialogDescription>
            This app may already be installed on your device, or your browser may not support PWA installation.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogFooter>
      </>
    );
  };

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size={isMobile ? "icon" : "default"} className='rounded-full h-9 w-9 md:w-auto text-blue-500 bg-white hover:bg-white/90'>
          <Download className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
          <span className="hidden md:inline">Install App</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {renderDialogContent()}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PwaInstallButton;
