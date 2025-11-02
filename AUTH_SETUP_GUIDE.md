# 🔐 Authentication Setup Guide

This guide will help you fix the sign in and sign up functionality by disabling email confirmation in Supabase.

## 📋 What Was Fixed

### Issues Identified:
1. ❌ **Email confirmation was enabled** - Users couldn't sign in until they confirmed their email
2. ❌ **Profile creation failed** - RLS policy blocked profile creation for unconfirmed users
3. ❌ **Poor error messages** - Users didn't know what was wrong

### Solutions Implemented:
1. ✅ **Updated signup flow** - Now handles both email confirmation enabled/disabled
2. ✅ **Better error messages** - Clear feedback about email confirmation and login issues
3. ✅ **Database trigger** - Automatically creates user profiles (bypasses RLS)
4. ✅ **Improved UX** - Shows appropriate messages for each scenario

---

## 🚀 Quick Fix (5 Minutes)

Follow these steps to disable email confirmation and make sign up/sign in work immediately:

### Step 1: Disable Email Confirmation in Supabase

1. **Go to your Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/noijgivyizwseqqqwgaf

2. **Navigate to Authentication Settings**
   - Click **"Authentication"** in the left sidebar
   - Click **"Providers"** tab
   - Find **"Email"** provider

3. **Disable Email Confirmation**
   - Scroll down to **"Email Confirmation"** section
   - **UNCHECK** the box that says **"Enable email confirmations"**
   - Click **"Save"** at the bottom

### Step 2: Run the Database Trigger (Important!)

This trigger automatically creates user profiles when someone signs up.

1. **Go to SQL Editor**
   - In your Supabase Dashboard, click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

2. **Copy and Paste the Trigger SQL**
   - Open the file `supabase-auth-trigger.sql` in your project
   - Copy the entire contents
   - Paste into the SQL Editor

3. **Run the SQL**
   - Click **"Run"** button or press **Ctrl+Enter** (Cmd+Enter on Mac)
   - You should see: **"Success. No rows returned"**

### Step 3: Test Sign Up and Sign In

1. **Clear your browser's local storage** (optional but recommended)
   - Open browser DevTools (F12)
   - Go to Application → Local Storage
   - Clear all items for your localhost

2. **Test Sign Up**
   - Go to http://localhost:5173/auth (or your dev URL)
   - Click **"Sign Up"** tab
   - Enter username, email, and password
   - Click **"Create Account"**
   - ✅ Should see: "Account created! Redirecting to onboarding..."
   - ✅ Should redirect to `/onboarding` page

3. **Test Sign Out and Sign In**
   - Sign out from your account
   - Go back to `/auth`
   - Click **"Login"** tab
   - Enter your email and password
   - Click **"Login"**
   - ✅ Should see: "Welcome back!"
   - ✅ Should redirect to `/dashboard`

---

## 🔧 What the Code Changes Do

### 1. Enhanced Signup Flow (`src/pages/Auth.tsx`)

**Before:**
```typescript
// Always tried to create profile, failed if email confirmation enabled
const { error: profileError } = await supabase.from("profiles").insert({...});
if (profileError) throw profileError; // ❌ Failed silently
```

**After:**
```typescript
// Check if user has session (email confirmation disabled)
if (authData.session) {
  // Create profile as fallback (trigger should handle it)
  const { error: profileError } = await supabase.from("profiles").insert({...});
  // Ignore duplicate errors (trigger already created it)
  if (profileError && profileError.code !== '23505') {
    console.error("Profile creation error:", profileError);
  }
  navigate("/onboarding"); // ✅ Works!
} else {
  // Email confirmation required - show message
  toast.success("Please check your email to confirm your account");
}
```

### 2. Better Login Error Messages (`src/pages/Auth.tsx`)

**Before:**
```typescript
if (error) throw error; // ❌ Generic "Email not confirmed" error
```

**After:**
```typescript
if (error.message.includes("Email not confirmed")) {
  throw new Error("Please confirm your email address before signing in. Check your inbox for the confirmation link.");
}
if (error.message.includes("Invalid login credentials")) {
  throw new Error("Invalid email or password. Please check your credentials and try again.");
}
```

### 3. Database Trigger for Auto Profile Creation

