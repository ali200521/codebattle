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
  '{
    "type": "coding",
    "description": "Create a reusable Card component with TypeScript",
    "starter_code": "// Your code here",
    "questions": [
      {
        "id": 1,
        "type": "multiple_choice",
        "question": "Which React hook is used to manage component state?",
        "options": ["useEffect", "useState", "useContext", "useReducer"],
        "correct_answer": 1,
        "points": 10
      },
      {
        "id": 2,
        "type": "coding",
        "question": "Create a Card component that accepts title, description, and children props",
        "starter_code": "import React from ''react'';\n\ninterface CardProps {\n  // Define your props here\n}\n\nconst Card: React.FC<CardProps> = () => {\n  // Your implementation\n};",
        "test_cases": [
          {"input": {"title": "Test", "description": "Test desc"}, "expected": "Card rendered"}
        ],
        "points": 20
      },
      {
        "id": 3,
        "type": "multiple_choice",
        "question": "What is the correct way to pass props to a component?",
        "options": ["<Component {props} />", "<Component props={props} />", "<Component {...props} />", "<Component [props] />"],
        "correct_answer": 2,
        "points": 10
      }
    ]
  }'::jsonb,
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
  '{
    "type": "coding",
    "description": "Create a REST API with authentication",
    "starter_code": "// Your code here",
    "questions": [
      {
        "id": 1,
        "type": "multiple_choice",
        "question": "Which HTTP method is used to update an existing resource?",
        "options": ["GET", "POST", "PUT", "DELETE"],
        "correct_answer": 2,
        "points": 10
      },
      {
        "id": 2,
        "type": "multiple_choice",
        "question": "What HTTP status code indicates a successful resource creation?",
        "options": ["200 OK", "201 Created", "204 No Content", "301 Moved"],
        "correct_answer": 1,
        "points": 10
      },
      {
        "id": 3,
        "type": "coding",
        "question": "Create an API endpoint that handles user authentication with JWT",
        "starter_code": "// POST /api/auth/login\nconst loginHandler = async (req, res) => {\n  // Your implementation\n};",
        "test_cases": [
          {"input": {"email": "test@test.com", "password": "pass123"}, "expected": "token"}
        ],
        "points": 20
      }
    ]
  }'::jsonb,
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
  '{
    "type": "coding",
    "description": "Implement login/signup with JWT",
    "starter_code": "// Your code here",
    "questions": [
      {
        "id": 1,
        "type": "multiple_choice",
        "question": "What does JWT stand for?",
        "options": ["Java Web Token", "JSON Web Token", "JavaScript Web Tool", "Joint Web Token"],
        "correct_answer": 1,
        "points": 10
      },
      {
        "id": 2,
        "type": "multiple_choice",
        "question": "Where should JWT tokens be stored in the browser?",
        "options": ["localStorage", "sessionStorage", "httpOnly cookies", "URL parameters"],
        "correct_answer": 2,
        "points": 10
      },
      {
        "id": 3,
        "type": "coding",
        "question": "Implement a complete authentication flow with login and protected routes",
        "starter_code": "// Frontend: Login component\n// Backend: Auth endpoints",
        "test_cases": [
          {"input": "login", "expected": "authenticated"}
        ],
        "points": 30
      }
    ]
  }'::jsonb,
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
  '{
    "type": "coding",
    "description": "Build a dashboard with React and charts",
    "starter_code": "// Your code here",
    "questions": [
      {
        "id": 1,
        "type": "multiple_choice",
        "question": "Which library is commonly used for charts in React?",
        "options": ["Chart.js", "Recharts", "D3.js", "All of the above"],
        "correct_answer": 3,
        "points": 10
      },
      {
        "id": 2,
        "type": "coding",
        "question": "Create a reusable LineChart component that displays sales data",
        "starter_code": "import { LineChart } from ''recharts'';\n\nconst SalesChart = ({ data }) => {\n  // Implementation\n};",
        "test_cases": [
          {"input": "sales_data", "expected": "chart_rendered"}
        ],
        "points": 20
      },
      {
        "id": 3,
        "type": "coding",
        "question": "Implement real-time data updates using WebSockets",
        "starter_code": "// WebSocket connection and state management",
        "test_cases": [
          {"input": "websocket_message", "expected": "state_updated"}
        ],
        "points": 20
      }
    ]
  }'::jsonb,
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
  '{
    "type": "coding",
    "description": "Build microservices with message queues",
    "starter_code": "// Your code here",
    "questions": [
      {
        "id": 1,
        "type": "multiple_choice",
        "question": "What is the main benefit of microservices architecture?",
        "options": ["Faster code", "Independent scaling", "Less code", "Simpler deployment"],
        "correct_answer": 1,
        "points": 10
      },
      {
        "id": 2,
        "type": "multiple_choice",
        "question": "Which technology is commonly used for inter-service communication?",
        "options": ["HTTP/REST", "gRPC", "Message Queues", "All of the above"],
        "correct_answer": 3,
        "points": 10
      },
      {
        "id": 3,
        "type": "coding",
        "question": "Create a user service that communicates with an order service via message queue",
        "starter_code": "// User Service\n// Order Service\n// Message Queue Implementation",
        "test_cases": [
          {"input": "create_order", "expected": "order_created"}
        ],
        "points": 30
      }
    ]
  }'::jsonb,
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
  '{
    "type": "coding",
    "description": "Full e-commerce system",
    "starter_code": "// Your code here",
    "questions": [
      {
        "id": 1,
        "type": "multiple_choice",
        "question": "Which payment gateway is commonly used for online payments?",
        "options": ["Stripe", "PayPal", "Square", "All of the above"],
        "correct_answer": 3,
        "points": 10
      },
      {
        "id": 2,
        "type": "coding",
        "question": "Implement a shopping cart with add, remove, and update quantity features",
        "starter_code": "class ShoppingCart {\n  // Implementation\n}",
        "test_cases": [
          {"input": "add_item", "expected": "item_added"}
        ],
        "points": 20
      },
      {
        "id": 3,
        "type": "coding",
        "question": "Create a complete checkout flow with payment integration",
        "starter_code": "// Checkout component\n// Payment processing\n// Order confirmation",
        "test_cases": [
          {"input": "checkout", "expected": "order_completed"}
        ],
        "points": 30
      }
    ]
  }'::jsonb,
  5,
  90,
  3,
  'active',
  NOW(),
  NOW() + INTERVAL '7 days'
FROM skill_areas sa
WHERE sa.name = 'Full Stack'
LIMIT 1;
