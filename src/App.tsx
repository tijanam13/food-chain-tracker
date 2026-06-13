/**
 * src/App.tsx
 * 
 * IZMENE:
 * - Dodat import AdminSupplyChain
 * - Dodat import ProductsPage  
 * - Dodat import ProductPublic
 * - Dodata ruta /admin-supply-chain (AdminOnlyGuard)
 * - Dodata ruta /products (AuthGuard + AdminGuard)
 * - Dodata javna ruta /product/:qrCode (bez guard-a)
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { PremiumProvider } from "@/contexts/PremiumContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import Fridge from "./pages/Fridge.tsx";
import ShoppingList from "./pages/ShoppingList.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Profile from "./pages/Profile.tsx";
import Family from "./pages/Family.tsx";
import ReceiptScanner from "./pages/ReceiptScanner.tsx";
import ManualEntry from "./pages/ManualEntry.tsx";
import Planet from "./pages/Planet.tsx";
import Store from "./pages/Store.tsx";
import AdminScan from "./pages/AdminScan.tsx";
import AdminSupplyChain from "./pages/AdminSupplyChain.tsx";   // ← NOVO
import ProductsPage from "./pages/Products.tsx";           // ← NOVO
import ProductPublic from "./pages/ProductPublic.tsx";         // ← NOVO
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAdmin();
  if (loading) return null;
  if (isAdmin) return <Navigate to="/admin-scan" replace />;
  return <>{children}</>;
};

const AdminOnlyGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAdmin();
  const { user, loading: authLoading } = useAuth();
  if (authLoading || loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PremiumProvider>
              <AdminProvider>
                <Routes>
                  {/* ── Admin-only routes ── */}
                  <Route
                    path="/admin-scan"
                    element={
                      <AdminOnlyGuard>
                        <AdminScan />
                      </AdminOnlyGuard>
                    }
                  />
                  <Route
                    path="/admin-supply-chain"
                    element={
                      <AdminOnlyGuard>
                        <AdminSupplyChain />
                      </AdminOnlyGuard>
                    }
                  />

                  {/* ── Public route — no login required ── */}
                  <Route path="/product/:qrCode" element={<ProductPublic />} />

                  {/* ── Auth routes ── */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* ── Regular user routes ── */}
                  <Route
                    path="/"
                    element={
                      <AuthGuard>
                        <AdminGuard>
                          <Index />
                        </AdminGuard>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/fridge"
                    element={
                      <AuthGuard>
                        <AdminGuard>
                          <Fridge />
                        </AdminGuard>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/shopping-list"
                    element={
                      <AuthGuard>
                        <AdminGuard>
                          <ShoppingList />
                        </AdminGuard>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/planet"
                    element={
                      <AuthGuard>
                        <AdminGuard>
                          <Planet />
                        </AdminGuard>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <AuthGuard>
                        <Profile />
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/family"
                    element={
                      <AuthGuard>
                        <AdminGuard>
                          <Family />
                        </AdminGuard>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/scan"
                    element={
                      <AuthGuard>
                        <AdminGuard>
                          <ReceiptScanner />
                        </AdminGuard>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/manual-entry"
                    element={
                      <AuthGuard>
                        <AdminGuard>
                          <ManualEntry />
                        </AdminGuard>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/store"
                    element={
                      <AuthGuard>
                        <AdminGuard>
                          <Store />
                        </AdminGuard>
                      </AuthGuard>
                    }
                  />
                  {/* ── Products page — user side ── */}
                  <Route
                    path="/products"
                    element={
                      <AuthGuard>
                        <AdminGuard>
                          <ProductsPage />
                        </AdminGuard>
                      </AuthGuard>
                    }
                  />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AdminProvider>
            </PremiumProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
