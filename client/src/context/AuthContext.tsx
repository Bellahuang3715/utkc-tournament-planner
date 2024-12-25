import React, { createContext, useContext, useEffect, useState } from "react";
import { showNotification } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import { NextRouter } from 'next/router';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile,
  User,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { auth } from "../services/firebase";
import { UserInterface } from "../interfaces/user";
import { Translator } from '../components/utils/types';

// AuthContext type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  registerUser: (email: string, password: string, name: string) => Promise<User>;
  loginWithEmailAndPassword: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  getUser: () => UserInterface | null;
  logout: (t: Translator, router: NextRouter) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Done loading
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  // Register user
  const registerUser = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userDetails = userCredential.user;

      // Update display name
      await updateProfile(userDetails, { displayName: name });

      // Update local state
      setUser(userDetails);

      return userDetails; // Return user details
    } catch (error: any) {
      console.error("Error registering user:", error.message);
      throw error; // Rethrow error for caller to handle
    }
  };

  // Get user details as UserInterface
  const getUser = (): UserInterface | null => {
    if (!user) return null;

    return {
      id: user.uid ? parseInt(user.uid) : 0, // Mock ID (Firebase UID is a string)
      created: user.metadata.creationTime || "",
      name: user.displayName || "",
      email: user.email || "",
    };
  };

  // Login user with email and password
  const loginWithEmailAndPassword = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDetails = userCredential.user;
      setUser(userDetails);
      return userDetails;
    } catch (error: any) {
      console.error("Login error:", error.message);
      throw error;
    }
  };

  // Login user with Google authentication
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userDetails = result.user;
      setUser(userDetails);
      return userDetails;
    } catch (error: any) {
      console.error("Google login error:", error.message);
      throw error;
    }
  };

  // Logout user with notification and redirect
  const logout = async (t: Translator, router: NextRouter) => {
    try {
      await signOut(auth);
      setUser(null); // Clear user state on logout

      // Show success notification
      showNotification({
        color: 'green',
        title: t('logout_success_title'),
        icon: <IconCheck />,
        message: '',
        autoClose: 10000, // Close after 10 seconds
      });

      // Redirect to login page
      router.push('/login');
    } catch (error: any) {
      console.error("Error logging out:", error.message);
      throw error; // Rethrow error for caller to handle
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, registerUser, getUser, loginWithEmailAndPassword, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
