DO $$
DECLARE
  boss_user_id UUID;
  admin_user_id UUID;
  worker_user_id UUID;
  hq_site_id UUID;
  viana_site_id UUID;
  braga_site_id UUID;
  areosa_site_id UUID;
BEGIN
  SELECT id INTO boss_user_id FROM auth.users WHERE email = 'berto@bertivan.pt' LIMIT 1;
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'raquel@bertivan.pt' LIMIT 1;
  SELECT id INTO worker_user_id FROM auth.users WHERE email = 'miguel@bertivan.pt' LIMIT 1;

  IF boss_user_id IS NULL OR admin_user_id IS NULL OR worker_user_id IS NULL THEN
    RAISE EXCEPTION 'Cria primeiro os utilizadores berto@bertivan.pt, raquel@bertivan.pt e miguel@bertivan.pt em Authentication > Users.';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (boss_user_id, 'boss'),
    (admin_user_id, 'admin'),
    (worker_user_id, 'worker')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles
  SET
    full_name = 'Berto',
    pin = '1111',
    phone = '910000111',
    is_active = true
  WHERE user_id = boss_user_id;

  UPDATE public.profiles
  SET
    full_name = 'Raquel',
    pin = '2222',
    phone = '910000222',
    is_active = true
  WHERE user_id = admin_user_id;

  UPDATE public.profiles
  SET
    full_name = 'Miguel',
    pin = '3333',
    phone = '910000333',
    is_active = true
  WHERE user_id = worker_user_id;

  INSERT INTO public.work_sites (name, address, latitude, longitude, radius_meters, is_active, created_by)
  SELECT 'Sede Bertivan', 'Zona Industrial, Viana do Castelo', 41.6946, -8.8302, 120, true, admin_user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.work_sites WHERE name = 'Sede Bertivan'
  );

  INSERT INTO public.work_sites (name, address, latitude, longitude, radius_meters, is_active, created_by)
  SELECT 'Obra Viana Centro', 'Avenida dos Combatentes, Viana do Castelo', 41.6935, -8.8325, 150, true, admin_user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.work_sites WHERE name = 'Obra Viana Centro'
  );

  INSERT INTO public.work_sites (name, address, latitude, longitude, radius_meters, is_active, created_by)
  SELECT 'Obra Braga Norte', 'Rua do Caires, Braga', 41.5553, -8.4292, 150, true, admin_user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.work_sites WHERE name = 'Obra Braga Norte'
  );

  INSERT INTO public.work_sites (name, address, latitude, longitude, radius_meters, is_active, created_by)
  SELECT 'Obra Areosa', 'Areosa, Viana do Castelo', 41.7000, -8.8407, 250, true, admin_user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.work_sites WHERE name = 'Obra Areosa'
  );

  SELECT id INTO hq_site_id FROM public.work_sites WHERE name = 'Sede Bertivan' LIMIT 1;
  SELECT id INTO viana_site_id FROM public.work_sites WHERE name = 'Obra Viana Centro' LIMIT 1;
  SELECT id INTO braga_site_id FROM public.work_sites WHERE name = 'Obra Braga Norte' LIMIT 1;
  SELECT id INTO areosa_site_id FROM public.work_sites WHERE name = 'Obra Areosa' LIMIT 1;

  DELETE FROM public.work_schedules
  WHERE user_id IN (boss_user_id, admin_user_id, worker_user_id);

  INSERT INTO public.work_schedules (user_id, work_site_id, day_of_week, start_time, end_time)
  VALUES
    (boss_user_id, hq_site_id, 1, '08:30', '18:00'),
    (boss_user_id, hq_site_id, 2, '08:30', '18:00'),
    (boss_user_id, hq_site_id, 3, '08:30', '18:00'),
    (boss_user_id, hq_site_id, 4, '08:30', '18:00'),
    (boss_user_id, hq_site_id, 5, '08:30', '18:00'),
    (admin_user_id, hq_site_id, 1, '08:00', '17:30'),
    (admin_user_id, hq_site_id, 2, '08:00', '17:30'),
    (admin_user_id, hq_site_id, 3, '08:00', '17:30'),
    (admin_user_id, hq_site_id, 4, '08:00', '17:30'),
    (admin_user_id, hq_site_id, 5, '08:00', '17:30'),
    (worker_user_id, areosa_site_id, 1, '08:00', '17:00'),
    (worker_user_id, areosa_site_id, 2, '08:00', '17:00'),
    (worker_user_id, areosa_site_id, 3, '08:00', '17:00'),
    (worker_user_id, braga_site_id, 4, '08:00', '17:00'),
    (worker_user_id, braga_site_id, 5, '08:00', '16:00');
END $$;
