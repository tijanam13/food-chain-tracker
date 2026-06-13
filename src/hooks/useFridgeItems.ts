import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FridgeItem {
  id: string;
  name: string;
  category: string;
  expiry_date: string | null;
  gtin_code: string | null;
  quantity: number;
  unit: string;
  status: string;
  created_at: string;
  user_id: string;
  remaining_fridge_days: number | null;
}

export function formatQtyUnit(quantity: number, unit: string): string {
  const display = Number.isInteger(quantity) ? quantity.toString() : quantity.toFixed(1);
  return `${display} ${unit}`;
}

export function getConsumeStep(unit: string): number {
  if (unit === "g" || unit === "ml") return 100;
  if (unit === "kg" || unit === "l") return 0.1;
  return 1;
}

/**
 * Returns fridge items for the current user AND all family group members.
 */
export function useFridgeItems() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["fridge_items", user?.id],
    queryFn: async (): Promise<FridgeItem[]> => {
      if (!user) return [];

      // Get all family group member user IDs
      const { data: myMemberships } = await supabase.from("family_members").select("group_id").eq("user_id", user.id);

      let userIds = [user.id];

      if (myMemberships && myMemberships.length > 0) {
        const groupIds = myMemberships.map((m) => m.group_id);
        const { data: allMembers } = await supabase.from("family_members").select("user_id").in("group_id", groupIds);

        if (allMembers) {
          const ids = new Set(allMembers.map((m) => m.user_id));
          // Also include group owners
          const { data: groups } = await supabase.from("family_groups").select("owner_id").in("id", groupIds);
          if (groups) {
            groups.forEach((g) => ids.add(g.owner_id));
          }
          userIds = [...ids];
        }
      }

      const { data, error } = await supabase
        .from("fridge_items")
        .select("*")
        .in("user_id", userIds)
        .in("status", ["fridge", "freezer", "in_fridge", "expired"])
        .order("expiry_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as FridgeItem[]) || [];
    },
    enabled: !!user,
  });
}

export function getUrgency(expiryDate: string | null): "urgent" | "warning" | "safe" {
  if (!expiryDate) return "safe";
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 2) return "urgent";
  if (days <= 5) return "warning";
  return "safe";
}

export function getDaysLeft(expiryDate: string | null): number {
  if (!expiryDate) return 999;
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    Dairy: "🥛",
    Meat: "🥩",
    Fruit: "🍎",
    Vegetable: "🥬",
    Bakery: "🍞",
    Pantry: "🫙",
    Beverage: "🧃",
    Fish: "🐟",
    Seafood: "🦐",
    Eggs: "🥚",
    Frozen: "🧊",
    Snacks: "🍿",
    Condiments: "🫙",
    Sweets: "🍫",
    Other: "🍽️",
  };
  return map[category] || "🍽️";
}
