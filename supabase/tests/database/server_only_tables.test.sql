-- Tables only the server uses: the reminder log (costs, provider IDs, errors) and the Paystack
-- events (payment details). Nobody reaches them through the API, signed in or not.
begin;
select plan(4);

select is_empty(
  $$ select table_name || ': ' || privilege_type from information_schema.role_table_grants
     where table_schema = 'public' and table_name in ('reminder_deliveries', 'payment_events')
       and grantee in ('anon', 'authenticated') $$,
  'no table-wide access to the reminder log or payment events'
);
select is_empty(
  $$ select table_name || '.' || column_name || ': ' || privilege_type from information_schema.column_privileges
     where table_schema = 'public' and table_name in ('reminder_deliveries', 'payment_events')
       and grantee in ('anon', 'authenticated') $$,
  'and no access to any of their columns'
);

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$ select * from public.reminder_deliveries $$, '42501', null,
  'a signed-in person cannot read the reminder log');
select throws_ok($$ select * from public.payment_events $$, '42501', null,
  'a signed-in person cannot read payment events');

select * from finish();
rollback;
