"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";

// Staff roles that unlock the /ad-techplugke admin panel. "super_admin" additionally unlocks
// Settings & Team management (see isSuperAdmin below) — everything else in the panel is shared
// by every staff role.
const STAFF_ROLES = ["editor", "admin", "super_admin"];

type AuthContextValue = {
  user: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function syncUser() {
  return apiFetch<{ role?: string }>("/api/auth/sync", { method: "POST" });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const applyRole = useCallback((role: string | undefined) => {
    setIsAdmin(!!role && STAFF_ROLES.includes(role));
    setIsSuperAdmin(role === "super_admin");
  }, []);

  const refreshAdminStatus = useCallback(async () => {
    try {
      const me = await apiFetch<{ role?: string }>("/api/auth/me");
      applyRole(me.role);
    } catch {
      applyRole(undefined);
    }
  }, [applyRole]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        await refreshAdminStatus();
      } else {
        applyRole(undefined);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [refreshAdminStatus, applyRole]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    const synced = await syncUser();
    applyRole(synced.role);
  }, [applyRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    const synced = await syncUser();
    applyRole(synced.role);
  }, [applyRole]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
    const synced = await syncUser();
    applyRole(synced.role);
  }, [applyRole]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isAdmin,
    isSuperAdmin,
    signUp,
    signIn,
    signInWithGoogle,
    signOutUser,
    sendPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
