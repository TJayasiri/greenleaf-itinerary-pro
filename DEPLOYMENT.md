# 🚀 Greenleaf Itinerary Pro - Deployment Guide

## ⏱️ Total Time: 30-60 minutes

---

## 📋 STEP 1: Supabase Setup (15 min)

### 1.1 Create Supabase Project
1. Go to https://supabase.com
2. Click "Start your project" → Sign in with GitHub
3. Create new project:
   - Name: `greenleaf-itinerary`
   - Database Password: (save this securely)
   - Region: Choose closest to your location
   - Wait 2-3 minutes for setup

### 1.2 Create Database Tables
1. Click "SQL Editor" in left sidebar
2. Click "New Query"
3. Copy ALL content from `supabase/schema.sql`
4. Paste and click "Run"
5. You should see: "Success. No rows returned"

### 1.3 Setup Storage Bucket
1. Click "Storage" in left sidebar
2. Click "Create bucket"
3. Name: `itinerary-docs`
4. Public bucket: **NO** (keep private)
5. Click "Create bucket"

### 1.4 Configure Storage Policies
1. Click on `itinerary-docs` bucket
2. Click "Policies" tab
3. Click "New Policy"
4. Add these policies:

**INSERT Policy:**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'itinerary-docs');
```

**SELECT Policy:**
```sql
CREATE POLICY "Users can view their files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'itinerary-docs');
```

### 1.5 Get API Keys
1. Click "Settings" → "API"
2. Copy these (you'll need them later):
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (keep secret!)

---

## 📧 STEP 2: Email Setup (10 min)

### 2.1 Create Resend Account
1. Go to https://resend.com
2. Sign up (free tier: 100 emails/day)
3. Verify your email
4. Go to "API Keys"
5. Click "Create API Key"
6. Copy the key (starts with `re_`)

### 2.2 Add Domain (Optional - for production)
1. Go to "Domains"
2. Add your domain (e.g., `greenleaf.com`)
3. Follow DNS setup instructions
4. **For testing**: Use `onboarding@resend.dev` as sender

---

## 💻 STEP 3: Local Development (10 min)

### 3.1 Setup Project
```bash
# Create project folder
mkdir greenleaf-itinerary-pro
cd greenleaf-itinerary-pro

# Copy all files from artifacts
# (Copy package.json, all .ts, .tsx, .css, .sql files)

# Install dependencies
npm install
```

### 3.2 Configure Environment
1. Create `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
RESEND_API_KEY=re_your_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

2. Replace the values with your actual keys

### 3.3 Test Locally
```bash
npm run dev
```

Open http://localhost:3000 - you should see the landing page!

---

## 🌐 STEP 4: Deploy to Vercel (10 min)

### 4.1 Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/greenleaf-itinerary.git
git push -u origin main
```

### 4.2 Deploy via Vercel
1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: (leave default)

5. **Environment Variables** - Add these:
```
NEXT_PUBLIC_SUPABASE_URL = [your supabase url]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [your anon key]
SUPABASE_SERVICE_ROLE_KEY = [your service role key]
RESEND_API_KEY = [your resend key]
NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
```

6. Click "Deploy"
7. Wait 2-3 minutes
8. Copy your live URL!

---

## 👤 STEP 5: Create First Admin User (5 min)

You need to manually create the first admin in Supabase:

### 5.1 Create Auth User
1. Go to Supabase Dashboard → "Authentication" → "Users"
2. Click "Add user" → "Create new user"
3. Enter:
   - Email: `admin@greenleaf.com`
   - Password: (strong password)
   - Auto Confirm User: **YES**
4. Click "Create user"
5. **Copy the user's UUID** (looks like: `abc123-def456-...`)

### 5.2 Add Admin Role
1. Go to "SQL Editor"
2. Run this query (replace `USER_ID_HERE` with the UUID you copied):

```sql
INSERT INTO user_roles (id, role, name, email)
VALUES ('USER_ID_HERE', 'admin', 'Admin User', 'admin@greenleaf.com');
```

3. You can now login at: `https://your-app.vercel.app/login`

---

## ✅ STEP 6: Test Everything (10 min)

### 6.1 Login as Admin
1. Go to `/login`
2. Use: `admin@greenleaf.com` and your password
3. You should see the Admin Dashboard

### 6.2 Create Coordinator User
1. Click "Add User"
2. Create a coordinator account
3. Logout and login as coordinator

### 6.3 Create Test Itinerary
1. Click "Create New Itinerary"
2. Fill in basic info
3. Add flights and visits
4. Upload a test PDF
5. Click "Send Email"

### 6.4 Test Public Lookup
1. Logout (or open incognito window)
2. Go to homepage
3. Enter the itinerary code
4. Verify you can view it!

---

## 🎯 Production Checklist

Before going live:

- [ ] Change default admin email/password
- [ ] Update email sender from `noreply@yourdomain.com`
- [ ] Add your logo URL in itinerary editor
- [ ] Test email delivery with real addresses
- [ ] Set up domain for Resend (removes "via resend.dev")
- [ ] Enable database backups in Supabase
- [ ] Add custom domain to Vercel (optional)
- [ ] Update NEXT_PUBLIC_APP_URL to your domain

---

## 🔧 File Structure

```
greenleaf-itinerary-pro/
├── app/
│   ├── page.tsx                 # Landing/Lookup page
│   ├── login/page.tsx           # Login page
│   ├── dashboard/
│   │   ├── page.tsx             # Coordinator dashboard
│   │   └── edit/[id]/page.tsx   # Edit itinerary
│   ├── admin/page.tsx           # Admin panel
│   └── api/
│       └── send-itinerary/route.ts  # Email API
├── lib/
│   └── supabase.ts              # Supabase client
├── supabase/
│   └── schema.sql               # Database schema
├── .env.local                   # Environment variables
├── package.json
├── tailwind.config.js
└── next.config.js
```

---

## 💡 Quick Tips

- **Database**: Supabase free tier = 500MB (plenty for PDFs)
- **Emails**: Resend free = 100/day (upgrade for more)
- **Hosting**: Vercel free tier is perfect for this
- **Backups**: Enable Supabase weekly backups (Settings → Database)
- **Monitoring**: Check Vercel Analytics for usage

---

## 🆘 Troubleshooting

### "Row Level Security policy violation"
→ Make sure you ran the complete schema.sql file

### "Failed to send email"
→ Check RESEND_API_KEY is correct
→ For production, verify domain in Resend

### "Cannot upload files"
→ Check storage bucket name is exactly `itinerary-docs`
→ Verify storage policies are created

### "User not found after login"
→ Make sure user exists in `user_roles` table

---

## 🎉 You're Done!

Your itinerary system is now live at: `https://your-app.vercel.app`

**Next Steps:**
1. Share login credentials with coordinators
2. Test with real travel data
3. Customize branding/colors if needed
4. Monitor usage in first week

Questions? Check:
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Resend Docs: https://resend.com/docs