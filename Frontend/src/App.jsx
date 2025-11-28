import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Home from "./components/Home";
import TableauDeBord from "./components/TableauDeBord";
import GenererPost from "./components/GenererPost";
import Historique from "./components/Historique";
import Parametres from "./components/Parametres";
import AdminDashboard from "./components/AdminDashboard";
import RedirectAfterSignIn from "./components/RedirectAfterSignIn";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import AdminRoute from "./components/AdminRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />

      <Route path="/dashboard" element={<Dashboard />} />

      {/* Route Admin protégée */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      <Route
        path="/tableaudebord"
        element={
          <>
            <SignedIn><TableauDeBord /></SignedIn>
            <SignedOut><RedirectToSignIn redirectUrl="/tableaudebord" /></SignedOut>
          </>
        }
      />

      <Route
        path="/generer-post"
        element={
          <>
            <SignedIn><GenererPost /></SignedIn>
            <SignedOut><RedirectToSignIn redirectUrl="/generer-post" /></SignedOut>
          </>
        }
      />

      <Route
        path="/historique"
        element={
          <>
            <SignedIn><Historique /></SignedIn>
            <SignedOut><RedirectToSignIn redirectUrl="/historique" /></SignedOut>
          </>
        }
      />

      <Route
        path="/parametres"
        element={
          <>
            <SignedIn><Parametres /></SignedIn>
            <SignedOut><RedirectToSignIn redirectUrl="/parametres" /></SignedOut>
          </>
        }
      />

      <Route path="*" element={<Home />} />
    </Routes>
  );
}
