-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create items table
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('clothes', 'electronics', 'books', 'furniture')),
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  is_donation BOOLEAN DEFAULT false,
  photo_url TEXT,
  city TEXT,
  pincode TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active items" ON public.items FOR SELECT USING (status = 'active');
CREATE POLICY "Users can insert own items" ON public.items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON public.items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own items" ON public.items FOR DELETE USING (auth.uid() = user_id);

-- Create interests table (right swipes)
CREATE TABLE public.interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interests" ON public.interests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interests" ON public.interests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own interests" ON public.interests FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for item photos
INSERT INTO storage.buckets (id, name, public) VALUES ('item-photos', 'item-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view item photos" ON storage.objects FOR SELECT USING (bucket_id = 'item-photos');
CREATE POLICY "Users can upload item photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'item-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own photos" ON storage.objects FOR UPDATE USING (bucket_id = 'item-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'item-photos' AND auth.uid()::text = (storage.foldername(name))[1]);