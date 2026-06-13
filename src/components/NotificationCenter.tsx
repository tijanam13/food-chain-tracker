import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Trash2, CheckCircle2, Trash, Eye } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import NotificationDetail from "@/components/NotificationDetail";

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const {
    allNotifications,
    unreadCount,
    hasNewNotification,
    markAsRead,
    deleteNotification,
    clearAll,
    markAsConsumed,
    markAsDiscarded,
  } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const activeNotifications = allNotifications
    .filter((n) => !n.readAt && !n.deletedAt)
    .sort((a, b) =>
      a.level === "warning" && b.level === "high-priority"
        ? -1
        : a.level === "high-priority" && b.level === "warning"
          ? 1
          : 0,
    );
  const readNotifications = allNotifications.filter((n) => n.readAt && !n.deletedAt);

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 glass-card rounded-xl flex items-center justify-center cursor-pointer transition-all"
        title="Notifications"
      >
        <Bell className={`w-4 h-4 ${hasNewNotification ? "text-urgent animate-pulse" : "text-muted-foreground"}`} />

        {/* Red Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-2 -right-2 bg-urgent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.div>
        )}
      </motion.button>

      {/* Notification Dropdown/Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            {/* Drawer */}
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed top-24 bottom-28 right-3 left-3 sm:left-auto sm:w-96 z-50 glass-card-strong rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-primary/10 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notifications
                </h2>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {allNotifications.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">
                      You'll get notified when items are about to expire
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-primary/10">
                    {/* Active Notifications */}
                    {activeNotifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onClick={() => setSelectedNotification(notification)}
                        className={`px-5 py-4 transition-all cursor-pointer hover:bg-primary/5 ${
                          notification.level === "high-priority"
                            ? "bg-urgent/5 border-l-4 border-urgent"
                            : "bg-warning/5 border-l-4 border-warning"
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-1">
                            {notification.level === "high-priority" ? (
                              <div className="w-2 h-2 rounded-full bg-urgent mt-1" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-warning mt-1" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium ${
                                notification.level === "high-priority" ? "text-urgent" : "text-warning"
                              }`}
                            >
                              {notification.itemName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                            <p className="text-[10px] text-muted-foreground/50 mt-2">
                              {new Date(notification.createdAt).toLocaleDateString()} at{" "}
                              {new Date(notification.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1 flex-shrink-0">
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1.5 text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10 rounded-lg"
                              title="Označi kao pročitano"
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="p-1.5 text-muted-foreground hover:text-urgent transition-colors hover:bg-urgent/10 rounded-lg"
                              title="Obriši"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {/* Read Notifications Section */}
                    {readNotifications.length > 0 && (
                      <div className="border-t-2 border-primary/10">
                        <div className="px-5 py-3 bg-background/50 sticky top-0 z-10">
                          <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                            Read Notifications
                          </p>
                        </div>
                        {readNotifications.map((notification) => (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => setSelectedNotification(notification)}
                            className="px-5 py-3 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-all"
                          >
                            <div className="flex gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground opacity-70">{notification.itemName}</p>
                                <p className="text-[10px] text-muted-foreground/50 mt-1">
                                  {new Date(notification.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                                className="p-1 text-muted-foreground hover:text-urgent transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer with Clear All */}
              {allNotifications.length > 0 && (
                <div className="px-5 py-3 border-t border-primary/10 bg-background/50">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={clearAll}
                    className="w-full py-2 text-xs font-medium text-urgent hover:bg-urgent/10 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    Clear All
                  </motion.button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notification Detail Modal */}
      <NotificationDetail
        isOpen={selectedNotification !== null}
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onMarkAsRead={markAsRead}
        onDelete={deleteNotification}
        onMarkAsConsumed={markAsConsumed}
        onMarkAsDiscarded={markAsDiscarded}
      />
    </div>
  );
};

export default NotificationCenter;
