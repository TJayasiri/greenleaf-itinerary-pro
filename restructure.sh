# Move app files
mv layout.tsx app/
mv globals.css app/
mv page.tsx app/  # Landing page

# Move login
mkdir -p app/login
mv login-page.tsx app/login/page.tsx

# Move dashboard
mkdir -p app/dashboard/edit/[id]
mv dashboard-page.tsx app/dashboard/page.tsx
mv edit-itinerary.tsx app/dashboard/edit/[id]/page.tsx

# Move admin
mkdir -p app/admin
mv admin-page.tsx app/admin/page.tsx

# Move API
mkdir -p app/api/send-itinerary
mv email-api.ts app/api/send-itinerary/route.ts

# Move lib
mkdir -p lib
mv supabase-client.ts lib/supabase.ts

# Move supabase
mkdir -p supabase
mv schema.sql supabase/schema.sql
