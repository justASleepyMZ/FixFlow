-- Create admin user in auth.users
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@gmail.com';
  
  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'admin@gmail.com',
      crypt('zhangir12345', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Admin"}'::jsonb,
      false, '', '', '', ''
    );
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    VALUES (gen_random_uuid(), admin_id, format('{"sub":"%s","email":"%s"}', admin_id, 'admin@gmail.com')::jsonb, 'email', admin_id::text, now(), now(), now());
  END IF;
  
  -- Ensure profile exists
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (admin_id, 'Admin')
  ON CONFLICT DO NOTHING;
  
  -- Ensure admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- Admin RLS policies for service_requests
CREATE POLICY "Admins can update any request"
ON public.service_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any request"
ON public.service_requests FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin RLS policies for profiles
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin RLS policies for user_roles (manage roles)
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));