**File:** `supabase-auth-trigger.sql`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, total_xp, current_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    ...
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- ✅ Bypasses RLS!
```

**How it works:**
- Triggers automatically when a user signs up
- Uses `SECURITY DEFINER` to bypass RLS policies
- Gets username from signup metadata or email
- Creates profile even if user hasn't confirmed email yet
- Prevents duplicate errors with `ON CONFLICT DO NOTHING`

---

## 🎯 Expected Behavior After Setup

### Sign Up (Email Confirmation Disabled):
1. User fills out signup form
2. Account created immediately ✅
3. Profile created automatically (by trigger) ✅
4. User is authenticated with session ✅
5. Redirects to onboarding ✅
6. No email confirmation needed ✅

### Sign In:
1. User enters email and password
2. If credentials valid → "Welcome back!" ✅
3. If invalid → "Invalid email or password..." ✅
4. Redirects to dashboard ✅

---

## 🔍 Troubleshooting

### Issue: "Email not confirmed" error when signing in

**Solution:** Email confirmation is still enabled.
- Follow Step 1 above to disable it in Supabase Dashboard

### Issue: Profile not created after signup

**Solution:** Database trigger not installed.
- Follow Step 2 above to run the trigger SQL

### Issue: "Username already taken" error

**Solution:** Username is already in use.
- Choose a different username
- Or check the database to see existing profiles

### Issue: Still can't sign in after fixing

**Solution:** Clear browser local storage and try again.
```javascript
// In browser console:
localStorage.clear();
```

### Issue: RLS policy error when creating profile

**Solution:** The trigger should bypass this, but if you still see it:
1. Make sure you ran `supabase-auth-trigger.sql`
2. Check that email confirmation is disabled
3. Check browser console for detailed error messages

---

## 📊 How to Verify It's Working

### Check Database Trigger is Installed:

Run this in Supabase SQL Editor:
```sql
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';
```

Should return the function definition.

### Check Email Confirmation Setting:

Run this in Supabase SQL Editor:
```sql
SELECT * FROM auth.config;
```

Look for `enable_email_confirmations` - should be `false`.

### Check Profile Creation:

After signing up, run this in Supabase SQL Editor:
```sql
SELECT id, username, email FROM auth.users
ORDER BY created_at DESC LIMIT 5;
```

And:
```sql
SELECT id, username, display_name, created_at FROM public.profiles
ORDER BY created_at DESC LIMIT 5;
```

The user ID should appear in both tables.

---

## 🎓 Understanding the Fix

### Why Email Confirmation Broke Everything:

1. **Supabase Default:** Email confirmation is ENABLED by default
2. **What Happens:** User signs up → Account created but NO session until email confirmed
3. **The Problem:** Code tried to create profile immediately → RLS blocked it (no authenticated session)
4. **Result:** User can't sign up AND can't sign in (email not confirmed)

### Why Disabling Email Confirmation Works:

1. **New Flow:** User signs up → Account created WITH session immediately
2. **Trigger Runs:** Database trigger creates profile (bypasses RLS with SECURITY DEFINER)
3. **User Authenticated:** User has session, can access protected pages
4. **Result:** Sign up and sign in both work! ✅

### Why the Trigger is Important:

Without the trigger:
- Code manually creates profile in Auth.tsx
- If email confirmation enabled, this fails (no session)
- User stuck in limbo (account exists but no profile)

With the trigger:
- Profile created automatically by database
- Works with OR without email confirmation
- Uses SECURITY DEFINER to bypass RLS
- Gets username from signup metadata
- Cleaner, more reliable

---

## 🚨 Important Notes

### Security Consideration:
Disabling email confirmation means:
- ✅ **Pro:** Users can sign up and use the app immediately
- ⚠️ **Con:** No verification that email address is real
- ⚠️ **Con:** Users could sign up with fake emails

**For Production:** Consider re-enabling email confirmation and:
1. Keep the database trigger (it works with email confirmation)
2. Update the UI to clearly show "Check your email" after signup
3. Add a "Resend confirmation email" button
4. Handle the email confirmation callback properly

### Development vs Production:
- **Development:** Email confirmation disabled = faster testing ✅
- **Production:** Email confirmation enabled = better security 🔒

You can always re-enable email confirmation later once you've verified the basic flow works.

---

## ✅ Checklist

- [ ] Disabled email confirmation in Supabase Dashboard
- [ ] Ran `supabase-auth-trigger.sql` in SQL Editor
- [ ] Tested sign up - account created and redirected to onboarding
- [ ] Tested sign in - successfully logged in and redirected to dashboard
- [ ] Verified profile created in database
- [ ] Cleared browser local storage before testing

---

## 📚 Next Steps (Optional Improvements)

After you've verified authentication works, consider implementing:

1. **AuthContext** - Centralized authentication state management
2. **ProtectedRoute** - Route wrapper to protect pages from unauthenticated access
3. **Password Reset** - "Forgot Password" functionality
4. **Email Change** - Allow users to update their email
5. **Session Timeout Handling** - Gracefully handle expired sessions

These are already planned in the codebase but not yet implemented.

---

## 🆘 Still Having Issues?

If you're still having problems after following this guide:

1. **Check browser console** for detailed error messages
2. **Check Supabase logs** in Dashboard → Logs → Auth Logs
3. **Verify environment variables** in `.env` file
4. **Make sure dev server is running** with `npm run dev`
5. **Try a different browser** or incognito mode
6. **Check network tab** to see API responses from Supabase

Good luck! 🚀
