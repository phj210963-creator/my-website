grant insert, update, delete on public.profiles to authenticated;
grant delete on public.registrations to authenticated;

-- Staff can create registrations for participants from the administration UI.
drop policy if exists registrations_staff_insert on public.registrations;
create policy registrations_staff_insert on public.registrations
for insert to authenticated with check (public.is_staff());
