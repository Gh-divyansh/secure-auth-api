import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthLayout } from "./pages/AuthLayout";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { VerifyOtp } from "./pages/VerifyOtp";
export function App() { return <Routes><Route element={<AuthLayout />}><Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} /><Route path="/verify" element={<VerifyOtp />} /></Route><Route element={<ProtectedRoute />}><Route path="/dashboard" element={<Dashboard />} /></Route><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes>; }
