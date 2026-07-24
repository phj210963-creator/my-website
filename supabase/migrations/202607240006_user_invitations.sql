create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'staff',
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending',
  invited_by uuid references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists pending_invitation_email_idx
on public.user_invitations (lower(email))
where status = 'pending';

alter table public.user_invitations enable row level security;

create policy invitations_admin_manage on public.user_invitations
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.user_invitations to authenticated;

create or replace function public.get_user_invitation(invitation_token uuid)
returns table (email text, full_name text, role public.user_role)
language sql
stable
security definer
set search_path = ''
as $$
  select i.email, i.full_name, i.role
  from public.user_invitations i
  where i.token = invitation_token
    and i.status = 'pending'
    and i.expires_at > now()
  limit 1;
$$;

grant execute on function public.get_user_invitation(uuid) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  invitation public.user_invitations%rowtype;
begin
  select * into invitation
  from public.user_invitations
  where lower(email) = lower(coalesce(new.email, ''))
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', invitation.full_name, ''),
    coalesce(invitation.role, 'member'::public.user_role)
  );

  if invitation.id is not null then
    update public.user_invitations
    set status = 'accepted', accepted_at = now()
    where id = invitation.id;
  end if;
  return new;
end;
$$;
