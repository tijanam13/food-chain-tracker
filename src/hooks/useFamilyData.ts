import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

async function getFamilyUserIds(userId: string): Promise<string[]> {
  const { data: myMemberships } = await supabase
    .from("family_members")
    .select("group_id")
    .eq("user_id", userId);

  let userIds = [userId];

  if (myMemberships && myMemberships.length > 0) {
    const groupIds = myMemberships.map((m) => m.group_id);
    const { data: allMembers } = await supabase
      .from("family_members")
      .select("user_id")
      .in("group_id", groupIds);

    if (allMembers) {
      const ids = new Set(allMembers.map((m) => m.user_id));
      const { data: groups } = await supabase
        .from("family_groups")
        .select("owner_id")
        .in("id", groupIds);
      if (groups) groups.forEach((g) => ids.add(g.owner_id));
      userIds = [...ids];
    }
  }

  return userIds;
}

export function useFamilyTokens() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["family_tokens", user?.id],
    queryFn: async () => {
      if (!user) return { tokens: 0, points: 0 };
      const userIds = await getFamilyUserIds(user.id);

      const { data } = await supabase
        .from("user_tokens")
        .select("total_tokens, total_points")
        .in("user_id", userIds);

      const tokens = (data || []).reduce((sum, r) => sum + ((r as any).total_tokens || 0), 0);
      const points = (data || []).reduce((sum, r) => sum + ((r as any).total_points || 0), 0);

      return { tokens, points };
    },
    enabled: !!user,
  });
}

export function useFamilyStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["family_stats", user?.id],
    queryFn: async () => {
      if (!user) return { donationsCount: 0, usedRecipesCount: 0, lessWaste: "0g" };
      const userIds = await getFamilyUserIds(user.id);

      const { data: donationData } = await supabase
        .from("donations")
        .select("id, quantity, unit")
        .in("user_id", userIds);

      const { data: recipesData } = await supabase
        .from("used_recipes")
        .select("id")
        .in("user_id", userIds);

      let totalKg = 0;
      if (donationData) {
        for (const d of donationData) {
          const qty = Number(d.quantity) || 0;
          const unit = (d as any).unit || "pcs";
          if (unit === "kg") totalKg += qty;
          else if (unit === "g") totalKg += qty / 1000;
          else totalKg += qty * 0.2;
        }
      }
      totalKg += (recipesData?.length ?? 0) * 0.5;

      const lessWaste = totalKg >= 1 ? `${totalKg.toFixed(1)}kg` : `${Math.round(totalKg * 1000)}g`;

      return {
        donationsCount: donationData?.length ?? 0,
        usedRecipesCount: recipesData?.length ?? 0,
        lessWaste,
      };
    },
    enabled: !!user,
  });
}

export { getFamilyUserIds };
