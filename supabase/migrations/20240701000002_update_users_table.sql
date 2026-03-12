-- Add additional fields to users table to match user_profiles structure
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists energy integer not null default 100;
alter table public.users add column if not exists max_energy integer not null default 100;
alter table public.users add column if not exists action_points integer not null default 10;
alter table public.users add column if not exists attack integer not null default 10;
alter table public.users add column if not exists defense integer not null default 10;
alter table public.users add column if not exists focus integer not null default 10;
alter table public.users add column if not exists intimidation integer not null default 10;
alter table public.users add column if not exists discipline integer not null default 10;
alter table public.users add column if not exists victories integer not null default 0;
alter table public.users add column if not exists defeats integer not null default 0;
alter table public.users add column if not exists victory_streak integer not null default 0;
alter table public.users add column if not exists last_action_points_reset timestamp with time zone not null default now();

-- Rename experience to xp to match the frontend code
alter table public.users rename column experience to xp;

-- Create a function to handle user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (auth_id, username, faction, level, xp, resources)
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
  for each row execute procedure public.handle_new_user();