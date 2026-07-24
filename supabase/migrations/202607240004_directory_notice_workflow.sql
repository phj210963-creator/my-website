alter table public.members
  add column if not exists name_zh text not null default '',
  add column if not exists name_en text not null default '',
  add column if not exists email text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists member_status text not null default 'active';

update public.members m
set
  name_zh = coalesce(nullif(p.full_name_zh, ''), m.name_zh),
  name_en = coalesce(nullif(p.full_name_en, ''), nullif(p.full_name, ''), m.name_en),
  email = coalesce(nullif(p.email, ''), m.email),
  phone = coalesce(nullif(p.phone, ''), m.phone)
from public.profiles p
where m.profile_id = p.id;

alter table public.announcements
  add column if not exists attachment_path text,
  add column if not exists registration_url text,
  add column if not exists recipient_group text not null default 'all_active_members';

grant select, insert, update, delete on public.members, public.announcements to authenticated;
