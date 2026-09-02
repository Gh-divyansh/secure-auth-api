import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
export function ProtectedRoute() { const { user, ready } = useAuth(); const location = useLocation(); if (!ready) return <div className="grid min-h-screen place-items-center text-cyan-300"><span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" /></div>; return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />; }
