# ⚡ Quick Start Guide (30 Minutes)

Get Greenleaf Itinerary Pro running in 30 minutes!

---

## 🎯 Prerequisites

- [ ] Node.js 18+ installed → `node -v`
- [ ] npm installed → `npm -v`
- [ ] GitHub account (for deployment)
- [ ] 30 minutes of focused time ⏱️

---

## 🚀 Steps

### 1️⃣ Setup Supabase (10 min)

**a) Create Project**
```
1. Go to https://supabase.com → Sign in
2. Click "New Project"
3. Name: greenleaf-itinerary
4. Set database password (SAVE IT!)
5. Choose region (closest to you)
6. Wait 2 minutes for setup
```

**b) Create Database**
```
1. Click "SQL Editor" in sidebar
2. Click "New Query"
3. Copy ENTIRE contents from: supabase/schema.sql
4. Paste and click "Run"
5. Should see "Success. No rows returned"
```

**c) Create Storage Bucket**
```
1. Click "Storage" in sidebar
2. Click "Create a new bucket"
3. Name: itinerary-docs
4. Public bucket: NO (keep unchecked)
5. Click "Create bucket"
```

**d) Get API Keys**
```
1. Click "Settings" → "API"
2. Copy these THREE values:
   - Project URL
   - anon public key
   - service_role key (secret!)
```

---

### 2️⃣ Setup Email (5 min)

**a) Create Resend Account**
```
1. Go to https://resend.com
2. Sign up (free)
3. Verify email
4. Go to "API Keys"
5. Click "Create API Key"
6. Copy key (starts with re_)
```

**For testing:** You can use default sender `onboarding@resend.dev`

---

### 3️⃣ Setup Project (5 min)

**a) Install**
```bash
cd greenleaf-itinerary-pro
npm install
```

**b) Configure Environment**
Create `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL_HERE
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
RESEND_API_KEY=re_YOUR_KEY_HERE
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Replace all `YOUR_*_HERE` with actual values!

**c) Test**
```bash
npm run dev
```

Open http://localhost:3000 → Should see landing page! ✅

---

### 4️⃣ Create First Admin (5 min)

**a) Create User in Supabase**
```
1. Supabase → "Authentication" → "Users"
2. Click "Add user" → "Create new user"
3. Email: admin@greenleaf.com
4. Password: (your secure password)
5. Auto Confirm User: YES ✓
6. Click "Create user"
7. COPY THE USER ID (looks like: abc123-def-456...)
```

**b) Give Admin Role**
```
1. Supabase → "SQL Editor"
2. New Query
3. Paste this (replace USER_ID):
```

```sql
INSERT INTO user_roles (id, role, name, email)
VALUES ('PASTE_USER_ID_HERE', 'admin', 'Admin User', 'admin@greenleaf.com');
```

4. Click "Run"

---

### 5️⃣ Test Login (2 min)

```
1. Go to http://localhost:3000/login
2. Login with:
   - Email: admin@greenleaf.com
   - Password: (your password)
3. Should see Admin Dashboard! 🎉
```

---

### 6️⃣ Create Test Itinerary (3 min)

**a) Create Coordinator**
```
1. In Admin Dashboard → Click "Add User"
2. Fill in:
   - Name: Test Coordinator
   - Email: coord@greenleaf.com
   - Password: test123
   - Role: Coordinator
3. Click "Create User"
```

**b) Login as Coordinator**
```
1. Logout → Login as coord@greenleaf.com
2. Click "Create New Itinerary"
3. Fill basic info:
   - Title: Singapore Business Trip
   - Tag: Client Visits
   - Participants: John Doe
   - Purpose: Business Meeting
   - Dates: (next week)
4. Click "Create & Continue"
```

**c) Add Details**
```
1. Add flight:
   - Flight: SQ123
   - Date/times
   - From/To
2. Add visit:
   - Facility name
   - Address
3. Click "Save"
```

**d) Test Lookup**
```
1. Copy the itinerary code (e.g., IT-2025-ABC123)
2. Open incognito window
3. Go to http://localhost:3000
4. Enter code
5. Should see itinerary! ✅
```

---

## ✅ Success Checklist

- [ ] Supabase project created
- [ ] Database schema loaded
- [ ] Storage bucket created
- [ ] Environment variables configured
- [ ] App running on localhost:3000
- [ ] Admin user created
- [ ] Can login to admin panel
- [ ] Can create itinerary
- [ ] Can view itinerary via code

---

## 🌐 Deploy to Production (Bonus - 5 min)

**Quick Vercel Deploy:**

```bash
# Push to GitHub first
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/greenleaf-itinerary.git
git push -u origin main

# Then:
1. Go to https://vercel.com
2. Import your GitHub repo
3. Add ALL environment variables from .env.local
4. Update NEXT_PUBLIC_APP_URL to your vercel URL
5. Click "Deploy"
6. Wait 2 minutes → LIVE! 🚀
```

---

## 🆘 Quick Troubleshooting

**"Cannot connect to Supabase"**
→ Check .env.local has correct URL/keys

**"User not found after login"**
→ Make sure you ran the INSERT INTO user_roles query

**"Storage bucket error"**
→ Bucket must be named exactly `itinerary-docs`

**"npm install fails"**
→ Update Node.js to v18+

**"Page won't load"**
→ Run `npm run dev` again

---

## 🎉 You're Done!

**Next Steps:**
1. Customize branding (logo, colors)
2. Create real coordinator accounts
3. Test with actual travel data
4. Deploy to production
5. Share with your team!

---

## 📚 Full Documentation

- `README.md` → Complete feature overview
- `DEPLOYMENT.md` → Detailed deployment guide
- Supabase dashboard → Database/storage management
- Vercel dashboard → Hosting/domains

**Need help?** Check troubleshooting or review full README.

---

**Total time:** ~30 minutes ⏱️
**Status:** ✅ Production Ready!