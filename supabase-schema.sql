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

create unique index if not exists appointments_unique_active_time
  on appointments (professional, date, time)
  where status <> 'cancelado';

create table if not exists reviews (
  id integer primary key,
  name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

alter table appointments enable row level security;
alter table reviews enable row level security;
