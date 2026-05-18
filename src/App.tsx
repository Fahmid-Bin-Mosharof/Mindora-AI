import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import { Login, Signup } from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import UploadPage from "./pages/Upload";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Quizzes from "./pages/Quizzes";
import QuizTake from "./pages/QuizTake";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/chat"      element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/quizzes"   element={<ProtectedRoute><Quizzes /></ProtectedRoute>} />
            <Route path="/quizzes/:id/take" element={<ProtectedRoute><QuizTake /></ProtectedRoute>} />
            <Route path="/library"   element={<ProtectedRoute><Library /></ProtectedRoute>} />
            <Route path="/upload"    element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
            <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
