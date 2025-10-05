# 🌿 Greenleaf Itinerary Pro

**Professional travel itinerary management system** for internal business travel planning.

Built with Next.js 14, Supabase, and Tailwind CSS. **Production-ready in 2-4 hours!**

---

## ✨ Features

### 🔐 **Role-Based Access**
- **Admin**: Manage users, view all itineraries, full system access
- **Coordinator**: Create and manage travel itineraries
- **Public Lookup**: Anyone with a code can view their itinerary

### ✈️ **Comprehensive Itinerary Builder**
- Flight schedules with departure/arrival times
- Site visit planning with addresses and transport
- Participant and contact management
- Multi-day trip planning
- Auto-generated unique codes (IT-2025-ABC123)

### 📎 **Document Management**
- Upload PDFs: hotel bookings, taxi confirmations, flight tickets
- Organized by itinerary
- Secure cloud storage via Supabase

### 📧 **Email Integration**
- Send itinerary summaries via email
- Beautiful HTML email templates
- Includes direct lookup link
- Powered by Resend API

### 🎨 **Professional UI**
- Clean, modern interface
- Mobile-responsive design
- Print-ready itinerary views
- Real-time auto-save
- Intuitive drag-and-drop workflows

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Git installed
- GitHub account
- 30-60 minutes for setup

### 1. Clone/Create Project
```bash
mkdir greenleaf-itinerary-pro
cd greenleaf-itinerary-pro

# Copy all project files here
# (package.json, app/, lib/, supabase/, etc.)

npm install
```

### 2. Setup Supabase
1. Create account at https://supabase.com
2. Create new project: `greenleaf-itinerary`
3. Run `supabase/schema.sql` in SQL Editor
4. Create storage bucket: `itinerary-docs`
5. Copy API keys from Settings → API

### 3. Setup Resend (Email)
1. Create account at https://resend.com
2. Get API key from dashboard
3. Free tier: 100 emails/day

### 4. Configure Environment
Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=re_xxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000 🎉

### 6. Create First Admin
See `DEPLOYMENT.md` for detailed instructions on creating your first admin user.

---

## 📁 Project Structure

```
greenleaf-itinerary-pro/
├── app/
│   ├── page.tsx                    # Public lookup page
│   ├── login/page.tsx              # Authentication
│   ├── dashboard/
│   │   ├── page.tsx                # Coordinator dashboard
│   │   └── edit/[id]/page.tsx      # Itinerary editor
│   ├── admin/page.tsx              # Admin panel
│   ├── api/
│   │   └── send-itinerary/route.ts # Email sending
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Global styles
├── lib/
│   └── supabase.ts                 # Supabase client & types
├── supabase/
│   └── schema.sql                  # Database schema
├── .env.local                      # Environment variables (create this)
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── next.config.js
├── postcss.config.js
├── README.md                       # This file
└── DEPLOYMENT.md                   # Deployment guide
```

---

## 🎯 User Flows

### **Admin Workflow**
1. Login → Admin Dashboard
2. View statistics (users, itineraries)
3. Manage coordinator accounts
4. View all itineraries across system
5. Monitor activity

### **Coordinator Workflow**
1. Login → Dashboard
2. Create New Itinerary
3. Fill in travelers, dates, purpose
4. Add flights and site visits
5. Upload documents (PDFs)
6. Send email to travelers
7. Track status (draft/sent/completed)

### **Traveler Workflow**
1. Receive email with itinerary code
2. Go to website
3. Enter code: IT-2025-ABC123
4. View complete itinerary
5. Download attached documents
6. No login required!

---

## 🗄️ Database Schema

### **user_roles**
- Extends Supabase auth.users
- Stores role (admin/coordinator)
- Links to auth system

### **itineraries**
- Main itinerary data
- JSONB fields for flights/visits
- Auto-generated unique codes
- Status tracking

### **documents**
- File metadata
- Links to Supabase Storage
- Categorized by type

**Security:** Row Level Security (RLS) enabled on all tables

---

## 🔒 Security Features

