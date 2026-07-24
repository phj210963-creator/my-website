alter table public.payments
  add column if not exists payer_name text not null default '',
  add column if not exists payer_email text not null default '',
  add column if not exists payment_date date,
  add column if not exists notes text not null default '';

update public.payments
set payment_date = coalesce(payment_date, paid_at::date, created_at::date)
where payment_date is null;
