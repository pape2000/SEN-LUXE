-- Reconstitué depuis le projet Supabase « sen luxe » (migration déjà appliquée le 2026-11-18 sous ce nom).
-- Idempotent. Seul le déclencheur sur senluxe_stock a été constaté ; les autres tables (commandes, paniers, événements)
-- sont gérées par la fonction mais leurs déclencheurs n'ont pas été relevés : à vérifier lors de la phase Commandes/Paniers.
create table if not exists public.senluxe_sync_signals (
  id bigint generated always as identity primary key,
  scope text not null,
  created_at timestamptz not null default now()
);
alter table public.senluxe_sync_signals enable row level security;
drop policy if exists senluxe_sync_signal_read on public.senluxe_sync_signals;
create policy senluxe_sync_signal_read on public.senluxe_sync_signals for select to anon, authenticated using (true);
grant select on public.senluxe_sync_signals to anon, authenticated;

create or replace function public.senluxe_emit_sync_signal() returns trigger
language plpgsql security definer set search_path = public as $$
declare s text;
begin
  s := case tg_table_name when 'senluxe_orders' then 'orders' when 'senluxe_carts' then 'carts'
                          when 'senluxe_events' then 'events' when 'senluxe_stock' then 'stock' else null end;
  if s is not null then insert into public.senluxe_sync_signals(scope) values (s); end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;
revoke all on function public.senluxe_emit_sync_signal() from public, anon, authenticated;

drop trigger if exists senluxe_stock_sync_signal on public.senluxe_stock;
create trigger senluxe_stock_sync_signal after insert or update or delete on public.senluxe_stock
  for each row execute function public.senluxe_emit_sync_signal();
