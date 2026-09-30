-- Gaia reminders: asks the app to send whatever is due, every five minutes.
-- Run this once in Supabase (SQL Editor -> New query), after schema.sql and
-- after the Vercel deploy that has CRON_SECRET set. Replace the two values
-- in angle brackets first; this file itself stays as it is.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Running it again replaces the job instead of adding a second one.
select cron.unschedule('gaia-reminders') where exists (select 1 from cron.job where jobname = 'gaia-reminders');

select cron.schedule(
  'gaia-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://<your vercel address>/api/remind',
    headers := jsonb_build_object('Authorization', 'Bearer <your CRON_SECRET>'),
    body    := '{}'::jsonb
  );
  $$
);

-- To stop reminders for everyone:  select cron.unschedule('gaia-reminders');
-- To see recent runs:              select * from net._http_response order by created desc limit 10;
