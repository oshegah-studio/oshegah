-- ============ ENUMS ============
CREATE TYPE public.account_type AS ENUM ('personal', 'business');
CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TYPE public.link_type AS ENUM (
  'whatsapp','phone','email','instagram','facebook','tiktok','youtube','linkedin',
  'twitter','snapchat','telegram','website','maps','reviews','instapay','vodafone_cash','custom'
);
CREATE TYPE public.profile_theme AS ENUM ('oshegah_dark','oshegah_light','midnight','minimal','glass');

-- ============ TIMESTAMP TRIGGER FN ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE,
  account_type public.account_type NOT NULL DEFAULT 'personal',
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth_user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth_user_id = auth.uid() OR public.is_admin())
  WITH CHECK (auth_user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, account_type, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'account_type',''), 'personal')::public.account_type,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ BUSINESSES ============
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#162446',
  theme public.profile_theme NOT NULL DEFAULT 'oshegah_dark',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT ON public.businesses TO anon;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE INDEX businesses_owner_idx ON public.businesses(owner_id);

CREATE OR REPLACE FUNCTION public.owns_business(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.profiles p ON p.id = b.owner_id
    WHERE b.id = _business_id AND p.auth_user_id = auth.uid()
  );
$$;

CREATE POLICY "Anyone can view active businesses branding" ON public.businesses
  FOR SELECT USING (active = true);
CREATE POLICY "Owners view own business" ON public.businesses
  FOR SELECT TO authenticated USING (public.owns_business(id) OR public.is_admin());
CREATE POLICY "Owners create business" ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = owner_id AND p.auth_user_id = auth.uid()));
CREATE POLICY "Owners update own business" ON public.businesses
  FOR UPDATE TO authenticated USING (public.owns_business(id) OR public.is_admin())
  WITH CHECK (public.owns_business(id) OR public.is_admin());
CREATE POLICY "Owners delete own business" ON public.businesses
  FOR DELETE TO authenticated USING (public.owns_business(id) OR public.is_admin());

CREATE TRIGGER businesses_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CUSTOMERS (card profiles) ============
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  username text NOT NULL UNIQUE,
  full_name text NOT NULL,
  job_title text,
  bio text,
  avatar_url text,
  phone text,
  email text,
  location text,
  website text,
  verified boolean NOT NULL DEFAULT false,
  theme public.profile_theme NOT NULL DEFAULT 'oshegah_dark',
  primary_color text NOT NULL DEFAULT '#162446',
  text_color text NOT NULL DEFAULT '#FFFFFF',
  button_style text NOT NULL DEFAULT 'rounded',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT ON public.customers TO anon;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX customers_username_lower_idx ON public.customers (lower(username));
CREATE INDEX customers_user_idx ON public.customers(user_id);
CREATE INDEX customers_business_idx ON public.customers(business_id);

CREATE OR REPLACE FUNCTION public.owns_customer(_customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customers c
    LEFT JOIN public.profiles p ON p.id = c.user_id
    LEFT JOIN public.businesses b ON b.id = c.business_id
    LEFT JOIN public.profiles bp ON bp.id = b.owner_id
    WHERE c.id = _customer_id
      AND (p.auth_user_id = auth.uid() OR bp.auth_user_id = auth.uid())
  );
$$;

CREATE POLICY "Anyone can view active profiles" ON public.customers
  FOR SELECT USING (active = true);
CREATE POLICY "Owners view own profiles" ON public.customers
  FOR SELECT TO authenticated USING (public.owns_customer(id) OR public.is_admin());
CREATE POLICY "Owners create profiles" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.auth_user_id = auth.uid())
    OR (business_id IS NOT NULL AND public.owns_business(business_id))
  );
CREATE POLICY "Owners update own profiles" ON public.customers
  FOR UPDATE TO authenticated USING (public.owns_customer(id) OR public.is_admin())
  WITH CHECK (public.owns_customer(id) OR public.is_admin());
CREATE POLICY "Owners delete own profiles" ON public.customers
  FOR DELETE TO authenticated USING (public.owns_customer(id) OR public.is_admin());

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BUSINESS MEMBERS ============
CREATE TABLE public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, customer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members TO authenticated;
GRANT ALL ON public.business_members TO service_role;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX business_members_business_idx ON public.business_members(business_id);

