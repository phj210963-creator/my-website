-- Invited back-office users have already proved control of their mailbox by
-- opening the unique invitation link. Confirm their Auth email when the
-- invitation is accepted so Supabase does not block password login.

create or replace function public.confirm_invited_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status is distinct from new.status then
    update auth.users
    set email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where lower(email) = lower(new.email)
      and email_confirmed_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists confirm_invited_auth_user_on_accept
on public.user_invitations;

create trigger confirm_invited_auth_user_on_accept
after update of status on public.user_invitations
for each row
execute function public.confirm_invited_auth_user();

-- Repair users who accepted an invitation before this trigger was installed.
update auth.users as auth_user
set email_confirmed_at = coalesce(auth_user.email_confirmed_at, invitation.accepted_at, now()),
    updated_at = now()
from public.user_invitations as invitation
where invitation.status = 'accepted'
  and invitation.role in ('admin'::public.user_role, 'staff'::public.user_role)
  and lower(auth_user.email) = lower(invitation.email)
  and auth_user.email_confirmed_at is null;
