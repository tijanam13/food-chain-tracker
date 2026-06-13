# Smart Notification System - Implementation Guide

## Overview
The Smart Notification System automatically scans your fridge items and creates intelligent notifications based on expiry dates.

## Features Implemented

### 1. **Notification Logic**
- **Level 1 (Warning)**: Items expiring in 10 days
  - Message: "Item [Name] expires in 10 days. Consider using it soon."
  - Color: Yellow/Warning
  
- **Level 2 (High Priority/Donation)**: Items expiring in 5 days or less
  - Message: "⚠️ High Priority: [Name] expires in [X] days. Donate it now to earn bonus tokens!"
  - Color: Red/Urgent
  - Daily persistent notification

- **Duplicate Prevention**: Same item won't generate duplicate notifications on the same day

### 2. **UI Components**

#### Bell Icon (Header)
- Located in the top-right of the header
- Red badge showing unread notification count
- Pulsing animation when new notification arrives
- Click to open notification drawer

#### Notification Drawer
- Dropdown list of all notifications
- Categorized into two sections:
  - **Active Notifications** (unread) - at the top with full details
  - **Read Notifications** - collapsed section at the bottom
- Max height of 500px with scrollable content
- Click outside to close

#### Notification Card
- Item name and full message
- Timestamp of creation
- Two action buttons:
  - ✓ **Mark as Read** (CheckCircle2 icon)
  - 🗑️ **Delete** (Trash2 icon)
- Color-coded left border:
  - Yellow for 10-day warnings
  - Red for 5-day high-priority items

#### Clear All Button
- At the bottom of the drawer
- Clears all today's notifications
- Red text with trash icon

### 3. **Sound Effect**
- Plays a subtle 3-beep notification sound when new notifications are created
- Uses Web Audio API (no external files needed)
- Gracefully degrades if audio context not available

### 4. **Data Persistence**
- All notifications stored in localStorage
- Survives page refreshes
- Automatic cleanup of deleted notifications

## How It Works

### Notification Generation Flow
1. App loads → Hook checks all fridge items
2. For each item:
   - If days left ≤ 10: Create "warning" notification
   - If days left ≤ 5: Create "high-priority" notification
   - Check localStorage for duplicate today → Skip if duplicate exists
3. New notification triggers:
   - Sound effect plays
   - Red badge updates
   - Notification appears in drawer
   - Pulsing bell animation

### Storage Structure
```typescript
// Stored in localStorage under key: 'smart-shelf-notifications'
{
  id: string;              // Unique ID
  itemId: string;          // Fridge item ID
  itemName: string;        // Item name
  message: string;         // Full notification message
  level: 'warning' | 'high-priority';
  daysLeft: number;        // Days until expiry
  createdAt: ISO string;   // Timestamp
  readAt: ISO string | null;    // When marked as read
  deletedAt: ISO string | null; // When deleted
  date: 'YYYY-MM-DD';      // For duplicate prevention
}
```

## Integration Points

### 1. Header Component (`Header.tsx`)
```tsx
import NotificationCenter from "@/components/NotificationCenter";

// In the header, within user logged-in section:
<NotificationCenter />
```

### 2. Using the Hook (`useNotifications`)
```tsx
import { useNotifications } from '@/hooks/useNotifications';

const MyComponent = () => {
  const {
    notifications,        // Active (unread, not deleted) notifications
    allNotifications,     // All notifications ever created
    unreadCount,         // Number of unread notifications
    hasNewNotification,  // Boolean - true when new notification just created
    markAsRead,          // Function to mark notification as read
    deleteNotification,  // Function to delete a notification
    clearAll,           // Function to clear all today's notifications
  } = useNotifications();

  return (
    // Your component
  );
};
```

## Customization Options

### Adjust Notification Thresholds
Edit `src/hooks/useNotifications.ts`:

```typescript
// Line 122-130 in useNotifications hook
// Level 1: Change 10 to any number of days
if (days <= 10 && days > 5) {
  createNotification(item.id, item.name, 'warning', days);
}

// Level 2: Change 5 to any number of days
if (days <= 5 && days >= 0) {
  createNotification(item.id, item.name, 'high-priority', days);
}
```

### Change Notification Colors
Edit `src/components/NotificationCenter.tsx`:

```typescript
// Line 145 - Change color scheme
className={`px-5 py-4 ... ${
  notification.level === 'high-priority'
    ? 'bg-urgent/5 border-l-4 border-urgent'  // Change 'urgent' to another color
    : 'bg-warning/5 border-l-4 border-warning' // Change 'warning' to another color
}`}
```

### Change Sound Effect
Edit `src/hooks/useNotifications.ts` - `playNotificationSound()` function:

```typescript
// Modify the oscillator frequency and timing
oscillator.frequency.value = 800;  // Change pitch (higher = higher note)
gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
// Change 0.1 to adjust duration
```

## Testing the Notification System

### Steps to Test:
1. Go to Fridge page and add an item with:
   - Expiry date: 10 days from today → Should create "warning" notification
   - Expiry date: 3 days from today → Should create "high-priority" notification
   
2. Refresh page → Notifications persist in localStorage

3. Click bell icon → Drawer opens showing all notifications

4. Click "Mark as Read" → Card moves to "Read Notifications" section

5. Click "Delete" → Notification removed from drawer

6. Add same item again next day → New notification created (previous one still shows if not deleted)

7. Click "Clear All" → All today's unread notifications cleared

### Expected Sound
- 3 brief beeps at different pitches
- Plays when NEW notification is created
- Only once per notification creation

## Browser Compatibility
- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Web Audio API required for sound
- ✅ localStorage required for persistence
- ✅ Graceful degradation if either unavailable

## Performance Considerations
- Notification check runs once on app load and when fridgeItems change
- Efficient duplicate prevention using date-based key
- localStorage used instead of backend to reduce server calls
- Scrollable list prevents excessive DOM rendering

## Future Enhancement Ideas
1. Add notification preferences (e.g., disable sound, change threshold)
2. Export/backup notification history
3. Integration with email/SMS for critical alerts
4. Snooze functionality for notifications
5. Notification categories (Items, Tips, Achievements)
