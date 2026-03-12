-- Create user_profiles table with all necessary fields
create table if not exists public.user_profiles (
  id uuid not null primary key default uuid_generate_v4(),
  user_id uuid not null unique,
  username text not null unique,
  clan_id uuid references public.clans(id),
  faction text not null check (faction in ('gangsters', 'guardas')),
  level integer not null default 1,
  xp integer not null default 0,
  money integer not null default 100,
  energy integer not null default 100,
  max_energy integer not null default 100,
  action_points integer not null default 10,
  attack integer not null default 10,
  defense integer not null default 10,
  focus integer not null default 10,
  intimidation integer not null default 10,
  discipline integer not null default 10,
  victories integer not null default 0,
  defeats integer not null default 0,
  victory_streak integer not null default 0,
  avatar_url text,
  bio text,
  last_action_points_reset timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Create RLS policies for user_profiles table
alter table public.user_profiles enable row level security;

-- Policy to allow users to read their own data
create policy "Users can read their own data"
  on public.user_profiles
  for select
  using (auth.uid() = user_id);

-- Policy to allow users to update their own data
create policy "Users can update their own data"
  on public.user_profiles
  for update
  using (auth.uid() = user_id);

-- Migrate data from users to user_profiles if users table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    -- Insert data from users to user_profiles for users that don't already exist in the user_profiles table
    INSERT INTO public.user_profiles (
      user_id,
      username,
      clan_id,
      faction,
      level,
      xp,
      money,
      energy,
      max_energy,
      action_points,
      attack,
      defense,
      focus,
      intimidation,
      discipline,
      victories,
      defeats,
      victory_streak,
      avatar_url,
      bio,
      last_action_points_reset,
      created_at,
      updated_at
    )
    SELECT 
      u.auth_id as user_id,
      u.username,
      u.clan_id,
      u.faction,
      u.level,
      u.xp,
      u.resources as money,
      u.energy,
      u.max_energy,
      u.action_points,
      u.attack,
      u.defense,
      u.focus,
      u.intimidation,
      u.discipline,
      u.victories,
      u.defeats,
      u.victory_streak,
      u.avatar_url,
      u.bio,
      u.last_action_points_reset,
      u.created_at,
      u.updated_at
    FROM public.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_profiles up WHERE up.user_id = u.auth_id
    );
    
    -- Drop the users table
    DROP TABLE IF EXISTS public.users CASCADE;
    
    -- Drop the trigger and function for users table
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP FUNCTION IF EXISTS public.handle_new_user();
  END IF;
END;
$$;

-- Create a function to handle new user creation
create or replace function public.handle_new_user_profile()
returns trigger as $$
begin
  insert into public.user_profiles (user_id, username, faction, level, xp, money)
  values (new.id, 
         coalesce(new.raw_user_meta_data->>'username', 'Jogador'), 
         coalesce(new.raw_user_meta_data->>'faction', 'guardas'),
         1,
         0,
         100);
  return new;
end;
$$ language plpgsql security definer;

-- Create a trigger to automatically create a user profile when a new user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();