import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import SessionOverview from "@/pages/SessionOverview";
import SessionDetailPage from "@/pages/SessionDetail";
import SessionUpload from "@/pages/SessionUpload";
import ControlPanel from "@/pages/ControlPanel";
import Admin from "@/pages/Admin";
import { ProtectedLayoutRoute } from "@/app/routes/ProtectedLayoutRoute";
import { PublicOnlyRoute } from "@/app/routes/PublicOnlyRoute";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route element={<ProtectedLayoutRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/session" element={<SessionOverview />} />
          <Route path="/session/:id" element={<SessionDetailPage />} />
          <Route path="/upload" element={<SessionUpload />} />
          <Route path="/account" element={<ControlPanel />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
