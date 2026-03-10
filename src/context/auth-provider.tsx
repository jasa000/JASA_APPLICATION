
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc, deleteField } from 'firebase/firestore';
import type { UserProfile, UserRole } from '@/lib/types';

type AuthContextType = {
  user: (User & UserProfile) | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  refreshUserProfile: async () => {},
});

const generateShortId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<(User & UserProfile) | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const fetchAndSetUserProfile = useCallback(async (fbUser: User) => {
    if (!fbUser) return;
    setLoading(true);
    const userDocRef = doc(db, 'users', fbUser.uid);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const userProfile = docSnap.data() as UserProfile & { role?: string, selectedPincode?: any };
            const updates: { [key: string]: any } = {};
            let needsUpdate = false;
            
            // --- Migration Logic ---
            if (userProfile.role && typeof userProfile.role === 'string') {
              updates.roles = ['user', userProfile.role as UserRole].filter(r => r !== 'user');
              updates.role = deleteField();
              needsUpdate = true;
            }
            if (!Array.isArray(userProfile.roles)) {
              updates.roles = ['user'];
              needsUpdate = true;
            }
            if (!userProfile.shortId) {
              updates.shortId = generateShortId();
              needsUpdate = true;
            }
            if (userProfile.selectedPincode !== undefined) {
              updates.userLocation = userProfile.selectedPincode || null;
              updates.selectedPincode = deleteField();
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              await updateDoc(userDocRef, updates);
              const migratedDoc = await getDoc(userDocRef);
              setUser({ ...fbUser, ...(migratedDoc.data() as UserProfile) });
            } else {
              setUser({ ...fbUser, ...userProfile });
            }
        } else {
             const newUserProfile: UserProfile = {
              uid: fbUser.uid,
              shortId: generateShortId(),
              name: fbUser.displayName || 'New User',
              email: fbUser.email || '',
              roles: ['user'],
              userLocation: null,
              createdAt: new Date(),
            };
            await setDoc(userDocRef, newUserProfile);
            setUser({ ...fbUser, ...newUserProfile });
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        setUser(fbUser as (User & UserProfile)); // Set with basic auth info on error
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (firebaseUser) {
        fetchAndSetUserProfile(firebaseUser);
    }
  }, [firebaseUser, fetchAndSetUserProfile]);

  const refreshUserProfile = async () => {
    if (firebaseUser) {
        await fetchAndSetUserProfile(firebaseUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
