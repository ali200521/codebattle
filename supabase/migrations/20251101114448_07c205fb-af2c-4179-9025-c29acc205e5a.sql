-- Allow authenticated users to insert quizzes (for AI-generated quizzes)
CREATE POLICY "Authenticated users can create quizzes" 
ON public.quizzes 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create bot profiles for testing
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'bot1@codebattle.test', 'disabled', NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000002', 'bot2@codebattle.test', 'disabled', NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000003', 'bot3@codebattle.test', 'disabled', NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000004', 'bot4@codebattle.test', 'disabled', NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000005', 'bot5@codebattle.test', 'disabled', NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Create profiles for bots
INSERT INTO profiles (id, username, display_name, current_level, total_xp)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'CodeNinja', 'Code Ninja', 3, 2500),
  ('00000000-0000-0000-0000-000000000002', 'DevMaster', 'Dev Master', 4, 3800),
  ('00000000-0000-0000-0000-000000000003', 'BugHunter', 'Bug Hunter', 2, 1800),
  ('00000000-0000-0000-0000-000000000004', 'PixelPro', 'Pixel Pro', 3, 2200),
  ('00000000-0000-0000-0000-000000000005', 'DataDragon', 'Data Dragon', 5, 4500)
ON CONFLICT (id) DO NOTHING;

-- Add bot skill levels
INSERT INTO user_skill_levels (user_id, skill_area_id, level, xp, assessment_completed)
SELECT 
  bot.id,
  sa.id,
  (RANDOM() * 4 + 1)::INTEGER,
  (RANDOM() * 1000)::INTEGER,
  true
FROM 
  (SELECT id FROM profiles WHERE id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005'
  )) bot
CROSS JOIN skill_areas sa
ON CONFLICT (user_id, skill_area_id) DO NOTHING;