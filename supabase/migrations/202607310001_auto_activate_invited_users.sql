-- Activate confirmed staff/admin accounts using their administrator invitation.
create or replace function public.sync_confirmed_invited_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare invitation_role text;
begin
  if new.email_confirmed_at is null then return new; end if;
  select ui.role::text into invitation_role
  from public.user_invitations ui
  where lower(ui.email) = lower(new.email)
  order by ui.created_at desc limit 1;
  if invitation_role in ('admin', 'staff') then
    update public.profiles p
    set role = (jsonb_populate_record(null::public.profiles, jsonb_build_object('role', invitation_role))).role,
        status = (jsonb_populate_record(null::public.profiles, jsonb_build_object('status', 'active'))).status,
        email = coalesce(p.email, new.email), updated_at = now()
    where p.id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_invited_user_confirmed on auth.users;
create trigger on_invited_user_confirmed
after insert or update of email_confirmed_at on auth.users
for each row execute function public.sync_confirmed_invited_user();

-- Repair invitations confirmed before this migration was installed.
update public.profiles p
set role = (jsonb_populate_record(null::public.profiles, jsonb_build_object('role', latest.role_text))).role,
    status = (jsonb_populate_record(null::public.profiles, jsonb_build_object('status', 'active'))).status,
    updated_at = now()
from auth.users au
cross join lateral (
  select ui.role::text as role_text from public.user_invitations ui
  where lower(ui.email) = lower(au.email)
  order by ui.created_at desc limit 1
) latest
where p.id = au.id and au.email_confirmed_at is not null
  and latest.role_text in ('admin', 'staff');
