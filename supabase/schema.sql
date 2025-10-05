-- Greenleaf Itinerary Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles table (extends Supabase auth.users)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coordinator')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Itineraries table
CREATE TABLE itineraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Header
  doc_title TEXT,
  trip_tag TEXT,
  brand_name TEXT DEFAULT 'Greenleaf Assurance',
  logo_url TEXT,
  
  -- Traveler info
  participants TEXT,
  phones TEXT,
  purpose TEXT,
  factory TEXT,
  start_date DATE,
  end_date DATE,
  
  -- Complex data as JSONB
  flights JSONB DEFAULT '[]',
  visits JSONB DEFAULT '[]',
  notes JSONB DEFAULT '{}',
  signatures JSONB DEFAULT '{}',
  watermark JSONB DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'completed', 'cancelled')),
  
  -- Email tracking
  sent_to TEXT,
  sent_at TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('hotel', 'taxi', 'flight', 'visa', 'other')),
  file_size BIGINT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_itineraries_code ON itineraries(code);
CREATE INDEX idx_itineraries_created_by ON itineraries(created_by);
CREATE INDEX idx_itineraries_status ON itineraries(status);
CREATE INDEX idx_documents_itinerary ON documents(itinerary_id);

-- Row Level Security (RLS)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can see everything
CREATE POLICY "Admins full access to user_roles" ON user_roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role = 'admin')
  );

-- Coordinators can see their own itineraries
CREATE POLICY "Coordinators see own itineraries" ON itineraries
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Coordinators create itineraries" ON itineraries
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Coordinators update own itineraries" ON itineraries
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role = 'admin')
  );

-- Public can view itineraries by code (for lookup)
CREATE POLICY "Public lookup by code" ON itineraries
  FOR SELECT USING (code IS NOT NULL);

-- Document policies
CREATE POLICY "Users see own documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM itineraries 
      WHERE id = documents.itinerary_id 
      AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "Users upload documents" ON documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries 
      WHERE id = itinerary_id 
      AND created_by = auth.uid()
    )
  );

-- Storage bucket setup (run after creating bucket 'itinerary-docs' in Supabase Storage)
-- Bucket policies will be:
-- INSERT: authenticated users only
-- SELECT: authenticated users for their own files + public for lookup codes
-- UPDATE/DELETE: file owner only

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER itineraries_updated_at
  BEFORE UPDATE ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();