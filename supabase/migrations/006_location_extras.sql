-- Add address, phone, and is_primary columns to tenant_locations
-- These are used by the Locations management UI

alter table tenant_locations
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists is_primary boolean not null default false;

-- Mark the first (oldest) location for each tenant as primary
-- so existing data isn't left with no primary location
update tenant_locations tl
set is_primary = true
where tl.created_at = (
  select min(tl2.created_at)
  from tenant_locations tl2
  where tl2.tenant_id = tl.tenant_id
)
and not exists (
  select 1 from tenant_locations tl3
  where tl3.tenant_id = tl.tenant_id
  and tl3.is_primary = true
);
