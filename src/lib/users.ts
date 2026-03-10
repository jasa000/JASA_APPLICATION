

import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, query, where, arrayUnion } from 'firebase/firestore';
import type { UserProfile, UserRole } from './types';

const usersCollection = collection(db, 'users');

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const querySnapshot = await getDocs(usersCollection);
    return querySnapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
  } catch (error) {
    console.error("Error getting users: ", error);
    throw new Error("Failed to fetch users.");
  }
};

export const getSellers = async (): Promise<UserProfile[]> => {
  try {
    const q = query(usersCollection, where("roles", "array-contains", "seller"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
  } catch (error) {
    console.error("Error getting sellers: ", error);
    throw new Error("Failed to fetch sellers.");
  }
};

export const getEmployees = async (): Promise<UserProfile[]> => {
  try {
    const q = query(usersCollection, where("roles", "array-contains", "employee"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
  } catch (error) {
    console.error("Error getting employees: ", error);
    throw new Error("Failed to fetch employees.");
  }
};


export const updateUserRoles = async (uid: string, roles: UserRole[]): Promise<void> => {
  try {
    const userDoc = doc(db, 'users', uid);
    await updateDoc(userDoc, { roles });
  } catch (error) {
    console.error("Error updating user roles: ", error);
    throw new Error("Failed to update user roles.");
  }
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  try {
    const userDoc = doc(db, 'users', uid);
    
    // Ensure canManageProducts is explicitly set to false if the user is not an employee
    // or if it's not provided for an employee.
    if (data.roles && !data.roles.includes('employee')) {
        data.canManageProducts = false;
    }

    await updateDoc(userDoc, data);

  } catch (error) {
    console.error("Error updating user profile: ", error);
    throw new Error("Failed to update user profile.");
  }
};

    
