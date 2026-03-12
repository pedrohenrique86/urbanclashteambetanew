-- Migrate data from user_profiles to users
DO $$
BEGIN
  -- Check if user_profiles table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    -- Insert data from user_profiles to users for users that don't already exist in the users table
    INSERT INTO public.users (
      auth_id,
      username,
      faction,
      level,
      xp,
      resources,
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
      last_action_points_reset,
      created_at,
      updated_at
    )
    SELECT 
      up.user_id as auth_id,
      up.username,
      up.faction,
      up.level,
      up.xp,
      up.money as resources,
      up.energy,
      up.max_energy,
      up.action_points,
      up.attack,
      up.defense,
      up.focus,
      up.intimidation,
      up.discipline,
      up.victories,
      up.defeats,
      up.victory_streak,
      up.last_action_points_reset,
      up.created_at,
      up.updated_at
    FROM public.user_profiles up
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users u WHERE u.auth_id = up.user_id
    );
    
    -- Drop the user_profiles table
    DROP TABLE IF EXISTS public.user_profiles;
  END IF;
END;
$$;