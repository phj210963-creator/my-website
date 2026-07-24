create table if not exists public.email_send_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete set null,
  sent_by uuid references public.profiles(id) on delete set null,
  subject text not null,
  recipient_count integer not null default 0,
  success_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'sent',
  attachment_path text,
  error_message text,
  sent_at timestamptz not null default now()
);

create index if not exists email_send_logs_event_sent_idx
on public.email_send_logs (event_id, sent_at desc);

alter table public.email_send_logs enable row level security;

drop policy if exists email_send_logs_staff_read on public.email_send_logs;
create policy email_send_logs_staff_read on public.email_send_logs
for select to authenticated using (public.is_staff());

drop policy if exists email_send_logs_staff_insert on public.email_send_logs;
create policy email_send_logs_staff_insert on public.email_send_logs
for insert to authenticated with check (
  public.is_staff() and sent_by = auth.uid()
);

grant select, insert on public.email_send_logs to authenticated;
