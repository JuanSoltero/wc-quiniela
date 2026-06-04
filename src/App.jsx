-- ============================================================
-- WC QUINIELA - Script de creación de tablas en Supabase
-- Copia TODO esto y pégalo en Supabase > SQL Editor > New query
-- ============================================================

-- 1. PERFILES DE USUARIO
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  avatar text default '⚽',
  is_admin boolean default false,
  created_at timestamp with time zone default now()
);

-- 2. GRUPOS
create table if not exists groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  admin_id uuid references profiles(id) on delete cascade,
  invite_code text unique default substring(md5(random()::text), 1, 8),
  max_members int default 30,
  created_at timestamp with time zone default now()
);

-- 3. MIEMBROS DE GRUPOS
create table if not exists group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  unique(group_id, user_id)
);

-- 4. PARTIDOS
create table if not exists matches (
  id serial primary key,
  match_group text,
  phase text not null,
  home text not null,
  away text not null,
  match_date date not null,
  match_time time not null,
  home_score int,
  away_score int,
  started boolean default false,
  created_at timestamp with time zone default now()
);

-- 5. PREDICCIONES
create table if not exists predictions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  match_id int references matches(id) on delete cascade,
  winner text,
  over_under text check (over_under in ('over', 'under')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, match_id)
);

-- ============================================================
-- SEGURIDAD (Row Level Security)
-- ============================================================

alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;

-- Profiles: cada quien ve todos los perfiles, solo edita el suyo
create policy "Perfiles visibles para todos" on profiles for select using (true);
create policy "Usuario edita su perfil" on profiles for update using (auth.uid() = id);
create policy "Usuario crea su perfil" on profiles for insert with check (auth.uid() = id);

-- Groups: todos pueden ver y crear grupos
create policy "Grupos visibles para todos" on groups for select using (true);
create policy "Usuario crea grupos" on groups for insert with check (auth.uid() = admin_id);
create policy "Admin edita su grupo" on groups for update using (auth.uid() = admin_id);

-- Group members: todos pueden ver, unirse, y el admin puede eliminar
create policy "Miembros visibles" on group_members for select using (true);
create policy "Usuario se une a grupo" on group_members for insert with check (auth.uid() = user_id);
create policy "Usuario sale del grupo" on group_members for delete using (auth.uid() = user_id);

-- Matches: todos pueden ver, solo admin puede editar (lo manejamos en el código)
create policy "Partidos visibles para todos" on matches for select using (true);
create policy "Admin inserta partidos" on matches for insert with check (true);
create policy "Admin actualiza partidos" on matches for update using (true);

-- Predictions: cada quien ve y edita las suyas
create policy "Predicciones visibles para todos" on predictions for select using (true);
create policy "Usuario crea prediccion" on predictions for insert with check (auth.uid() = user_id);
create policy "Usuario edita su prediccion" on predictions for update using (auth.uid() = user_id);

-- ============================================================
-- FUNCIÓN: crear perfil automáticamente al registrarse
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar', '⚽')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que dispara la función al crear usuario
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- INSERTAR PARTIDOS DEL MUNDIAL 2026
-- ============================================================