CREATE POLICY "Owners view members" ON public.business_members
  FOR SELECT TO authenticated USING (public.owns_business(business_id) OR public.is_admin());
CREATE POLICY "Owners add members" ON public.business_members
  FOR INSERT TO authenticated WITH CHECK (public.owns_business(business_id) OR public.is_admin());
CREATE POLICY "Owners update members" ON public.business_members
  FOR UPDATE TO authenticated USING (public.owns_business(business_id) OR public.is_admin())
  WITH CHECK (public.owns_business(business_id) OR public.is_admin());
CREATE POLICY "Owners remove members" ON public.business_members
  FOR DELETE TO authenticated USING (public.owns_business(business_id) OR public.is_admin());

-- ============ LINKS ============
CREATE TABLE public.links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type public.link_type NOT NULL,
  title text NOT NULL,
  value text NOT NULL,
  icon text,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.links TO authenticated;
GRANT SELECT ON public.links TO anon;
GRANT ALL ON public.links TO service_role;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
CREATE INDEX links_customer_idx ON public.links(customer_id, sort_order);

CREATE POLICY "Anyone can view enabled links of active profiles" ON public.links
  FOR SELECT USING (
    enabled = true
    AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.active = true)
  );
CREATE POLICY "Owners view own links" ON public.links
  FOR SELECT TO authenticated USING (public.owns_customer(customer_id) OR public.is_admin());
CREATE POLICY "Owners create links" ON public.links
  FOR INSERT TO authenticated WITH CHECK (public.owns_customer(customer_id) OR public.is_admin());
CREATE POLICY "Owners update links" ON public.links
  FOR UPDATE TO authenticated USING (public.owns_customer(customer_id) OR public.is_admin())
  WITH CHECK (public.owns_customer(customer_id) OR public.is_admin());
CREATE POLICY "Owners delete links" ON public.links
  FOR DELETE TO authenticated USING (public.owns_customer(customer_id) OR public.is_admin());

CREATE TRIGGER links_updated_at BEFORE UPDATE ON public.links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ANALYTICS ============
CREATE TABLE public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT, SELECT ON public.profile_views TO authenticated;
GRANT INSERT ON public.profile_views TO anon;
GRANT ALL ON public.profile_views TO service_role;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
CREATE INDEX profile_views_customer_idx ON public.profile_views(customer_id, created_at DESC);

CREATE POLICY "Anyone can record a view" ON public.profile_views
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.active = true)
  );
CREATE POLICY "Owners read own views" ON public.profile_views
  FOR SELECT TO authenticated USING (public.owns_customer(customer_id) OR public.is_admin());

CREATE TABLE public.link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  link_id uuid REFERENCES public.links(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT, SELECT ON public.link_clicks TO authenticated;
GRANT INSERT ON public.link_clicks TO anon;
GRANT ALL ON public.link_clicks TO service_role;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;
CREATE INDEX link_clicks_customer_idx ON public.link_clicks(customer_id, created_at DESC);
CREATE INDEX link_clicks_link_idx ON public.link_clicks(link_id);

CREATE POLICY "Anyone can record a click" ON public.link_clicks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.active = true)
  );
CREATE POLICY "Owners read own clicks" ON public.link_clicks
  FOR SELECT TO authenticated USING (public.owns_customer(customer_id) OR public.is_admin());

-- ============ DEMO DATA ============
INSERT INTO public.customers (username, full_name, job_title, bio, phone, email, location, website, verified, theme, primary_color, text_color)
VALUES ('yahiahani', 'Yahia Hani', 'Digital Creator', 'Digital Creator & Business Owner', '+201000000000', 'hello@oshegah.com', 'Cairo, Egypt', 'https://oshegah.com', true, 'oshegah_dark', '#162446', '#FFFFFF');

INSERT INTO public.links (customer_id, type, title, value, sort_order)
SELECT c.id, t.type::public.link_type, t.title, t.value, t.ord
FROM public.customers c,
(VALUES
  ('whatsapp','WhatsApp','+201000000000',1),
  ('instagram','Instagram','https://instagram.com/oshegah',2),
  ('tiktok','TikTok','https://tiktok.com/@oshegah',3),
  ('facebook','Facebook','https://facebook.com/oshegah',4),
  ('website','Website','https://oshegah.com',5)
) AS t(type,title,value,ord)
WHERE c.username = 'yahiahani';