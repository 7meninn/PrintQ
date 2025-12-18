import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { StationProvider, useStation } from "../context/StationContext";
import LoginPage from "../pages/LoginPage";
// We will build the real Dashboard next, but we need a placeholder import for now
import DashboardPage from "../pages/DashboardPage"; 
import HistoryPage from "../pages/HistoryPage";

// Guard to prevent access to Dashboard without logging in
function PrivateRoute({ children }) {
  const { station } = useStation();
  return station ? children : <Navigate to="/" />;
}

export default function AppRouter() {
  return (
    <StationProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            } 
          />
        </Routes>
      </HashRouter>
    </StationProvider>
  );
}