insert into matches (match_group, phase, home, away, match_date, match_time) values
-- GRUPO A
('A','Fase de Grupos','México','Canadá','2026-06-11','18:00'),
('A','Fase de Grupos','Uruguay','Senegal','2026-06-11','21:00'),
('A','Fase de Grupos','México','Senegal','2026-06-15','15:00'),
('A','Fase de Grupos','Canadá','Uruguay','2026-06-15','18:00'),
('A','Fase de Grupos','México','Uruguay','2026-06-19','18:00'),
('A','Fase de Grupos','Canadá','Senegal','2026-06-19','18:00'),
-- GRUPO B
('B','Fase de Grupos','España','Marruecos','2026-06-11','12:00'),
('B','Fase de Grupos','Croacia','Bélgica','2026-06-11','15:00'),
('B','Fase de Grupos','España','Croacia','2026-06-15','12:00'),
('B','Fase de Grupos','Marruecos','Bélgica','2026-06-15','21:00'),
('B','Fase de Grupos','España','Bélgica','2026-06-19','21:00'),
('B','Fase de Grupos','Marruecos','Croacia','2026-06-19','21:00'),
-- GRUPO C
('C','Fase de Grupos','Brasil','Japón','2026-06-12','12:00'),
('C','Fase de Grupos','Suiza','Camerún','2026-06-12','15:00'),
('C','Fase de Grupos','Brasil','Suiza','2026-06-16','15:00'),
('C','Fase de Grupos','Japón','Camerún','2026-06-16','18:00'),
('C','Fase de Grupos','Brasil','Camerún','2026-06-20','18:00'),
('C','Fase de Grupos','Japón','Suiza','2026-06-20','18:00'),
-- GRUPO D
('D','Fase de Grupos','Argentina','Polonia','2026-06-12','18:00'),
('D','Fase de Grupos','Arabia Saudita','Australia','2026-06-12','21:00'),
('D','Fase de Grupos','Argentina','Arabia Saudita','2026-06-16','12:00'),
('D','Fase de Grupos','Polonia','Australia','2026-06-16','21:00'),
('D','Fase de Grupos','Argentina','Australia','2026-06-20','21:00'),
('D','Fase de Grupos','Polonia','Arabia Saudita','2026-06-20','21:00'),
-- GRUPO E
('E','Fase de Grupos','Francia','Ecuador','2026-06-13','12:00'),
('E','Fase de Grupos','Países Bajos','Qatar','2026-06-13','15:00'),
('E','Fase de Grupos','Francia','Países Bajos','2026-06-17','15:00'),
('E','Fase de Grupos','Ecuador','Qatar','2026-06-17','18:00'),
('E','Fase de Grupos','Francia','Qatar','2026-06-21','18:00'),
('E','Fase de Grupos','Ecuador','Países Bajos','2026-06-21','18:00'),
-- GRUPO F
('F','Fase de Grupos','Inglaterra','Irán','2026-06-13','18:00'),
('F','Fase de Grupos','Estados Unidos','Gales','2026-06-13','21:00'),
('F','Fase de Grupos','Inglaterra','Estados Unidos','2026-06-17','12:00'),
('F','Fase de Grupos','Irán','Gales','2026-06-17','21:00'),
('F','Fase de Grupos','Inglaterra','Gales','2026-06-21','21:00'),
('F','Fase de Grupos','Irán','Estados Unidos','2026-06-21','21:00'),
-- GRUPO G
('G','Fase de Grupos','Portugal','Ghana','2026-06-14','12:00'),
('G','Fase de Grupos','Uruguay','Corea del Sur','2026-06-14','15:00'),
('G','Fase de Grupos','Portugal','Uruguay','2026-06-18','15:00'),
('G','Fase de Grupos','Ghana','Corea del Sur','2026-06-18','18:00'),
('G','Fase de Grupos','Portugal','Corea del Sur','2026-06-22','18:00'),
('G','Fase de Grupos','Ghana','Uruguay','2026-06-22','18:00'),
-- GRUPO H
('H','Fase de Grupos','Alemania','Japón','2026-06-14','18:00'),
('H','Fase de Grupos','España','Costa Rica','2026-06-14','21:00'),
('H','Fase de Grupos','Alemania','España','2026-06-18','12:00'),
('H','Fase de Grupos','Japón','Costa Rica','2026-06-18','21:00'),
('H','Fase de Grupos','Alemania','Costa Rica','2026-06-22','21:00'),
('H','Fase de Grupos','Japón','España','2026-06-22','21:00'),
-- ELIMINATORIAS (equipos por definir)
(null,'Octavos de Final','Por definir 1A','Por definir 2B','2026-06-29','18:00'),
(null,'Octavos de Final','Por definir 1B','Por definir 2A','2026-06-29','21:00'),
(null,'Octavos de Final','Por definir 1C','Por definir 2D','2026-06-30','18:00'),
(null,'Octavos de Final','Por definir 1D','Por definir 2C','2026-06-30','21:00'),
(null,'Octavos de Final','Por definir 1E','Por definir 2F','2026-07-01','18:00'),
(null,'Octavos de Final','Por definir 1F','Por definir 2E','2026-07-01','21:00'),
(null,'Octavos de Final','Por definir 1G','Por definir 2H','2026-07-02','18:00'),
(null,'Octavos de Final','Por definir 1H','Por definir 2G','2026-07-02','21:00'),
(null,'Cuartos de Final','Por definir QF1','Por definir QF2','2026-07-04','18:00'),
(null,'Cuartos de Final','Por definir QF3','Por definir QF4','2026-07-04','21:00'),
(null,'Cuartos de Final','Por definir QF5','Por definir QF6','2026-07-05','18:00'),
(null,'Cuartos de Final','Por definir QF7','Por definir QF8','2026-07-05','21:00'),
(null,'Semifinal','Por definir SF1','Por definir SF2','2026-07-08','21:00'),
(null,'Semifinal','Por definir SF3','Por definir SF4','2026-07-09','21:00'),
(null,'Tercer Lugar','Por definir 3L1','Por definir 3L2','2026-07-11','18:00'),
(null,'Final','Por definir F1','Por definir F2','2026-07-12','18:00');
