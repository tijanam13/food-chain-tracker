import { motion } from "framer-motion";
import { Leaf, LogIn, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import NotificationCenter from "@/components/NotificationCenter";

const Header = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 pt-12 pb-4 lg:px-8 xl:px-16 2xl:px-24"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground tracking-tight">
              EatSmart
            </h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5">
              Zero waste living
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="w-9 h-9 glass-card rounded-xl flex items-center justify-center cursor-pointer"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Sun className="w-4 h-4 text-muted-foreground" />
            )}
          </motion.button>
          {user ? (
            <>
              <NotificationCenter />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/profile')}
                className="w-9 h-9 rounded-xl bg-primary/30 flex items-center justify-center text-sm font-semibold text-primary cursor-pointer font-display"
              >
                {user.user_metadata?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </motion.div>
            </>
          ) : (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-3 py-2 glass-card rounded-xl cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Sign In</span>
            </motion.div>
          )}
        </div>
      </div>

      {user && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-5"
        >
          <p className="text-muted-foreground text-sm">
            Hello, {user.user_metadata?.display_name || user.email?.split('@')[0]} 👋
          </p>
          <h2 className="font-display text-xl font-bold text-foreground mt-0.5">
            Your fridge at a glance
          </h2>
        </motion.div>
      )}

      {!user && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-5"
        >
          <h2 className="font-display text-xl font-bold text-foreground mt-0.5">
            Your fridge at a glance
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Sign in to start tracking your groceries
          </p>
        </motion.div>
      )}
    </motion.header>
  );
};

export default Header;
