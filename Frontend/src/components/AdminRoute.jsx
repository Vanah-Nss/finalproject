import React, { useEffect, useState } from "react";
import { useUser, SignedIn } from "@clerk/clerk-react";
import { useQuery } from "@apollo/client";
import { ME } from "../graphql/queries";

const AdminRoute = ({ children }) => {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [debugInfo, setDebugInfo] = useState({});

  // Query to get user data from backend
  const { data: meData, loading: meLoading, error: meError } = useQuery(ME, {
    skip: !isLoaded || !user, // Only run query when user is loaded
  });

  useEffect(() => {
    if (!isLoaded || !user) {
      setIsChecking(false);
      return;
    }

    // Wait for the GraphQL query to complete
    if (meLoading) {
      return;
    }

    if (meError) {
      console.error("❌ Erreur lors de la récupération des données utilisateur :", meError);
      setRole("user");
      setIsChecking(false);
      return;
    }

    if (meData && meData.me) {
      // Determine role based on backend isAdmin field
      const userRole = meData.me.isAdmin ? "admin" : "user";

      console.log("✅ Rôle final détecté depuis backend :", userRole);
      console.log("🔹 Données utilisateur backend :", meData.me);

      setRole(userRole);
      setDebugInfo({
        backendUser: meData.me,
        isAdmin: meData.me.isAdmin
      });
    } else {
      // Fallback if no data
      setRole("user");
    }

    setIsChecking(false);
  }, [isLoaded, user, meData, meLoading, meError]);

  // État de chargement
  if (!isLoaded || isChecking) {
    return (
      <div style={{ 
        padding: "40px", 
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <div style={{ 
          display: "inline-block",
          padding: "20px",
          background: "#f0f9ff",
          borderRadius: "8px",
          border: "1px solid #bae6fd"
        }}>
          <p style={{ margin: 0, color: "#0369a1" }}>
            🔄 Chargement des droits d'accès...
          </p>
        </div>
      </div>
    );
  }

  // Utilisateur non connecté
  if (!user) {
    return (
      <div style={{ 
        padding: "40px", 
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <div style={{
          maxWidth: "500px",
          margin: "0 auto",
          padding: "30px",
          background: "#fef2f2",
          borderRadius: "8px",
          border: "1px solid #fecaca"
        }}>
          <h2 style={{ color: "#991b1b", marginTop: 0 }}>
            🔒 Connexion requise
          </h2>
          <p style={{ color: "#7f1d1d" }}>
            Vous devez être connecté pour accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  // Utilisateur sans droits admin
  if (role !== "admin") {
    return (
      <div style={{ 
        padding: "40px", 
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <div style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "30px",
          background: "#fef2f2",
          borderRadius: "8px",
          border: "1px solid #fecaca"
        }}>
          <h2 style={{ color: "#991b1b", marginTop: 0 }}>
            ❌ Accès refusé
          </h2>
          <p style={{ color: "#7f1d1d", fontSize: "16px" }}>
            Vous devez être administrateur pour accéder à cette page.
          </p>
          <div style={{
            margin: "20px 0",
            padding: "15px",
            background: "#fff",
            borderRadius: "6px",
            border: "1px solid #e5e7eb"
          }}>
            <p style={{ margin: 0, color: "#6b7280" }}>
              <strong>Votre rôle actuel :</strong> <span style={{ color: "#dc2626" }}>{role || "non défini"}</span>
            </p>
          </div>
          
          {/* Section de debug */}
          <details style={{ 
            marginTop: "30px", 
            textAlign: "left",
            background: "#f9fafb",
            padding: "15px",
            borderRadius: "6px",
            border: "1px solid #e5e7eb"
          }}>
            <summary style={{ 
              cursor: "pointer", 
              fontWeight: "bold",
              color: "#374151",
              userSelect: "none"
            }}>
              🔍 Informations de diagnostic
            </summary>
            <pre style={{
              background: "#1f2937",
              color: "#f3f4f6",
              padding: "15px",
              fontSize: "12px",
              overflow: "auto",
              borderRadius: "4px",
              marginTop: "10px"
            }}>
{JSON.stringify({
  clerkUserId: user.id,
  clerkEmail: user.primaryEmailAddress?.emailAddress,
  backendUser: debugInfo.backendUser,
  backendIsAdmin: debugInfo.isAdmin,
  detectedRole: role
}, null, 2)}
            </pre>
            <p style={{
              fontSize: "12px",
              color: "#6b7280",
              marginTop: "10px",
              marginBottom: 0
            }}>
              💡 <strong>Si le rôle n'apparaît pas, vérifiez :</strong>
              <br />1. Que l'utilisateur est marqué comme admin dans la base de données backend
              <br />2. Que le middleware Clerk définit correctement is_admin
              <br />3. Que la requête GraphQL "me" fonctionne correctement
              <br />4. Vérifiez les logs du backend pour les erreurs d'authentification
            </p>
          </details>
        </div>
      </div>
    );
  }

  // Utilisateur admin : afficher le contenu
  return <SignedIn>{children}</SignedIn>;
};

export default AdminRoute;