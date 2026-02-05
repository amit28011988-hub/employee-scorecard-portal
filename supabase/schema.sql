-- Create a table for public profiles (employees)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text unique not null,
  pin_hash text not null, -- Store hashed PIN (simple hash for this use case)
  role text default 'employee' check (role in ('admin', 'employee')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Admins can update profiles." on profiles
  for update using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'admin' )
  );

-- Create Scorecards table
create table scorecards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  month_year date not null, -- First day of the month, e.g., '2023-10-01'
  
  -- Calculated Main Scores
  productivity_score numeric,
  quality_score numeric,
  total_score numeric,
  
  -- Raw Metrics (Flexible JSONB to match the changing excel columns)
  -- Expected keys: productivity_percent, quality_percent, unauthorized_absence_count, rca_count, etc.
  metrics jsonb default '{}'::jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(user_id, month_year)
);

-- RLS for Scorecards
alter table scorecards enable row level security;

-- Employees can view their own scorecards
create policy "Users can view own scorecards." on scorecards
  for select using (auth.uid() = user_id);

-- Admins can view all scorecards
create policy "Admins can view all scorecards." on scorecards
  for select using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'admin' )
  );

-- Admins can insert/update scorecards (Upload flow)
create policy "Admins can insert scorecards." on scorecards
  for insert with check (
    exists ( select 1 from profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Admins can update scorecards." on scorecards
  for update using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'admin' )
  );
