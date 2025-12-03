import { useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { FiSun, FiMoon, FiLogOut, FiLinkedin } from "react-icons/fi";
import { useTheme } from "../ThemeContext";

export default function Parametres() {
  const { theme, toggleTheme } = useTheme();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk(); 
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [toast, setToast] = useState(null);

  if (!isLoaded) return <p className="p-6">Chargement du profil…</p>;

  const linkedInAccount = user.externalAccounts.find(
    (acc) => acc.provider === "oauth_linkedin"
  );

  const profile = {
    firstName: linkedInAccount?.firstName || user.firstName,
    lastName: linkedInAccount?.lastName || user.lastName,
    email: linkedInAccount?.emailAddress || user.primaryEmailAddress?.emailAddress,
    headline: linkedInAccount?.username || "Profil LinkedIn",
    avatar: linkedInAccount?.imageUrl || user.imageUrl,
    profileUrl: `https://www.linkedin.com/in/${linkedInAccount?.username || ""}`,
  };


  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await signOut(); 

  if (window.grecaptcha) {
    window.grecaptcha.reset();
  }
    setToast("Déconnecté avec succès !");
    setTimeout(() => setToast(null), 3000);
  };

  return (
      <div className="space-y-6 p-4">
       <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
 <div className="m-6 bg-blue-900 text-white p-6 rounded-2xl shadow-lg border border-blue-700 flex items-center justify-between">
  <h1 className="text-3xl font-extrabold">⚙️ Paramètres</h1>
</div>



        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Apparence
              </h3>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2 rounded-lg ring-1 ring-gray-200 dark:ring-gray-700 hover:scale-105 transition-transform"
              >
                {theme === "dark" ? <FiMoon /> : <FiSun />}
                {theme === "dark" ? "Sombre" : "Clair"}
              </button>
            </div>
          </div>

          <div className="md:col-span-2 bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <img
                src={profile.avatar}
                alt="avatar"
                className="w-28 h-28 rounded-2xl object-cover ring-2 ring-gray-200 dark:ring-gray-600"
              />
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {profile.firstName} {profile.lastName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {profile.headline}
                </p>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                  {profile.email}
                </p>
                <a
                  href={profile.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg ring-1 ring-blue-200 dark:ring-blue-800 hover:scale-105 transition-transform bg-white dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-medium"
                >
                  <FiLinkedin /> Voir LinkedIn
                </a>
              </div>
            </div>
          </div>
        </section>

   
        <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-lg flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Session
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Déconnexion sécurisée
            </p>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 text-white font-semibold hover:scale-105 transition-transform shadow-inner"
          >
            <FiLogOut /> Déconnexion
          </button>
        </div>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50">
              Voulez-vous vraiment vous déconnecter ?
            </h3>
        
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-lg ring-1 ring-gray-200 dark:ring-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-4 py-2 rounded-lg bg-red-600 text-white"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed right-6 bottom-6 z-50">
          <div className="px-4 py-3 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {toast}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}