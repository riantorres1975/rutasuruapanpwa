drop trigger if exists confirmation_moderation_audit_is_immutable
  on public.confirmation_moderation_audit;
drop function if exists private.prevent_confirmation_audit_mutation();

revoke all on table public.confirmation_moderation_audit from service_role;
grant select, insert on table public.confirmation_moderation_audit to service_role;
