import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "original" | "ramadan";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // تم تغيير القيمة الافتراضية هنا لتصبح "ramadan"
    return (localStorage.getItem("app-theme") as Theme) || "ramadan";
  });

  useEffect(() => {
    localStorage.setItem("app-theme", theme);
    if (theme === "ramadan") {
      document.documentElement.classList.add("ramadan-theme");
    } else {
      document.documentElement.classList.remove("ramadan-theme");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "original" ? "ramadan" : "original"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};