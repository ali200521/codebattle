-- ============================================
-- Create Seed Challenges for Code Battle
-- ============================================

-- Insert 1v1 challenges for different skill areas
INSERT INTO challenges (
  skill_area_id,
  title,
  description,
  challenge_type,
  content,
  difficulty_level,
  time_limit,
  max_squad_size,
  status,
  starts_at,
  ends_at
)
SELECT
  sa.id,
  'React Component Battle',
  'Build a responsive card component with proper TypeScript types',
  '1v1',
  '{"type": "coding", "description": "Create a reusable Card component with TypeScript", "starter_code": "// Your code here"}'::jsonb,
  2,
  15,
  1,
  'active',
  NOW(),
  NOW() + INTERVAL '7 days'
FROM skill_areas sa
WHERE sa.name = 'Frontend Development'
LIMIT 1;

INSERT INTO challenges (
  skill_area_id,
  title,
  description,
  challenge_type,
  content,
  difficulty_level,
  time_limit,
  max_squad_size,
  status,
  starts_at,
  ends_at
)
SELECT
  sa.id,
  'API Design Challenge',
  'Design and implement a RESTful API endpoint with proper error handling',
  '1v1',
  '{"type": "coding", "description": "Create a REST API with authentication", "starter_code": "// Your code here"}'::jsonb,
  3,
  20,
  1,
  'active',
  NOW(),
  NOW() + INTERVAL '7 days'
FROM skill_areas sa
WHERE sa.name = 'Backend Development'
LIMIT 1;

INSERT INTO challenges (
  skill_area_id,
  title,
  description,
  challenge_type,
  content,
  difficulty_level,
  time_limit,
  max_squad_size,
  status,
  starts_at,
  ends_at
)
SELECT
  sa.id,
  'Full Stack Feature',
  'Build a complete user authentication flow from frontend to backend',
  '1v1',
  '{"type": "coding", "description": "Implement login/signup with JWT", "starter_code": "// Your code here"}'::jsonb,
  4,
  30,
  1,
  'active',
  NOW(),
  NOW() + INTERVAL '7 days'
FROM skill_areas sa
WHERE sa.name = 'Full Stack'
LIMIT 1;

-- Insert Squad challenges
INSERT INTO challenges (
  skill_area_id,
  title,
  description,
  challenge_type,
  content,
  difficulty_level,
  time_limit,
  max_squad_size,
  status,
  starts_at,
  ends_at
)
SELECT
  sa.id,
  'Team Dashboard Build',
  'Collaborate to build a full analytics dashboard with charts and real-time data',
  'squad',
  '{"type": "coding", "description": "Build a dashboard with React and charts", "starter_code": "// Your code here"}'::jsonb,
  3,
  45,
  3,
  'active',
  NOW(),
  NOW() + INTERVAL '7 days'
FROM skill_areas sa
WHERE sa.name = 'Frontend Development'
LIMIT 1;

INSERT INTO challenges (
  skill_area_id,
  title,
  description,
  challenge_type,
  content,
  difficulty_level,
  time_limit,
  max_squad_size,
  status,
  starts_at,
  ends_at
)
SELECT
  sa.id,
  'Microservices Architecture',
  'Design and implement a microservices system with proper communication',
  'squad',
  '{"type": "coding", "description": "Build microservices with message queues", "starter_code": "// Your code here"}'::jsonb,
  5,
  60,
  3,
  'active',
  NOW(),
  NOW() + INTERVAL '7 days'
FROM skill_areas sa
WHERE sa.name = 'Backend Development'
LIMIT 1;

INSERT INTO challenges (
  skill_area_id,
  title,
  description,
  challenge_type,
  content,
  difficulty_level,
  time_limit,
  max_squad_size,
  status,
  starts_at,
  ends_at
)
SELECT
  sa.id,
  'E-Commerce Platform',
  'Build a complete e-commerce platform with cart, checkout, and payments',
  'squad',
  '{"type": "coding", "description": "Full e-commerce system", "starter_code": "// Your code here"}'::jsonb,
  5,
  90,
  3,
  'active',
  NOW(),
  NOW() + INTERVAL '7 days'
FROM skill_areas sa
WHERE sa.name = 'Full Stack'
LIMIT 1;
