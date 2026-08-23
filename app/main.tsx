// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import "@fontsource-variable/geist/index.css";
import "@fontsource-variable/geist-mono/index.css";
import "@fontsource-variable/space-grotesk/index.css";
import "./index.css";
import { LandingPage } from "@/pages/landing";
import { WorldView } from "@/pages/world-view";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { VerifyEmailPage } from "@/pages/verify-email";
import { AccountPage } from "@/pages/account";
import { AdminPage } from "@/pages/admin";
import { UserManagementPage } from "@/pages/user-management";
import { WorldManagerPage } from "@/pages/world-manager";
import { WorldEditPage } from "@/pages/world-edit";
import { RequireAuth, RequireRole } from "@/components/auth/require-role";
import { useAuthStore } from "@/stores/auth";

// Kick off the session check as early as possible.
useAuthStore.getState().init();

createRoot(document.getElementById("root")!).render(
  <>
    <BrowserRouter>
      <Routes>
        <Route
          index
          element={
            <RequireAuth>
              <LandingPage />
            </RequireAuth>
          }
        />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/account"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <AdminPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/user-management"
          element={
            <RequireRole role="admin">
              <UserManagementPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/world-manager"
          element={
            <RequireRole role="admin">
              <WorldManagerPage />
            </RequireRole>
          }
        />
        <Route
          path="/world/:worldID"
          element={
            <RequireAuth>
              <WorldView />
            </RequireAuth>
          }
        />
        <Route
          path="/world/:worldID/view"
          element={
            <RequireAuth>
              <WorldView />
            </RequireAuth>
          }
        />
        <Route
          path="/world/:worldID/edit"
          element={
            <RequireRole role="admin">
              <WorldEditPage />
            </RequireRole>
          }
        />
      </Routes>
    </BrowserRouter>
  </>,
);

//
