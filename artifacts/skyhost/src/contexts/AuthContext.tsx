import { createContext, useContext, ReactNode } from "react";
import { useGetMe, useLogoutClient, useLogoutAdmin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

type User = {
  id: number;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  company?: string | null;
  role?: string;
  isAdmin?: boolean;
};

type AuthContextType = {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const logoutClient = useLogoutClient();
  const logoutAdmin = useLogoutAdmin();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const rawUser = user as User | undefined;
  const isAdmin = !!(rawUser?.isAdmin || rawUser?.role);

  const logout = () => {
    if (isAdmin) {
      logoutAdmin.mutate(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation("/admin/login");
        }
      });
    } else {
      logoutClient.mutate(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation("/login");
        }
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isAdmin, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
