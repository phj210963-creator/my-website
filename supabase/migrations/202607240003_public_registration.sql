alter table public.profiles
  add column if not exists full_name_zh text not null default '',
  add column if not exists full_name_en text not null default '';

alter table public.registrations
  alter column profile_id drop not null,
  add column if not exists attendee_name_zh text not null default '',
  add column if not exists attendee_name_en text not null default '',
  add column if not exists attendee_email text not null default '',
  add column if not exists attendee_phone text not null default '',
  add column if not exists organization text not null default '';

create table if not exists public.registration_settings (
  event_id uuid primary key references public.events(id) on delete cascade,
  form_title text not null default '活動報名表格',
  instructions text not null default '請填寫以下資料完成報名。',
  success_message text not null default '報名成功，我們將以電郵與你聯絡。',
  require_name_zh boolean not null default true,
  require_name_en boolean not null default false,
  require_email boolean not null default true,
  require_phone boolean not null default true,
  require_organization boolean not null default false,
  allow_guest boolean not null default true,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists registration_settings_updated_at on public.registration_settings;
create trigger registration_settings_updated_at before update on public.registration_settings
for each row execute function public.touch_updated_at();

alter table public.registration_settings enable row level security;

drop policy if exists events_public_open_read on public.events;
create policy events_public_open_read on public.events
for select to anon using (status = 'open');

drop policy if exists registration_settings_public_read on public.registration_settings;
create policy registration_settings_public_read on public.registration_settings
for select to anon, authenticated using (
  public.is_staff() or exists (
    select 1 from public.events e
    where e.id = registration_settings.event_id and e.status = 'open'
  )
);

drop policy if exists registration_settings_staff_write on public.registration_settings;
create policy registration_settings_staff_write on public.registration_settings
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists registrations_public_insert on public.registrations;
create policy registrations_public_insert on public.registrations
for insert to anon, authenticated with check (
  profile_id is null
  and length(trim(attendee_email)) > 0
  and (length(trim(attendee_name_zh)) > 0 or length(trim(attendee_name_en)) > 0)
  and exists (
    select 1
    from public.events e
    left join public.registration_settings s on s.event_id = e.id
    where e.id = registrations.event_id
      and e.status = 'open'
      and coalesce(s.is_open, true)
      and coalesce(s.allow_guest, true)
  )
);

grant select on public.events, public.registration_settings to anon;
grant insert on public.registrations to anon;
grant select, insert, update, delete on public.registration_settings to authenticated;

insert into public.registration_settings (event_id)
select id from public.events
on conflict (event_id) do nothing;
