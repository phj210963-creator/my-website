create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'staff', 'member');
create type public.record_status as enum ('active', 'inactive', 'suspended');
create type public.event_status as enum ('draft', 'open', 'closed', 'completed', 'cancelled');
create type public.registration_status as enum ('pending', 'confirmed', 'cancelled', 'waitlisted');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'waived');
create type public.announcement_status as enum ('draft', 'scheduled', 'sent');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  avatar_url text,
  role public.user_role not null default 'member',
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete cascade,
  membership_number text unique not null,
  organization text,
  title text,
  joined_on date not null default current_date,
  expires_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text not null default '',
  venue text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  registration_deadline timestamptz,
  capacity integer not null check (capacity > 0),
  fee_cents integer not null default 0 check (fee_cents >= 0),
  currency text not null default 'HKD',
  status public.event_status not null default 'draft',
  poster_path text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.registration_status not null default 'pending',
  source text not null default 'web',
  guest_count integer not null default 0 check (guest_count >= 0),
  special_requirements text,
  qr_token uuid not null default gen_random_uuid(),
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, profile_id)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid unique not null references public.registrations(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references public.profiles(id),
  method text not null default 'manual',
  notes text
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'HKD',
  status public.payment_status not null default 'pending',
  provider text,
  provider_reference text unique,
  receipt_path text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  subject text not null,
  body_html text not null default '',
  status public.announcement_status not null default 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index registrations_event_idx on public.registrations(event_id);
create index registrations_profile_idx on public.registrations(profile_id);
create index payments_profile_idx on public.payments(profile_id);
create index payments_registration_idx on public.payments(registration_id);
create index announcements_event_idx on public.announcements(event_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger members_updated_at before update on public.members
for each row execute function public.touch_updated_at();
create trigger events_updated_at before update on public.events
for each row execute function public.touch_updated_at();
create trigger registrations_updated_at before update on public.registrations
for each row execute function public.touch_updated_at();
create trigger payments_updated_at before update on public.payments
for each row execute function public.touch_updated_at();
create trigger announcements_updated_at before update on public.announcements
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(public.current_role() in ('admin', 'staff'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.announcements enable row level security;

create policy profiles_read on public.profiles
for select to authenticated using (id = auth.uid() or public.is_staff());
create policy profiles_staff_insert on public.profiles
for insert to authenticated with check (public.is_admin());
create policy profiles_staff_update on public.profiles
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy profiles_staff_delete on public.profiles
for delete to authenticated using (public.is_admin());

create policy members_read on public.members
for select to authenticated using (profile_id = auth.uid() or public.is_staff());
create policy members_staff_write on public.members
for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy events_authenticated_read on public.events
for select to authenticated using (status <> 'cancelled' or public.is_staff());
create policy events_staff_write on public.events
for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy registrations_read on public.registrations
for select to authenticated using (profile_id = auth.uid() or public.is_staff());
create policy registrations_self_insert on public.registrations
for insert to authenticated with check (profile_id = auth.uid());
create policy registrations_staff_update on public.registrations
for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy registrations_self_cancel on public.registrations
for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy registrations_staff_delete on public.registrations
for delete to authenticated using (public.is_staff());

create policy attendance_read on public.attendance
for select to authenticated using (
  public.is_staff() or exists (
    select 1 from public.registrations r
    where r.id = attendance.registration_id and r.profile_id = auth.uid()
  )
);
create policy attendance_staff_write on public.attendance
for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy payments_read on public.payments
for select to authenticated using (profile_id = auth.uid() or public.is_staff());
create policy payments_staff_write on public.payments
for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy announcements_read on public.announcements
for select to authenticated using (status = 'sent' or public.is_staff());
create policy announcements_staff_write on public.announcements
for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant usage on schema public to authenticated;
grant select on public.profiles, public.members, public.events, public.registrations,
  public.attendance, public.payments, public.announcements to authenticated;
grant insert, update on public.registrations to authenticated;
grant insert, update, delete on public.members, public.events, public.attendance,
  public.payments, public.announcements to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('event-posters', 'event-posters', true, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('payment-receipts', 'payment-receipts', false, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;

create policy poster_public_read on storage.objects
for select using (bucket_id = 'event-posters');
create policy poster_staff_insert on storage.objects
for insert to authenticated with check (bucket_id = 'event-posters' and public.is_staff());
create policy poster_staff_update on storage.objects
for update to authenticated using (bucket_id = 'event-posters' and public.is_staff());
create policy poster_staff_delete on storage.objects
for delete to authenticated using (bucket_id = 'event-posters' and public.is_staff());

create policy receipt_owner_read on storage.objects
for select to authenticated using (
  bucket_id = 'payment-receipts'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
);
create policy receipt_owner_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy receipt_staff_manage on storage.objects
for all to authenticated using (
  bucket_id = 'payment-receipts' and public.is_staff()
) with check (
  bucket_id = 'payment-receipts' and public.is_staff()
);

insert into public.events (
  title, slug, description, venue, starts_at, registration_deadline,
  capacity, fee_cents, status
) values (
  '2026 夏日交流晚宴',
  '2026-summer-networking-dinner',
  'EventFlow 示範活動，可在活動管理中修改。',
  '香港會議展覽中心',
  '2026-08-18 19:00:00+08',
  '2026-08-10 23:59:00+08',
  160,
  0,
  'open'
);
