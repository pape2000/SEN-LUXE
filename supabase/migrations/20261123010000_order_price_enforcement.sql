-- SEN LUXE — Contrôle strict des prix à la commande (v5.1). Idempotent, non destructif.
-- Avant : un prix inférieur au prix publié était seulement signalé (colonne price_check) et la commande acceptée.
-- Maintenant : toute ligne dont le prix est inférieur au prix publié est REFUSÉE, aucune commande n'est créée,
-- aucun stock n'est décompté. Les prix supérieurs (options, suppléments) restent acceptés : ils ne peuvent pas léser la boutique.
create or replace function public.senluxe_place_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pub jsonb; items jsonb := coalesce(p->'items', '[]'::jsonb); it jsonb; prod jsonb; o record; oid uuid; onum text;
        cid text := left(p->>'cart_id', 64); vid text := left(p->>'visitor_id', 64); ref text := left(p->>'client_ref', 64);
        dlv jsonb; fee int; sub int := 0; unit int; v_qty int; expected numeric; mism text := null; clean jsonb := '[]'::jsonb;
        nm text := trim(coalesce(p#>>'{customer,name}', '')); ph text := trim(coalesce(p#>>'{customer,phone}', ''));
        ad text := trim(coalesce(p#>>'{customer,address}', '')); st record; need record; lim int;
begin
  -- Doublon (double clic, nouvel essai réseau) : la même commande est renvoyée.
  if ref is not null then
    select * into o from public.senluxe_orders where client_ref = ref;
    if o.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', o.id, 'order_number', o.order_number,
        'total', o.total, 'delivery_fee', o.delivery_fee, 'subtotal', o.subtotal); end if;
  end if;
  lim := coalesce((public.senluxe_setting('rate_orders_per_10min', '5'::jsonb))::text::int, 5);
  if not public.senluxe_rate_ok('order:' || coalesce(vid, 'x'), lim, interval '10 minutes')
     or not public.senluxe_rate_ok('order:all', 60, interval '1 minute') then
    raise exception 'Trop de commandes envoyées en peu de temps. Merci de patienter quelques minutes.';
  end if;
  if length(nm) < 2 or length(nm) > 80 then raise exception 'Nom invalide.'; end if;
  if length(regexp_replace(ph, '\D', '', 'g')) not between 7 and 15 then raise exception 'Numéro de téléphone invalide.'; end if;
  if length(ad) < 3 or length(ad) > 300 then raise exception 'Adresse de livraison invalide.'; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 or jsonb_array_length(items) > 50 then raise exception 'Commande vide ou trop volumineuse.'; end if;

  select payload into pub from public.senluxe_site_content where id = 'main';
  -- Livraison : tarif lu dans la version publiée (identique au panier du site).
  dlv := (select d from jsonb_array_elements(coalesce(pub->'delivery', '[]'::jsonb)) d where d->>'id' = p->>'delivery_id' limit 1);
  if pub is not null and jsonb_array_length(coalesce(pub->'delivery','[]'::jsonb)) > 0 then
    if dlv is null then raise exception 'Option de livraison inconnue.'; end if;
    if dlv->>'active' = 'false' then raise exception 'Cette option de livraison n''est plus proposée.'; end if;
    fee := greatest(0, round(coalesce((dlv->>'price')::numeric, 0)))::int;
  else
    fee := greatest(0, coalesce((p->>'delivery_fee')::int, 0));
    dlv := jsonb_build_object('id', p->>'delivery_id', 'label', p->>'delivery_label', 'price', fee);
  end if;

  for it in select * from jsonb_array_elements(items) loop
    v_qty := coalesce((it->>'qty')::int, 0);
    if v_qty < 1 or v_qty > 99 then raise exception 'Quantité invalide.'; end if;
    unit := round(coalesce((it->>'price')::numeric, -1))::int;
    if unit < 0 or unit > 100000000 then raise exception 'Prix invalide.'; end if;
    prod := (select x from jsonb_array_elements(coalesce(pub->'products','[]'::jsonb)) x where x->>'id' = it->>'id' limit 1);
    if pub is not null then
      if prod is null then raise exception 'Produit introuvable ou retiré : %', left(coalesce(it->>'name', it->>'id'), 80); end if;
      if prod->>'active' = 'false' then raise exception 'Produit indisponible : %', prod->>'name'; end if;
      expected := coalesce((prod->'colors'->>(it->>'color'))::numeric, (prod->>'price')::numeric, unit);
      if unit < expected then raise exception 'Prix modifié ou obsolète pour « % » (%, au lieu de %). Actualisez la page puis recommencez.', left(coalesce(prod->>'name', it->>'id'), 80), unit, expected using errcode = 'P0001'; end if;
    end if;
    sub := sub + unit * v_qty;
    clean := clean || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', it->>'id', 'name', left(coalesce(prod->>'name', it->>'name'), 160), 'qty', v_qty, 'price', unit,
      'color', left(it->>'color', 60), 'size', left(it->>'size', 30), 'lens', left(it->>'lens', 60),
      'opts', case when jsonb_typeof(it->'opts') = 'array' then it->'opts' end, 'img', left(it->>'img', 500),
      'collection', prod->>'cat')));
  end loop;

  -- Stock : contrôle puis décompte dans la même transaction (verrou de ligne).
  for need in select x->>'id' as pid, sum((x->>'qty')::int) as q from jsonb_array_elements(clean) x group by 1 loop
    select * into st from public.senluxe_stock where product_id = need.pid for update;
    if st.product_id is not null and st.qty is not null and st.qty < need.q then
      raise exception 'Stock insuffisant pour « % » (disponible : %).',
        coalesce((select x->>'name' from jsonb_array_elements(clean) x where x->>'id' = need.pid limit 1), need.pid), st.qty;
    end if;
  end loop;
  for need in select x->>'id' as pid, sum((x->>'qty')::int) as q from jsonb_array_elements(clean) x group by 1 loop
    update public.senluxe_stock set qty = qty - need.q, updated_at = now() where product_id = need.pid and qty is not null;
  end loop;

  onum := 'SL-' || to_char(now() at time zone 'Africa/Dakar', 'YYMMDD') || '-' || lpad(nextval('public.senluxe_order_seq')::text, 4, '0');
  insert into public.senluxe_orders (order_number, client_ref, status, channel, cart_id, visitor_id, customer, delivery, items,
      subtotal, delivery_fee, total, price_check, stock_applied)
  values (onum, ref, 'Nouvelle', left(coalesce(p->>'channel', 'site'), 20), cid, vid,
      jsonb_strip_nulls(jsonb_build_object('name', left(nm, 80), 'phone', left(ph, 30), 'address', left(ad, 300),
        'comment', nullif(left(trim(coalesce(p#>>'{customer,comment}', '')), 1000), ''))),
      jsonb_build_object('id', dlv->>'id', 'label', dlv->>'label', 'fee', fee),
      clean, sub, fee, sub + fee, mism, true)
  returning id into oid;
  insert into public.senluxe_order_events (order_id, kind, to_status, note) values (oid, 'créée', 'Nouvelle', 'Commande enregistrée depuis le site');
  if mism is not null then insert into public.senluxe_order_events (order_id, kind, note) values (oid, 'contrôle prix', mism); end if;

  if cid is not null then
    update public.senluxe_carts set status = 'converted', order_id = oid, recovered = (abandoned_at is not null),
      updated_at = now(), last_activity = now(),
      history = history || jsonb_build_array(jsonb_build_object('at', now(), 'step', 'commande confirmée', 'order', onum))
    where id = cid;
  end if;
  return jsonb_build_object('ok', true, 'id', oid, 'order_number', onum, 'subtotal', sub, 'delivery_fee', fee, 'total', sub + fee);
end $$;

grant execute on function public.senluxe_place_order(jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
