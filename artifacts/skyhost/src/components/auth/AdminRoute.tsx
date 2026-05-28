import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || !isAdmin) {
    setLocation("/admin/login");
    return null;
  }

  return <>{children}</>;
}