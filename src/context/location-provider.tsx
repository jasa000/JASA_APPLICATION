
"use client";

import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { UserLocation } from '@/lib/types';
import { useAuth } from './auth-provider';
import { updateUserProfile } from '@/lib/users';

type LocationContextType = {
  userLocation: UserLocation | null;
  setUserLocation: (location: UserLocation | null) => void;
};

export const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [userLocation, setUserLocationState] = useState<UserLocation | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize from user profile or localStorage
    if (user) {
        // Only set state if user.userLocation is not undefined
        if(user.userLocation !== undefined) {
          setUserLocationState(user.userLocation || null);
        }
    } else {
        try {
            const storedLocation = localStorage.getItem('userLocation');
            if (storedLocation) {
                setUserLocationState(JSON.parse(storedLocation));
            }
        } catch (error) {
            console.error("Failed to load location from localStorage", error);
        }
    }
    setIsInitialized(true);
  }, [user]);

  const setUserLocation = useCallback((location: UserLocation | null) => {
    setUserLocationState(location);

    if (user?.uid) {
        updateUserProfile(user.uid, { userLocation: location })
            .catch(error => console.error("Failed to save location to user profile:", error));
    }

    try {
        if (location) {
            localStorage.setItem('userLocation', JSON.stringify(location));
        } else {
            localStorage.removeItem('userLocation');
        }
    } catch (error) {
        console.error("Failed to save location to localStorage", error);
    }
  }, [user?.uid]);
  
  const value = isInitialized ? { userLocation, setUserLocation } : { userLocation: null, setUserLocation: () => {} };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
