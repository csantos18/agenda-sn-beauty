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

alter table audit_logs enable row level security;

revoke all on audit_logs from anon, authenticated;
