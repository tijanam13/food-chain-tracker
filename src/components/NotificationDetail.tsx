import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { Notification } from '@/hooks/useNotifications';

interface NotificationDetailProps {
  isOpen: boolean;
  notification: Notification | null;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAsConsumed: (id: string) => void;
  onMarkAsDiscarded: (id: string) => void;
}

const NotificationDetail: React.FC<NotificationDetailProps> = ({
  isOpen,
  notification,
  onClose,
  onMarkAsRead,
  onDelete,
  onMarkAsConsumed,
  onMarkAsDiscarded,
}) => {
  if (!notification) return null;

  const getDetailDescription = (notification: Notification) => {
    if (notification.level === 'high-priority') {
      return {
        title: '⚠️ High Priority - Donation Opportunity',
        description: `This item is expiring very soon (in ${notification.daysLeft} day${notification.daysLeft !== 1 ? 's' : ''}). Instead of letting it go to waste, consider donating it to a local donation center. You'll earn bonus tokens for your donation, and you'll be helping others in need!`,
        action: 'Donate Now',
        actionColor: 'bg-urgent/20 text-urgent hover:bg-urgent/30',
        tips: [
          '💡 Donations help reduce food waste',
          '🌍 Support your local community',
          '🪙 Earn bonus tokens instantly',
          '📍 Find a donation center near you',
        ],
      };
    } else {
      return {
        title: '⏰ Expiry Warning',
        description: `This item will expire in ${notification.daysLeft} day${notification.daysLeft !== 1 ? 's' : ''}. We recommend using it soon to prevent waste. Check our recipes section for ideas on how to use this item!`,
        action: 'View Recipes',
        actionColor: 'bg-warning/20 text-warning hover:bg-warning/30',
        tips: [
          '👨‍🍳 Check our AI-generated recipes',
          '🥘 Find creative ways to use this item',
          '⏱️ Plan your meals ahead',
          '📝 Keep track of your fridge items',
        ],
      };
    }
  };

  const details = getDetailDescription(notification);
  const createdDate = new Date(notification.createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = createdDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 60 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 60 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className={`w-full max-w-[380px] glass-card-strong rounded-3xl p-5 shadow-2xl pointer-events-auto overflow-y-auto max-h-[72vh] ${
              notification.level === 'high-priority'
                ? 'border-l-4 border-urgent'
                : 'border-l-4 border-warning'
            }`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`flex items-center gap-3 flex-1`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    notification.level === 'high-priority'
                      ? 'bg-urgent/20 text-urgent'
                      : 'bg-warning/20 text-warning'
                  }`}>
                    {notification.level === 'high-priority' ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${
                      notification.level === 'high-priority'
                        ? 'text-urgent'
                        : 'text-warning'
                    }`}>
                      {notification.level === 'high-priority' ? 'HIGH PRIORITY' : 'WARNING'}
                    </p>
                    <p className="text-foreground font-bold text-lg mt-0.5 truncate">
                      {notification.itemName}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Main Content */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <h2 className="text-base font-bold text-foreground mb-2">
                    {details.title}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {details.description}
                  </p>
                </div>

                {/* Status Bar */}
                <div className={`rounded-xl p-4 ${
                  notification.level === 'high-priority'
                    ? 'bg-urgent/10 border border-urgent/30'
                    : 'bg-warning/10 border border-warning/30'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-foreground">Days Until Expiry</span>
                    <span className={`text-2xl font-bold ${
                      notification.level === 'high-priority'
                        ? 'text-urgent'
                        : 'text-warning'
                    }`}>
                      {notification.daysLeft}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        notification.level === 'high-priority'
                          ? 'bg-urgent'
                          : 'bg-warning'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(10, (5 - notification.daysLeft) * 20)}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>

                {/* Tips/Suggestions */}
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                    💡 Suggestions
                  </p>
                  <div className="space-y-2">
                    {details.tips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-background/50 border border-border/30">
                        <span className="flex-shrink-0 text-sm">{tip.split(' ')[0]}</span>
                        <span className="text-xs text-muted-foreground">
                          {tip.substring(tip.indexOf(' ') + 1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notification Info */}
                <div className="pt-4 border-t border-border/30">
                  <p className="text-xs text-muted-foreground/70 mb-3">NOTIFICATION INFO</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Created</span>
                      <span className="text-foreground font-medium">{formattedDate}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Time</span>
                      <span className="text-foreground font-medium">{formattedTime}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`font-medium ${notification.readAt ? 'text-muted-foreground' : notification.level === 'high-priority' ? 'text-urgent' : 'text-warning'}`}>
                        {notification.readAt ? 'Read' : 'Unread'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-7 pt-4 border-t border-border/30">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onMarkAsConsumed(notification.id);
                    onClose();
                  }}
                  className="flex-1 py-3 rounded-lg bg-primary/20 text-primary text-sm font-bold hover:bg-primary/30 transition-colors flex items-center justify-center gap-2"
                >
                   <CheckCircle className="w-4 h-4" /> Consumed
                 </motion.button>
                 <motion.button
                   whileTap={{ scale: 0.95 }}
                   onClick={() => {
                     onMarkAsDiscarded(notification.id);
                     onClose();
                   }}
                   className="flex-1 py-3 rounded-lg bg-urgent/20 text-urgent text-sm font-bold hover:bg-urgent/30 transition-colors flex items-center justify-center gap-2"
                 >
                   <Trash2 className="w-4 h-4" /> Discarded
                 </motion.button>
                 <motion.button
                   whileTap={{ scale: 0.95 }}
                   onClick={onClose}
                   className="flex-1 py-3 rounded-lg bg-muted/30 text-muted-foreground text-sm font-bold hover:bg-muted/50 transition-colors"
                 >
                   Close
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationDetail;
