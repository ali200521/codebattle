-- ============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================
-- This trigger automatically creates a profile in the profiles table
-- when a new user signs up via Supabase Auth
-- This works regardless of email confirmation settings
-- ============================================

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with username from metadata if available
  INSERT INTO public.profiles (id, username, display_name, total_xp, current_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    0,
    1
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires after a user is created in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- INSTRUCTIONS TO RUN THIS:
-- ============================================
-- 1. Go to your Supabase Dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Copy and paste this entire file
-- 5. Click "Run" or press Ctrl+Enter
-- ============================================
