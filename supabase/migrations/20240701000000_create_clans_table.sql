create table if not exists public.clans (
  id uuid not null primary key default uuid_generate_v4(),
  name text not null,
  faction text not null check (faction in ('gangsters', 'guardas')),
  score integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);