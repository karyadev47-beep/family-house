import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { FamilyProvider } from "@/context/FamilyContext";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Overview from "@/pages/finance/Overview";
import Transactions from "@/pages/finance/Transactions";
import Budget from "@/pages/finance/Budget";
import Goals from "@/pages/finance/Goals";
import MyJournal from "@/pages/journal/MyJournal";
import FamilyJournal from "@/pages/journal/FamilyJournal";
import JournalCalendar from "@/pages/journal/JournalCalendar";
import Members from "@/pages/family/Members";
import Invitations from "@/pages/family/Invitations";
import Requests from "@/pages/family/Requests";
import Audit from "@/pages/family/Audit";
import Tasks from "@/pages/planning/Tasks";
import CalendarPage from "@/pages/planning/Calendar";
import Meals from "@/pages/planning/Meals";
import Shopping from "@/pages/planning/Shopping";
import Settings from "@/pages/Settings";
import JoinPage from "@/pages/JoinPage";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null)
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Memuat…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join-family/:code" element={<JoinPage />} />
            <Route
              path="/*"
              element={
                <Protected>
                  <FamilyProvider>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/finance/overview" element={<Overview />} />
                        <Route path="/finance/transactions" element={<Transactions />} />
                        <Route path="/finance/budget" element={<Budget />} />
                        <Route path="/finance/goals" element={<Goals />} />
                        <Route path="/journal/my" element={<MyJournal />} />
                        <Route path="/journal/family" element={<FamilyJournal />} />
                        <Route path="/journal/calendar" element={<JournalCalendar />} />
                        <Route path="/family/members" element={<Members />} />
                        <Route path="/family/invitations" element={<Invitations />} />
                        <Route path="/family/requests" element={<Requests />} />
                        <Route path="/family/audit" element={<Audit />} />
                        <Route path="/planning/tasks" element={<Tasks />} />
                        <Route path="/planning/calendar" element={<CalendarPage />} />
                        <Route path="/planning/meals" element={<Meals />} />
                        <Route path="/planning/shopping" element={<Shopping />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </AppLayout>
                  </FamilyProvider>
                </Protected>
              }
            />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
