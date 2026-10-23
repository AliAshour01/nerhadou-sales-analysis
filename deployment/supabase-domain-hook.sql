-- Run only in the dedicated staging/production Supabase project.
-- Enable this function under Authentication > Hooks > Before User Created.
CREATE OR REPLACE FUNCTION public.nerhadou_before_user_created(event jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE address text := lower(trim(event->'user'->>'email'));
BEGIN
 IF address IS NULL OR address !~ '^[^[:space:]@]+@nerhadou\.com$' THEN
  RETURN jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Only company email accounts can register.'));
 END IF;
 RETURN '{}'::jsonb;
END;
$$;
REVOKE ALL ON FUNCTION public.nerhadou_before_user_created(jsonb) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.nerhadou_before_user_created(jsonb) TO supabase_auth_admin;

-- Defense in depth, already applied to the dedicated staging project:
-- Enforces the domain even before the Before User Created hook is enabled in the dashboard.
CREATE OR REPLACE FUNCTION public.nerhadou_auth_domain_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NEW.email IS NULL OR lower(trim(NEW.email)) !~ '^[^[:space:]@]+@nerhadou\.com$' THEN
  RAISE EXCEPTION 'Only company email accounts can register.' USING ERRCODE='23514';
 END IF;
 IF TG_OP='UPDATE' AND lower(NEW.email) IS DISTINCT FROM lower(OLD.email) THEN
  RAISE EXCEPTION 'Email changes require an administrator review.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.nerhadou_auth_domain_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nerhadou_auth_domain_guard() TO supabase_auth_admin;
CREATE TRIGGER nerhadou_auth_domain_guard BEFORE INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.nerhadou_auth_domain_guard();
