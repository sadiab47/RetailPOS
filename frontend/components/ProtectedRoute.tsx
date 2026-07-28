import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ children, allowedRoles, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-slate-200" />
          <span>Loading session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return fallback ? <>{fallback}</> : (
      <div className="rounded-2xl border border-red-900 bg-red-950/20 p-6 text-center text-red-200">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="mt-2">Please sign in to access this resource.</p>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="rounded-2xl border border-amber-900 bg-amber-950/20 p-6 text-center text-amber-200">
        <h2 className="text-xl font-semibold">Permission Denied</h2>
        <p className="mt-2">Your account role ({user.role}) is unauthorized to view this section.</p>
      </div>
    );
  }

  return <>{children}</>;
}
