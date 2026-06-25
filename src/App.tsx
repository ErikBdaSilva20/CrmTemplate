import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";

const LoginScreen = lazy(() => import("@/screens/LoginScreen"));
const SetupScreen = lazy(() => import("@/screens/SetupScreen"));
const DashboardScreen = lazy(() => import("@/screens/DashboardScreen"));
const ContactsScreen = lazy(() => import("@/screens/ContactsScreen"));
const CompaniesScreen = lazy(() => import("@/screens/CompaniesScreen"));
const DealsScreen = lazy(() => import("@/screens/DealsScreen"));
const DealDetailScreen = lazy(() => import("@/screens/DealDetailScreen"));
const ActivitiesScreen = lazy(() => import("@/screens/ActivitiesScreen"));
const TasksScreen = lazy(() => import("@/screens/TasksScreen"));
const SalesGoalsScreen = lazy(() => import("@/screens/SalesGoalsScreen"));
const SegmentsScreen = lazy(() => import("@/screens/SegmentsScreen"));
const SettingsScreen = lazy(() => import("@/screens/SettingsScreen"));
const NotFoundScreen = lazy(() => import("@/screens/NotFoundScreen"));

function RouteLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function SuspenseRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<SuspenseRoute><LoginScreen /></SuspenseRoute>} />
            <Route
              path="/setup"
              element={
                <RequireAuth>
                  <SuspenseRoute><SetupScreen /></SuspenseRoute>
                </RequireAuth>
              }
            />

            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<SuspenseRoute><DashboardScreen /></SuspenseRoute>} />
              <Route path="/contacts" element={<SuspenseRoute><ContactsScreen /></SuspenseRoute>} />
              <Route path="/companies" element={<SuspenseRoute><CompaniesScreen /></SuspenseRoute>} />
              <Route path="/deals" element={<SuspenseRoute><DealsScreen /></SuspenseRoute>} />
              <Route path="/deals/:id" element={<SuspenseRoute><DealDetailScreen /></SuspenseRoute>} />
              <Route path="/activities" element={<SuspenseRoute><ActivitiesScreen /></SuspenseRoute>} />
              <Route path="/tasks" element={<SuspenseRoute><TasksScreen /></SuspenseRoute>} />
              <Route path="/sales-goals" element={<SuspenseRoute><SalesGoalsScreen /></SuspenseRoute>} />
              <Route path="/segments" element={<SuspenseRoute><SegmentsScreen /></SuspenseRoute>} />
              <Route path="/settings" element={<SuspenseRoute><SettingsScreen /></SuspenseRoute>} />
            </Route>

            <Route path="*" element={<SuspenseRoute><NotFoundScreen /></SuspenseRoute>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
}
