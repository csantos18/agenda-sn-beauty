create table if not exists appointments (
  id integer primary key,
  client text not null,
  phone text not null,
  service_id integer not null,
  professional text not null,
  date date not null,
  time text not null,
  payment_method text not null,
  notes text default '',
  status text not null default 'pendente',
  created_at timestamptz not null default now()
);

alter table appointments
  alter column notes set default '';

create unique index if not exists appointments_unique_active_time
  on appointments (professional, date, time)
  where status <> 'cancelado';

create index if not exists appointments_date_professional_idx
  on appointments (date, professional);

create index if not exists appointments_status_idx
  on appointments (status);

create table if not exists reviews (
  id integer primary key,
  name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key,
  created_at timestamptz not null default now(),
  actor text not null,
  action text not null,
  appointment_id integer,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists audit_logs_created_at_idx
  on audit_logs (created_at desc);

create index if not exists audit_logs_action_idx
  on audit_logs (action);

alter table appointments enable row level security;
alter table reviews enable row level security;
alter table audit_logs enable row level security;

revoke all on appointments from anon, authenticated;
revoke all on reviews from anon, authenticated;
revoke all on audit_logs from anon, authenticated;
