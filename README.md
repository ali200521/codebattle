CodeBattle – Code Battle
A real-time coding quiz and squad challenge platform built with Vite, TypeScript, React, shadcn-ui, Tailwind CSS, and Supabase backend.
AI-powered teammate chat and quiz generation is handled via Lovable AI (external API), with flexible deployment.

🌐 Live Demo
Project URL: codebattle916.lovable.app

🔥 Features
- Live squad-based coding quiz battles
- AI teammate chat with short, context-aware responses
- Quiz generation for React, API, performance, and more
- User skill levels and XP tracking
- Realtime leaderboard and squad chat
- Responsive UI powered by Tailwind/shadcn-ui

🛠️ Tech Stack
Frontend: Vite + TypeScript + React + shadcn-ui + Tailwind CSS
Backend: Supabase Edge Functions (for chat and quiz AI)
AI Integration: Lovable AI API endpoints for quiz generation and chat bots

⚡ How to Run Locally
1. Clone the repository
bash
git clone https://github.com/ali200521/squad-quest-ai
cd squad-quest-ai
2. Install dependencies
bash
npm install
3. Start the development server
bash
npm run dev
Visit http://localhost:5173 to view the app.

4. Set up Supabase backend
Create a Supabase project and tables as outlined in supabase-database-setup.sql.

Deploy Edge Functions for bot chat and quiz generation:

bash
supabase functions deploy generate-bot-chat-response
supabase functions deploy generate-quiz
Add your Lovable API key to function environment variables.

5. Connect Lovable AI
The Supabase Edge Functions invoke Lovable API endpoints (chat/completions) for AI chat and quiz features.
AI responses are processed and displayed in squad chat and quiz screens.

6. Deploy to Lovable
Once you’re ready, use Lovable's “Share → Publish” feature to deploy to your custom URL (as above).

🧠 Project Structure
text
/
├─ public/
├─ src/
│  ├─ components/
│  ├─ pages/
│  ├─ integrations/
│  └─ ...
├─ supabase/
│  └─ functions/
├─ supabase-database-setup.sql
├─ README.md
├─ package.json
└─ ... other configs

📝 About AI Integration
The backend runs on Supabase and calls Lovable AI APIs.
You can change models/endpoints by updating Edge Function code.
API keys and configuration should be managed via environment variables (never hardcoded).


📋 License
MIT (customize if you need a different license)

✨ Custom Domain & Deployment
You can connect your own domain to your Lovable project via Project → Settings → Domains.

For more details, see Lovable docs on domain setup.

