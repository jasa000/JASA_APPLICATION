
"use client";

import { useState, useEffect } from "react";
import { useLocation } from "@/hooks/use-location";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LocationSelector() {
  const { userLocation } = useLocation();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleRedirect = () => {
    router.push('/profile');
  };

  const displayLocation = userLocation
    ? `${userLocation.name}, ${userLocation.pincode}`
    : "Location Not Set";
  
  const displayTooltip = userLocation ? `Your current location: ${userLocation.name}` : "Set your delivery location";

  if (!isClient) {
    return (
      <div className="mt-2 flex h-8 items-center justify-between rounded-full bg-muted/50 px-3">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="h-4 w-4 flex-shrink-0 text-blue-500" />
        </div>
      </div>
    );
  }

  return null;
}
