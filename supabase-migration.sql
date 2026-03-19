-- Wedda Supabase Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Users table
CREATE TABLE IF NOT EXISTS wedda_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  phone TEXT,
  region TEXT,
  guest_count TEXT,
  budget INTEGER,
  wedding_date TEXT,
  visitor_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS wedda_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES wedda_users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total_estimate INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS wedda_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES wedda_orders(id),
  vendor_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  product_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  quoted_price INTEGER,
  vendor_message TEXT,
  delivery_date TEXT,
  customer_notes TEXT
);

-- Messages table
CREATE TABLE IF NOT EXISTS wedda_messages (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES wedda_orders(id),
  order_item_id INTEGER,
  sender_type TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_wedda_users_email ON wedda_users(email);
CREATE INDEX IF NOT EXISTS idx_wedda_users_visitor ON wedda_users(visitor_id);
CREATE INDEX IF NOT EXISTS idx_wedda_orders_user ON wedda_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_wedda_order_items_order ON wedda_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_wedda_messages_order ON wedda_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_wedda_messages_read ON wedda_messages(read);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE wedda_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedda_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedda_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedda_messages ENABLE ROW LEVEL SECURITY;

-- Allow the service role to do everything (needed for the API)
CREATE POLICY IF NOT EXISTS "Service role full access" ON wedda_users FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON wedda_orders FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON wedda_order_items FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON wedda_messages FOR ALL USING (true);
