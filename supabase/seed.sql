-- Opcjonalny seed bazy.
-- Treści NIE są tu duplikowane ręcznie – źródłem prawdy jest content/seed/*.json.
-- Wgraj je skryptem (waliduje zod-em i robi upsert kluczem service role):
--
--   npm run content:import -- --from content/seed --format json
--
-- Ten plik tylko upewnia się, że istnieje wiersz wersji treści.
insert into public.content_meta (id, version) values (1, 0) on conflict (id) do nothing;