- ✅ Row Level Security (RLS)
- ✅ Server-side auth validation
- ✅ Secure file uploads
- ✅ API route protection
- ✅ Environment variable encryption
- ✅ No sensitive data in client code
- ✅ HTTPS-only in production

---

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (React 18, TypeScript) |
| **Styling** | Tailwind CSS |
| **Backend** | Next.js API Routes |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Storage** | Supabase Storage |
| **Email** | Resend API |
| **Hosting** | Vercel |
| **Icons** | Lucide React |

---

## 🌐 Deployment

### **Recommended: Vercel + Supabase**

**Why?**
- ✅ Free tier for both
- ✅ Auto-deployments from Git
- ✅ Zero config needed
- ✅ Global CDN
- ✅ Automatic HTTPS

**Steps:**
1. Push code to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy in 2 minutes!

See `DEPLOYMENT.md` for complete guide.

### **Alternative Hosting Options**
- Netlify
- Railway
- Render
- Self-hosted (Docker)

---

## 💰 Costs (Free Tier)

| Service | Free Tier | Paid Upgrade |
|---------|-----------|--------------|
| **Vercel** | Unlimited hobby projects | $20/month Pro |
| **Supabase** | 500MB DB, 1GB storage | $25/month |
| **Resend** | 100 emails/day | $20/month for 50k |

**For 1000 itineraries/year:** Likely stays free! 🎉

---

## 🔧 Configuration

### **Branding**
- Logo: Update `logo_url` in database
- Colors: Edit `tailwind.config.js`
- Email template: Modify `app/api/send-itinerary/route.ts`

### **Features Toggle**
- Email sending: Set `RESEND_API_KEY`
- Document uploads: Configure storage bucket
- Public lookup: Always enabled

### **Limits**
- File uploads: 50MB per file (Supabase default)
- Itinerary code length: 6 characters
- Email rate: 100/day (Resend free)

---

## 📝 Customization Examples

### **Add Custom Fields**
```sql
ALTER TABLE itineraries ADD COLUMN custom_field TEXT;
```

### **Change Email Template**
Edit `app/api/send-itinerary/route.ts` → `generateEmailHtml()`

### **Add More User Roles**
Update schema: `CHECK (role IN ('admin', 'coordinator', 'viewer'))`

---

## 🐛 Troubleshooting

### Common Issues

**"Cannot read properties of null"**
→ User not in `user_roles` table. Run admin setup.

**"Storage bucket not found"**
→ Create `itinerary-docs` bucket in Supabase Storage.

**"Email not sending"**
→ Check `RESEND_API_KEY` in `.env.local`

**"Build failed on Vercel"**
→ Check environment variables are set in Vercel dashboard

### **Get Help**
- Check `DEPLOYMENT.md`
- Review Supabase docs
- Check Next.js documentation

---

## 🔄 Updates & Maintenance

### **Weekly**
- Check email delivery logs
- Monitor storage usage
- Review failed itineraries

### **Monthly**
- Backup database (Supabase automated)
- Review user accounts
- Check for Supabase/Vercel updates

### **Quarterly**
- Audit security settings
- Review RLS policies
- Update dependencies

---

## 📈 Scaling

**When you outgrow free tier:**

1. **Upgrade Supabase** ($25/mo) → 8GB database
2. **Upgrade Resend** ($20/mo) → 50k emails
3. **Upgrade Vercel** ($20/mo) → Team features

**Expected costs for 5000+ itineraries/year:** ~$65/month

---

## 🎓 Learning Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 📜 License

MIT License - Free to use and modify

---

## 🙏 Credits

Built for **Greenleaf Assurance** travel coordination.

Powered by:
- Next.js (Vercel)
- Supabase
- Resend
- Tailwind CSS
- Lucide Icons

---

## 📞 Support

Need help? Check:
1. `DEPLOYMENT.md` for setup guide
2. Supabase community forums
3. Next.js discussions
4. GitHub issues (if you forked this)

---

**Ready to deploy?** → See `DEPLOYMENT.md`

**Questions?** → Review the troubleshooting section

**Happy travels!** ✈️🌿