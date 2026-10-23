import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n";
import { AppThemeProvider } from "@/hooks/useAppTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import BusinessDashboard from "./pages/BusinessDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { AdminGate } from "@/components/AdminGate";
import PublicProfile from "./pages/PublicProfile";
import CardRedirect from "./pages/CardRedirect";
import Leaderboard from "./pages/Leaderboard";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import MyCircle from "./pages/MyCircle";
import GetYourCard from "./pages/GetYourCard";
import CardRequests from "./pages/CardRequests";
import CardRequestDetail from "./pages/CardRequestDetail";
import CardDeliverySettings from "./pages/CardDeliverySettings";
import SerialManagement from "./pages/SerialManagement";
import MyOshegahCards from "./pages/MyOshegahCards";
import ProfileOrSerial from "./pages/ProfileOrSerial";
import SerialRedirect from "./pages/SerialRedirect";
import { PublicMobileNavigation } from "@/components/PrimaryNavigation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppThemeProvider>
      <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/my-circle" element={<ProtectedRoute area="account"><MyCircle /></ProtectedRoute>} />
            <Route path="/get-your-card" element={<ProtectedRoute area="account"><GetYourCard /></ProtectedRoute>} />
            <Route path="/my-cards" element={<ProtectedRoute area="account"><CardRequests /></ProtectedRoute>} />
            <Route path="/my-cards/:id" element={<ProtectedRoute area="account"><CardRequestDetail /></ProtectedRoute>} />
            <Route path="/admin/card-requests" element={<ProtectedRoute area="admin"><AdminGate><CardRequests admin /></AdminGate></ProtectedRoute>} />
            <Route path="/admin/card-delivery-settings" element={<ProtectedRoute area="admin"><AdminGate><CardDeliverySettings /></AdminGate></ProtectedRoute>} />
            <Route path="/admin/serials" element={<ProtectedRoute area="admin"><AdminGate><SerialManagement /></AdminGate></ProtectedRoute>} />
            <Route path="/my-oshegah-cards" element={<ProtectedRoute area="account"><MyOshegahCards /></ProtectedRoute>} />
            <Route path="/admin/card-requests/:id" element={<ProtectedRoute area="admin"><AdminGate><CardRequestDetail admin /></AdminGate></ProtectedRoute>} />
            <Route

              path="/dashboard"
              element={<ProtectedRoute area="personal"><Dashboard /></ProtectedRoute>}
            />
            <Route
              path="/business"
              element={<ProtectedRoute area="business"><BusinessDashboard /></ProtectedRoute>}
            />
            <Route
              path="/admin"
              element={<ProtectedRoute area="admin"><AdminGate><AdminDashboard /></AdminGate></ProtectedRoute>}
            />
            <Route path="/c/:cardId" element={<CardRedirect />} />
            <Route path="/s/:serial" element={<SerialRedirect />} />
            <Route path="/:username" element={<ProfileOrSerial />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
            <PublicMobileNavigation />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      </LanguageProvider>
    </AppThemeProvider>
  </QueryClientProvider>
);

export default App;
