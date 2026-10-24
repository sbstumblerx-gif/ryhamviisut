CREATE OR REPLACE FUNCTION public.agent_schema_catalog()
RETURNS TABLE(table_name text, columns jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.table_name::text,
         jsonb_agg(jsonb_build_object('name', c.column_name, 'type', c.data_type) ORDER BY c.ordinal_position)
  FROM information_schema.columns c
  JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  GROUP BY c.table_name
  ORDER BY c.table_name
$$;
REVOKE ALL ON FUNCTION public.agent_schema_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agent_schema_catalog() TO authenticated, service_role;