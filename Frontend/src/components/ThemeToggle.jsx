import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-100 border border-gray-200 dark:border-gray-300 hover:scale-105 transition-transform shadow-sm"
      aria-label="Changer le thème"
    >
      {theme === "dark" ? (
        <>
          <FiMoon className="text-gray-700" />
          <span className="text-gray-700 font-medium">Sombre</span>
        </>
      ) : (
        <>
          <FiSun className="text-gray-700" />
          <span className="text-gray-700 font-medium">Clair</span>
        </>
      )}
    </button>
  );
}