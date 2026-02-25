import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type UserContextValue = {
  token: string | null;
  userId: number | null;
  // Username captured at login (displayed on Profile)
  username: string | null;
  fullName: string;
  interests: string[];
  // Local-only avatar url; future: persist to backend
  avatarUri: string | null;
  setToken: (token: string | null) => void;
  setUserId: (id: number | null) => void;
  setUsername: (username: string | null) => void;
  setFullName: (name: string) => void;
  setInterests: (interests: string[]) => void;
  setAvatarUri: (uri: string | null) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  // Backend: Replace default name with value fetched from a user profile endpoint
  const [fullName, setFullName] = useState<string>("John Doe");
  // Backend: add interests from API on login, and persist updates from EditInterests
  const [interests, setInterests] = useState<string[]>([]);
  // Temporarily store picked avatar image uri, Backend: upload & persist URL
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const logout = useCallback(() => {
    setToken(null);
    setUserId(null);
    setUsername(null);
    // keep name for demo, clear interests
    setInterests([]);
    setAvatarUri(null);
    // Backend: Optionally call a sign-out endpoint to invalidate the token server-side
  }, []);

  const value = useMemo(
    () => ({
      token,
      userId,
      username,
      fullName,
      interests,
      avatarUri,
      setToken,
      setUserId,
      setUsername,
      setFullName,
      setInterests,
      setAvatarUri,
      logout,
    }),
    [token, userId, username, fullName, interests, avatarUri, logout],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
