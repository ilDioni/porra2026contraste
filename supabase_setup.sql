-- ============================================================================
--  PORRA MUNDIAL 2026 · Configuración de la base de datos en Supabase
--  Pega TODO este contenido en:  Supabase → tu proyecto → SQL Editor → New query
--  y pulsa "Run". Solo hay que hacerlo UNA vez.
-- ============================================================================

-- 1) Tabla clave-valor donde se guarda todo lo compartido:
--    - "porra26:profiles"     -> lista de perfiles (nombre, avatar, color, hash de contraseña)
--    - "porra26:results"      -> resultados oficiales que mete el organizador
--    - "porra26:config"       -> ajustes (cierre manual, etc.)
--    - "porra26:picks:<id>"   -> los pronósticos de cada participante
create table if not exists public.kv (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2) Activamos Row Level Security (obligatorio en Supabase).
alter table public.kv enable row level security;

-- 3) Políticas de acceso.
--    Esta es una porra entre amigos sin login de Supabase, así que permitimos
--    que cualquiera con la web pueda leer y escribir en la tabla kv.
--    (Las contraseñas de los perfiles van cifradas con SHA-256 desde la app,
--     no se guardan en texto plano.)

-- Borra políticas previas si reejecutas el script (evita errores de duplicado).
drop policy if exists "kv_select_all" on public.kv;
drop policy if exists "kv_insert_all" on public.kv;
drop policy if exists "kv_update_all" on public.kv;
drop policy if exists "kv_delete_all" on public.kv;

-- Lectura para todos (rol anónimo del navegador).
create policy "kv_select_all" on public.kv
  for select to anon using (true);

-- Inserción para todos.
create policy "kv_insert_all" on public.kv
  for insert to anon with check (true);

-- Actualización para todos.
create policy "kv_update_all" on public.kv
  for update to anon using (true) with check (true);

-- Borrado para todos (el organizador borra perfiles).
create policy "kv_delete_all" on public.kv
  for delete to anon using (true);

-- 4) (Opcional) Mantener actualizado updated_at en cada cambio.
create or replace function public.kv_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists kv_touch_trg on public.kv;
create trigger kv_touch_trg
  before update on public.kv
  for each row execute function public.kv_touch();

-- ¡Listo! La app ya puede leer y escribir en esta tabla.
