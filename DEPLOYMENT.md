# Deployment Guide

## Edge Functions Deployment

The challenges page requires edge functions to be deployed to Supabase. Here's how to deploy them:

### Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

### Deploy Edge Functions

The following edge functions need to be deployed:
- `create-1v1-match` - Creates 1v1 matches between two players
- `create-bot-squad-match` - Creates squad matches with bot teammates
- `match-squad` - Handles squad formation and matching
- `find-1v1-opponent` - Finds opponents for 1v1 matches
- `generate-bot-chat-response` - Generates bot responses in chat
- `generate-quiz` - Generates quiz questions

#### Deploy All Functions

From the project root directory:

```bash
# Link to your project
supabase link --project-ref noijgivyizwseqqqwgaf

# Deploy all edge functions
supabase functions deploy create-1v1-match
supabase functions deploy create-bot-squad-match
supabase functions deploy match-squad
supabase functions deploy find-1v1-opponent
supabase functions deploy generate-bot-chat-response
supabase functions deploy generate-quiz
```

Or deploy all at once:

```bash
supabase functions deploy
```

### Verify Deployment

1. Go to https://supabase.com/dashboard/project/noijgivyizwseqqqwgaf/functions
2. Check that all functions are listed and have a "Deployed" status
3. Test a function by going to the Challenges page and clicking a bot match button

## Database Migration

The seed challenges migration needs to be applied:

1. Go to https://supabase.com/dashboard/project/noijgivyizwseqqqwgaf/editor
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20251102000000_add_seed_challenges.sql`
4. Paste into the SQL editor and click **Run**

This will:
- Add 3 1v1 challenges with questions
- Add 3 squad challenges with questions
- Populate the challenges page with real data

## Troubleshooting

### "Failed to send request to edge function error"

This error occurs when edge functions are not deployed. Follow the deployment steps above.

### "Test bot not available"

This means the bot profiles haven't been created. Run this migration:
- `supabase/migrations/20251101235200_1d52498e-8126-422f-b443-f0d48a48f80e.sql`

### No Challenges Showing

Apply the seed challenges migration as described above.

## Alternative: Deploy via Supabase Dashboard

If you prefer using the dashboard:

1. Go to https://supabase.com/dashboard/project/noijgivyizwseqqqwgaf/functions
2. Click "New Function"
3. For each function in `supabase/functions/`:
   - Copy the function name
   - Copy the entire `index.ts` content
   - Paste into the dashboard editor
   - Click "Deploy"

This is more time-consuming but doesn't require the CLI.
