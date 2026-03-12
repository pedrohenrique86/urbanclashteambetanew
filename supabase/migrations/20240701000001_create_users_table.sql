-- Create users table with clan association
create table if not exists public.users (
  id uuid not null primary key default uuid_generate_v4(),
  auth_id uuid not null unique,
  username text not null unique,
  clan_id uuid references public.clans(id),
  faction text not null check (faction in ('gangsters', 'guardas')),
  level integer not null default 1,
  experience integer not null default 0,
  resources integer not null default 100,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Create RLS policies for users table
alter table public.users enable row level security;

-- Policy to allow users to read their own data
create policy "Users can read their own data"
  on public.users
  for select
  using (auth.uid() = auth_id);

-- Policy to allow users to update their own data
create policy "Users can update their own data"
  on public.users
  for update
  using (auth.uid() = auth_id);