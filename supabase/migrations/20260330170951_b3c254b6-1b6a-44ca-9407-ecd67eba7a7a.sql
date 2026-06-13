
-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create family groups table
CREATE TABLE public.family_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Moja porodica',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_family_groups_updated_at BEFORE UPDATE ON public.family_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create family members table
CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Family group policies
CREATE POLICY "Authenticated can view groups" ON public.family_groups FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Owner can update group" ON public.family_groups FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can create groups" ON public.family_groups FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can delete group" ON public.family_groups FOR DELETE USING (owner_id = auth.uid());

-- Family member policies
CREATE POLICY "Members can view group members" ON public.family_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.group_id = family_members.group_id AND fm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.family_groups fg WHERE fg.id = family_members.group_id AND fg.owner_id = auth.uid()));
CREATE POLICY "Users can join groups" ON public.family_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or self can remove members" ON public.family_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.family_groups fg WHERE fg.id = family_members.group_id AND fg.owner_id = auth.uid()) OR user_id = auth.uid());

-- Family members can view each other's profiles
CREATE POLICY "Family members can view each other" ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm1
      JOIN public.family_members fm2 ON fm1.group_id = fm2.group_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id = profiles.user_id
    )
  );
