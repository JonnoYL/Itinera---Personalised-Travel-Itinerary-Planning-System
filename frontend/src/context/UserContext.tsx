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
  username: string | null;
  fullName: string;
  interests: string[];
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
  const [fullName, setFullName] = useState<string>("John Doe");
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const logout = useCallback(() => {
    setToken(null);
    setUserId(null);
    setUsername(null);
    setInterests([]);
    setAvatarUri(null);
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
