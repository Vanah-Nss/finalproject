// Dashboard.jsx - Section "Mon Profil" sans les statistiques
import { useState, useEffect } from "react";
import { FiMenu, FiHome, FiPlusCircle, FiClock, FiSettings, FiUser, FiLinkedin, FiMail, FiExternalLink } from "react-icons/fi";
import { UserButton, useUser, RedirectToSignIn } from "@clerk/clerk-react";
import { useQuery, gql } from "@apollo/client";

import GenererPost from "./GenererPost";
import Historique from "./Historique";
import Parametres from "./Parametres";
import TableauDeBord from "./TableauDeBord";

const ALL_POSTS = gql`
  query {
    allPosts {
      id
      content
      status
      imageUrl
      createdAt
      scheduledAt
    }
  }
`;

export default function Dashboard() {
   const { user, isLoaded, isSignedIn, signOut } = useUser();
   const [sidebarOpen, setSidebarOpen] = useState(false);
   const [activeMenu, setActiveMenu] = useState("Tableau de Bord");
   const [showMessage, setShowMessage] = useState(false);
   const [showLogoutModal, setShowLogoutModal] = useState(false);
   const [toast, setToast] = useState(null);

  const GET_USER_ADMIN_STATUS = gql`
    query GetUserAdminStatus {
      me {
        id
        isAdmin
      }
    }
  `;

  useQuery(GET_USER_ADMIN_STATUS);
  useQuery(ALL_POSTS, { pollInterval: 30000 });

  useEffect(() => {
    if (isSignedIn) {
      setShowMessage(true);
      const timer = setTimeout(() => setShowMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSignedIn]);

  if (!isLoaded) return <p className="p-6">Chargement du profil…</p>;

  if (!isSignedIn) {
    return <RedirectToSignIn redirectUrl="/dashboard" />;
  }

  const linkedInAccount = user.externalAccounts?.find(
    (acc) => acc.provider === "oauth_linkedin"
  );

  const profile = {
    firstName: linkedInAccount?.firstName || user.firstName,
    lastName: linkedInAccount?.lastName || user.lastName,
    email: linkedInAccount?.emailAddress || user.primaryEmailAddress?.emailAddress,
    avatar: linkedInAccount?.imageUrl || user.imageUrl,
    profileUrl: `https://www.linkedin.com/in/${linkedInAccount?.username || ""}`,
    headline: linkedInAccount?.username || "Profil LinkedIn",
  };

  const menuItems = [
    { name: "Tableau de Bord", icon: <FiHome /> },
    { name: "Générer post", icon: <FiPlusCircle /> },
    { name: "Historique", icon: <FiClock /> },
    { name: "Paramètres", icon: <FiSettings /> },
    { name: "Mon Profil", icon: <FiUser /> },
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case "Tableau de Bord":
        return <TableauDeBord />;
      case "Générer post":
        return <GenererPost />;
      case "Historique":
        return <Historique />;
      case "Paramètres":
        return <Parametres />;
      case "Mon Profil":
        return (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-4 bg-gradient-to-r from-blue-900 to-blue-600 dark:from-blue-300 dark:to-blue-500 bg-clip-text text-transparent">
                Mon Profil
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Gérez vos informations personnelles et paramètres de compte
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Carte Profil Principal */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-900 to-blue-700 dark:from-blue-800 dark:to-blue-600 h-32 relative">
                    <div className="absolute -bottom-16 left-8">
                      <div className="relative">
                        <img 
                          src={profile.avatar} 
                          alt="Profil" 
                          className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 shadow-xl bg-white dark:bg-gray-800"
                        />
                        <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-20 px-8 pb-8">
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">
                        {profile.firstName} {profile.lastName}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <FiMail className="text-blue-600 dark:text-blue-400" />
                        {profile.email}
                      </p>
                    </div>

                    {/* Section informations supplémentaires (sans statistiques) */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Votre profil est correctement configuré et prêt à utiliser Linkpostify
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Actions */}
              <div className="space-y-6">
                {/* Gestion du compte */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
                    <FiSettings className="text-blue-600 dark:text-blue-400" />
                    Gestion du compte
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-50">Paramètres Clerk</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Gérer la sécurité</p>
                      </div>
                      <UserButton 
                        afterSignOutUrl="/" 
                        appearance={{ 
                          elements: { 
                            avatarBox: "w-10 h-10 border-2 border-blue-600 dark:border-blue-400",
                            rootBox: "flex items-center justify-center"
                          } 
                        }} 
                      />
                    </div>
                  </div>
                </div>

                {/* LinkedIn Connection */}
                {linkedInAccount && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
                      <FiLinkedin className="text-blue-700 dark:text-blue-400" />
                      Profil LinkedIn
                    </h4>
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                        Votre compte LinkedIn est connecté
                      </p>
                      <a 
                        href={profile.profileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                      >
                        Voir mon profil
                        <FiExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                )}

                {/* Actions rapides */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
                    Actions rapides
                  </h4>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setActiveMenu("Générer post")}
                      className="w-full text-left p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors font-medium"
                    >
                      Créer un nouveau post
                    </button>
                    <button 
                      onClick={() => setActiveMenu("Paramètres")}
                      className="w-full text-left p-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors font-medium"
                    >
                      Modifier les paramètres
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await signOut();
    setToast("Déconnecté avec succès !");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col">
        <div className="p-6 text-2xl font-bold text-blue-900 dark:text-blue-300 border-b">Linkpostify</div>

        <ul className="mt-6 space-y-3 flex-1 overflow-y-auto px-3">
          {menuItems.map((item, index) => (
            <li
              key={index}
              onClick={() => setActiveMenu(item.name)}
              className={`flex items-center p-4 cursor-pointer rounded-md transition-colors duration-200 ${
                activeMenu === item.name
                  ? "bg-blue-900 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              <span className="font-medium text-lg">{item.name}</span>
            </li>
          ))}
        </ul>

        {/* Profil utilisateur */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-xl">
            <img src={profile.avatar} className="w-10 h-10 rounded-full border-2 border-blue-600 dark:border-blue-400" alt="Profil" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-50 text-sm truncate">{profile.firstName} {profile.lastName}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{profile.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 shadow-md">
          <button className="text-gray-700 dark:text-gray-300 lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <FiMenu size={28} />
          </button>
          <div className="flex-1"></div>
        </header>

        <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md min-h-[calc(100vh-96px)]">
            {renderContent()}
          </div>

          {showMessage && (
            <div className="fixed top-20 right-5 z-50">
              <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-blue-500 text-white px-8 py-4 rounded-2xl shadow-2xl font-bold text-lg animate-fade-in-out">
                Bienvenue sur Linkpostify, {profile.firstName} ! Vos données sont sécurisées
              </div>
            </div>
          )}
        </main>

        {toast && (
          <div className="fixed right-6 bottom-6 z-50 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border dark:border-gray-700">{toast}</div>
        )}
      </div>
    </div>
  );
}