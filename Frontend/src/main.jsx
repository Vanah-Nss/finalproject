import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { frFR } from "@clerk/localizations";

import App from "./App.jsx";
import { ThemeProvider } from "./ThemeContext";
import ApolloClerkProvider from "./components/ApolloClerkProvider.jsx";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) throw new Error("❌ Add your Clerk Publishable Key to .env");

const clerkAppearance = {
  baseTheme: "light",
  variables: {
    colorPrimary: "#1E3A8A",
    colorBackground: "#FFFFFF",
    colorText: "#1E3A8A", // texte global
    borderRadius: "16px",
    fontFamily: "Inter, sans-serif",
  },
  elements: {
    // Carte principale
    card: "p-10 bg-white shadow-xl rounded-2xl",

    // Titre principal : "S'identifier" -> bleu marine
    headerTitle: "text-3xl font-bold text-[#1E3A8A] mb-6 text-center",

    // Texte du bouton "S'identifier" en bleu marine si nécessaire
    formButtonText: "text-[#1E3A8A] font-bold",

    // Bouton principal (fond bleu)
    formButtonPrimary:
      "bg-[#1E3A8A] text-white text-xl font-bold px-8 py-4 rounded-2xl shadow-lg hover:bg-[#162864] transition-colors duration-300",

    // Boutons sociaux (Google / LinkedIn)
    socialButtons:
      "w-full flex items-center justify-center gap-4 bg-white text-[#1E3A8A] font-extrabold text-2xl px-8 py-5 rounded-2xl shadow-xl border border-[#1E3A8A] hover:bg-[#EFF3FF] transition-all duration-300",

    // Champs du formulaire
    formInput:
      "w-full border border-gray-300 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] mb-5 text-gray-800 text-lg",

    // Enlever le lien “Créer un compte / Se connecter” en bas si souhaité
    footerAction: "hidden",
  },
};


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
  <ClerkProvider
  frontendApi="fit-collie-65.clerk.accounts.dev"
  publishableKey={PUBLISHABLE_KEY}
  localization={frFR}
  afterSignInUrl="/dashboard"
  afterSignUpUrl="/dashboard"
  fallbackRedirectUrl="/dashboard"
  appearance={clerkAppearance}
>
  <ApolloClerkProvider>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </ApolloClerkProvider>
</ClerkProvider>

  </React.StrictMode>
);
