export const SUPABASE_SQL_SCHEMA_AND_RLS = `-- ============================================================================
-- AEGIS VANGUARD SECURITY SERVICES — SUPABASE POSTGRESQL SCHEMA & RLS POLICIES
-- Complete SQL migration script for:
--   roles, service_lines, clients, users, user_roles, rbac_config, sites,
--   employees, leave_requests, disciplinary_records, shifts, attendance,
--   incidents, cit_jobs, cctv_jobs, invoices, expenses, and audit_logs.
-- Enforces username-only authentication, disabled self-signup, 8-role RBAC,
-- Director full CRUD across all entities, and strict Row-Level Security (RLS).
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. ROLES TABLE (Seeded with the 8 mandatory RBAC roles; editable by Director)
create table if not exists public.roles (
  id smallserial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into public.roles (id, name) values
  (1, 'Director'),
  (2, 'Operation Manager'),
  (3, 'Supervisor'),
  (4, 'Accountant'),
  (5, 'Human Resource Manager'),
  (6, 'Guard'),
  (7, 'CCTV Technician'),
  (8, 'Client')
on conflict (id) do update set name = excluded.name;

-- 2. SERVICE_LINES TABLE (Company security services; Director can add/edit/delete)
create table if not exists public.service_lines (
  id smallserial primary key,
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.service_lines (name) values
  ('Manned Guarding'),
  ('Industrial Security'),
  ('Cash-in-Transit (CIT)'),
  ('Valuable Transport'),
  ('CCTV Installation & Surveillance'),
  ('Event Security'),
  ('Asset Storage & Protection')
on conflict (name) do nothing;

-- 3. CLIENTS TABLE
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text not null,
  contact_info text not null,
  contract_tier text not null default 'Enterprise Sovereign',
  created_at timestamptz not null default now()
);

-- 4. USERS TABLE (Linked 1:1 with auth.users; username is sole login identifier)
-- Note: Supabase Auth maps username -> <username>@auth.aegis-vanguard.internal
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  full_name text not null,
  phone text not null,
  status text not null default 'active' check (status in ('active', 'deactivated')),
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- 5. USER_ROLES TABLE
create table if not exists public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role_id smallint not null references public.roles(id) on delete restrict,
  assigned_by uuid references public.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- 6. SYSTEM CONFIG (Operation Manager configurable financial access)
create table if not exists public.rbac_config (
  id smallint primary key default 1 check (id = 1),
  operation_manager_finance_access text not null default 'view'
    check (operation_manager_finance_access in ('none', 'view', 'edit', 'admin')),
  updated_at timestamptz not null default now()
);

insert into public.rbac_config (id, operation_manager_finance_access)
values (1, 'view') on conflict (id) do nothing;

-- 7. SITES TABLE (Contracted Sites across all company security service lines)
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  site_name text not null,
  address text not null,
  service_type text not null default 'Manned Guarding',
  supervisor_id uuid references public.users(id) on delete set null,
  risk_level text not null default 'High'
    check (risk_level in ('Standard', 'Elevated', 'High', 'Critical')),
  risk_notes text not null default '',
  cctv_status text not null default 'Online'
    check (cctv_status in ('Online', 'Maintenance Required', 'Degraded', 'Not Installed')),
  active_cameras integer not null default 0,
  required_guards integer not null default 2,
  created_at timestamptz not null default now()
);

-- 8. EMPLOYEES TABLE (HR Module)
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users(id) on delete cascade,
  full_name text not null,
  badge_number text not null unique,
  role_title text not null,
  assigned_site_id uuid references public.sites(id) on delete set null,
  start_date date not null default current_date,
  contract_expiry date not null,
  sia_license_expiry date not null,
  certifications text[] not null default '{}',
  clearance_level text not null default 'BS7858 Vetted · Tier-2 Operational',
  hourly_rate numeric(8,2) not null default 21.50,
  emergency_contact text not null default '',
  created_at timestamptz not null default now()
);

-- 9. LEAVE REQUESTS & DISCIPLINARY RECORDS (HR Module)
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null default 'Pending'
    check (status in ('Pending', 'Approved', 'Declined')),
  reviewed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.disciplinary_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  incident_date date not null default current_date,
  category text not null,
  summary text not null,
  action_taken text not null,
  recorded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 10. SHIFTS TABLE (Scheduling & Shift Management)
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  guard_id uuid not null references public.users(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  post_assignment text not null default 'Main Perimeter Gate',
  status text not null default 'Scheduled'
    check (status in ('Pending Approval', 'Scheduled', 'Active / On-Post', 'Completed', 'No-Show')),
  hours_logged numeric(6,2) not null default 8.0,
  approved_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- 11. ATTENDANCE TABLE (Clock-in / Clock-out + Geo-tagging)
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null unique references public.shifts(id) on delete cascade,
  guard_id uuid not null references public.users(id) on delete cascade,
  clock_in timestamptz,
  clock_out timestamptz,
  geo_data jsonb not null default '{}'::jsonb,
  verified boolean not null default true,
  created_at timestamptz not null default now()
);

-- 12. INCIDENTS TABLE (Occurrence & Escalation Workflow)
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  reported_by uuid references public.users(id) on delete set null,
  type text not null,
  severity text not null default 'High'
    check (severity in ('Low', 'Medium', 'High', 'Critical')),
  description text not null,
  attachments text[] not null default '{}',
  status text not null default 'Open'
    check (status in ('Open', 'Under Supervisor Review', 'Escalated to Command', 'Resolved')),
  escalated_to text,
  client_visible boolean not null default true,
  occurred_at timestamptz not null default now()
);

-- 13. CIT & VALUABLE TRANSPORT JOBS
create table if not exists public.cit_jobs (
  id uuid primary key default gen_random_uuid(),
  job_code text not null unique,
  client_id uuid references public.clients(id) on delete set null,
  service_line text not null default 'Cash-in-Transit (CIT)'
    check (service_line in ('Cash-in-Transit (CIT)', 'Valuable Transport')),
  pickup text not null,
  dropoff text not null,
  crew_ids uuid[] not null default '{}',
  vehicle text not null,
  value_category text not null,
  status text not null default 'Scheduled'
    check (status in ('Scheduled', 'In Transit', 'Vault Handover', 'Completed')),
  chain_of_custody jsonb not null default '[]'::jsonb,
  scheduled_at timestamptz not null default now()
);

-- 14. CCTV INSTALLATION & SURVEILLANCE JOBS
create table if not exists public.cctv_jobs (
  id uuid primary key default gen_random_uuid(),
  job_code text not null default ('SURV-' || floor(random() * 900 + 100)::text),
  site_id uuid not null references public.sites(id) on delete cascade,
  technician_id uuid references public.users(id) on delete set null,
  job_type text not null
    check (job_type in ('New Installation', 'Preventive Maintenance', 'Emergency Repair', 'Firmware & NVR Audit')),
  status text not null default 'Assigned'
    check (status in ('Assigned', 'In Progress', 'Pending Sign-Off', 'Completed')),
  equipment_used text[] not null default '{}',
  technical_notes text not null default '',
  scheduled_date date not null default current_date,
  signed_off_by text,
  created_at timestamptz not null default now()
);

-- 15. INVOICES & EXPENSES (Accounting & Invoicing)
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_line text not null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'Issued'
    check (status in ('Draft', 'Issued', 'Paid', 'Overdue')),
  billing_period text not null default 'Contracted Security Services',
  due_date date not null,
  issued_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  service_line text not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  incurred_date date not null default current_date,
  approved_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 16. AUDIT_LOGS TABLE (Immutable Account, Role & Security Operations Audit Trail)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  target_id uuid,
  details text not null,
  timestamp timestamptz not null default now()
);

-- Backward-compatible view alias so queries targeting either public.audit_logs or public.audit_log succeed
create or replace view public.audit_log as
  select * from public.audit_logs;

-- ============================================================================
-- HELPER FUNCTIONS FOR ROW-LEVEL SECURITY (RLS)
-- ============================================================================

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.name
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  join public.users u on u.id = ur.user_id
  where ur.user_id = auth.uid()
    and u.status = 'active'
  limit 1;
$$;

create or replace function public.is_director()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'Director', false);
$$;

create or replace function public.is_account_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('Director', 'Operation Manager'), false);
$$;

create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.users where id = auth.uid() and status = 'active';
$$;

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY (RLS) ON ALL TABLES
-- ============================================================================
alter table public.roles enable row level security;
alter table public.service_lines enable row level security;
alter table public.clients enable row level security;
alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.rbac_config enable row level security;
alter table public.sites enable row level security;
alter table public.employees enable row level security;
alter table public.leave_requests enable row level security;
alter table public.disciplinary_records enable row level security;
alter table public.shifts enable row level security;
alter table public.attendance enable row level security;
alter table public.incidents enable row level security;
alter table public.cit_jobs enable row level security;
alter table public.cctv_jobs enable row level security;
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- 1. ROLES & SERVICE_LINES POLICIES (Readable by authenticated users; full CRUD for Director)
create policy "Roles readable by all authenticated users"
  on public.roles for select
  using (auth.uid() is not null);

create policy "Director has full CRUD on roles"
  on public.roles for all
  using (public.is_director())
  with check (public.is_director());

create policy "Service lines readable by all authenticated users"
  on public.service_lines for select
  using (auth.uid() is not null);

create policy "Director has full CRUD on service_lines"
  on public.service_lines for all
  using (public.is_director())
  with check (public.is_director());

-- 2. RBAC_CONFIG POLICIES
create policy "RBAC config readable by all authenticated users"
  on public.rbac_config for select
  using (auth.uid() is not null);

create policy "Only Director can update RBAC config"
  on public.rbac_config for all
  using (public.is_director())
  with check (public.is_director());

-- 3. USERS & USER_ROLES POLICIES (Only Director & Operation Manager can create/modify/deactivate/delete)
create policy "Users can view own profile; Admins, HR, and Supervisors view all"
  on public.users for select
  using (
    id = auth.uid()
    or public.current_user_role() in ('Director', 'Operation Manager', 'Human Resource Manager', 'Supervisor')
  );

create policy "Only Director and Operation Manager can insert users"
  on public.users for insert
  with check (public.is_account_admin());

create policy "Admins can update any user; Users can update own profile"
  on public.users for update
  using (public.is_account_admin() or id = auth.uid())
  with check (public.is_account_admin() or id = auth.uid());

create policy "Only Director and Operation Manager can delete users"
  on public.users for delete
  using (public.is_account_admin());

create policy "User roles readable by authenticated users"
  on public.user_roles for select
  using (auth.uid() is not null);

create policy "Only Director and Operation Manager can manage user_roles"
  on public.user_roles for all
  using (public.is_account_admin())
  with check (public.is_account_admin());

-- 4. CLIENTS & SITES POLICIES (Clients strictly isolated to their own client_id)
create policy "Clients readable by internal staff or owning Client"
  on public.clients for select
  using (
    public.current_user_role() in ('Director', 'Operation Manager', 'Supervisor', 'Human Resource Manager', 'Accountant', 'CCTV Technician')
    or (public.current_user_role() = 'Client' and id = public.current_client_id())
  );

create policy "Director and Operation Manager have full CRUD on clients"
  on public.clients for all
  using (public.is_account_admin())
  with check (public.is_account_admin());

create policy "Sites isolated by role and client_id"
  on public.sites for select
  using (
    public.current_user_role() in ('Director', 'Operation Manager', 'Supervisor', 'Human Resource Manager', 'Accountant', 'CCTV Technician')
    or (public.current_user_role() = 'Client' and client_id = public.current_client_id())
    or exists (
      select 1 from public.shifts sh where sh.site_id = sites.id and sh.guard_id = auth.uid()
    )
  );

create policy "Director and Operation Manager have full CRUD on sites"
  on public.sites for all
  using (public.is_account_admin())
  with check (public.is_account_admin());

-- 5. EMPLOYEES, LEAVE_REQUESTS & DISCIPLINARY_RECORDS POLICIES (HR & Director)
create policy "HR, Director, Ops Manager, Supervisor, Accountant view employees; Guard views self"
  on public.employees for select
  using (
    user_id = auth.uid()
    or public.current_user_role() in ('Director', 'Operation Manager', 'Human Resource Manager', 'Supervisor', 'Accountant')
  );

create policy "Director and HR Manager have full CRUD on employees"
  on public.employees for all
  using (public.current_user_role() in ('Director', 'Human Resource Manager'))
  with check (public.current_user_role() in ('Director', 'Human Resource Manager'));

create policy "Leave requests readable by HR, Director, Ops Manager, or owning employee"
  on public.leave_requests for select
  using (
    public.current_user_role() in ('Director', 'Operation Manager', 'Human Resource Manager', 'Supervisor')
    or exists (select 1 from public.employees e where e.id = leave_requests.employee_id and e.user_id = auth.uid())
  );

create policy "Director and HR Manager manage leave requests"
  on public.leave_requests for all
  using (public.current_user_role() in ('Director', 'Human Resource Manager'))
  with check (public.current_user_role() in ('Director', 'Human Resource Manager'));

create policy "Disciplinary records managed by Director and HR Manager"
  on public.disciplinary_records for all
  using (public.current_user_role() in ('Director', 'Human Resource Manager', 'Operation Manager'))
  with check (public.current_user_role() in ('Director', 'Human Resource Manager'));

-- 6. SHIFTS & ATTENDANCE POLICIES
create policy "Shifts readable by Ops/Director/HR/Supervisor/Accountant, assigned Guard, or owning Client"
  on public.shifts for select
  using (
    public.current_user_role() in ('Director', 'Operation Manager', 'Supervisor', 'Human Resource Manager', 'Accountant')
    or guard_id = auth.uid()
    or (
      public.current_user_role() = 'Client'
      and exists (select 1 from public.sites s where s.id = shifts.site_id and s.client_id = public.current_client_id())
    )
  );

create policy "Director, Ops Manager, and Supervisor have full CRUD on shifts"
  on public.shifts for all
  using (public.current_user_role() in ('Director', 'Operation Manager', 'Supervisor'))
  with check (public.current_user_role() in ('Director', 'Operation Manager', 'Supervisor'));

create policy "Guards clock in/out on own shifts; Supervisors, Accountant & Admins manage attendance"
  on public.attendance for all
  using (
    guard_id = auth.uid()
    or public.current_user_role() in ('Director', 'Operation Manager', 'Supervisor', 'Accountant')
  )
  with check (
    guard_id = auth.uid()
    or public.current_user_role() in ('Director', 'Operation Manager', 'Supervisor')
  );

-- 7. INCIDENTS POLICIES
create policy "Incidents visible to internal ops, reporting guard, or owning client (if client_visible)"
  on public.incidents for select
  using (
    public.current_user_role() in ('Director', 'Operation Manager', 'Supervisor', 'Human Resource Manager', 'CCTV Technician')
    or reported_by = auth.uid()
    or (
      public.current_user_role() = 'Client'
      and client_visible = true
      and exists (select 1 from public.sites s where s.id = incidents.site_id and s.client_id = public.current_client_id())
    )
  );

create policy "Guards, Supervisors, Ops Manager, and Director can log and manage incidents"
  on public.incidents for all
  using (public.current_user_role() in ('Director', 'Operation Manager', 'Supervisor', 'Guard'))
  with check (public.current_user_role() in ('Director', 'Operation Manager', 'Supervisor', 'Guard'));

-- 8. CIT_JOBS POLICIES
create policy "CIT jobs managed by Director, Operation Manager, and Supervisor"
  on public.cit_jobs for all
  using (public.current_user_role() in ('Director', 'Operation Manager', 'Supervisor'))
  with check (public.current_user_role() in ('Director', 'Operation Manager', 'Supervisor'));

-- 9. CCTV_JOBS POLICIES
create policy "CCTV jobs visible to Ops, assigned Technician, and owning Client"
  on public.cctv_jobs for select
  using (
    public.current_user_role() in ('Director', 'Operation Manager', 'Supervisor')
    or technician_id = auth.uid()
    or (
      public.current_user_role() = 'Client'
      and exists (select 1 from public.sites s where s.id = cctv_jobs.site_id and s.client_id = public.current_client_id())
    )
  );

create policy "Director, Operation Manager, and CCTV Technicians manage CCTV jobs"
  on public.cctv_jobs for all
  using (public.current_user_role() in ('Director', 'Operation Manager', 'CCTV Technician'))
  with check (public.current_user_role() in ('Director', 'Operation Manager', 'CCTV Technician'));

-- 10. INVOICES & EXPENSES POLICIES
create policy "Invoices readable by Director, Accountant, configured Ops Manager, and owning Client"
  on public.invoices for select
  using (
    public.current_user_role() in ('Director', 'Accountant')
    or (
      public.current_user_role() = 'Operation Manager'
      and exists (
        select 1 from public.rbac_config
        where id = 1 and operation_manager_finance_access in ('view', 'edit', 'admin')
      )
    )
    or (public.current_user_role() = 'Client' and client_id = public.current_client_id())
  );

create policy "Director, Accountant, and authorized Ops Manager manage invoices"
  on public.invoices for all
  using (
    public.current_user_role() in ('Director', 'Accountant')
    or (
      public.current_user_role() = 'Operation Manager'
      and exists (
        select 1 from public.rbac_config
        where id = 1 and operation_manager_finance_access in ('edit', 'admin')
      )
    )
  )
  with check (
    public.current_user_role() in ('Director', 'Accountant')
    or (
      public.current_user_role() = 'Operation Manager'
      and exists (
        select 1 from public.rbac_config
        where id = 1 and operation_manager_finance_access in ('edit', 'admin')
      )
    )
  );

create policy "Expenses managed by Director and Accountant"
  on public.expenses for all
  using (public.current_user_role() in ('Director', 'Accountant'))
  with check (public.current_user_role() in ('Director', 'Accountant'));

-- 11. AUDIT_LOGS POLICIES (Visible & insertable only by Director & Operation Manager)
create policy "Audit logs readable only by Director and Operation Manager"
  on public.audit_logs for select
  using (public.is_account_admin());

create policy "Audit logs insertable by Director and Operation Manager"
  on public.audit_logs for insert
  with check (public.is_account_admin());
`;
