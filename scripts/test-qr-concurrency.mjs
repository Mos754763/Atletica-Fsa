import assert from "node:assert/strict";
import crypto from "node:crypto";
import { lookup } from "node:dns/promises";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

const testDatabaseUrl = process.env.TEST_SUPABASE_DB_URL;
const testSupabaseUrl = process.env.TEST_SUPABASE_URL;
const testServiceKey = process.env.TEST_SUPABASE_SECRET_KEY;
const testProjectRef = process.env.TEST_SUPABASE_PROJECT_REF;
const productionDatabaseUrl = process.env.SUPABASE_DB_URL;
const productionSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const productionProjectRef = "tbxihkzuyzszrfxqmleq";

function fail(message) {
  throw new Error(`[qr-concurrency] ${message}`);
}

function databaseFingerprint(value) {
  const url = new URL(value);
  return `${url.hostname}/${url.username}/${url.pathname}`;
}

if (process.env.RUN_QR_CONCURRENCY_TESTS !== "true") {
  fail("Defina RUN_QR_CONCURRENCY_TESTS=true para confirmar a execução explícita.");
}
if (!testDatabaseUrl || !testSupabaseUrl || !testServiceKey || !testProjectRef) {
  fail("Informe TEST_SUPABASE_DB_URL, TEST_SUPABASE_URL, TEST_SUPABASE_SECRET_KEY e TEST_SUPABASE_PROJECT_REF.");
}
if (testProjectRef === productionProjectRef) {
  fail("TEST_SUPABASE_PROJECT_REF aponta para o projeto de produção e foi recusado.");
}
if (productionDatabaseUrl && databaseFingerprint(testDatabaseUrl) === databaseFingerprint(productionDatabaseUrl)) {
  fail("TEST_SUPABASE_DB_URL coincide com a conexão de produção e foi recusado.");
}
if (productionSupabaseUrl && testSupabaseUrl === productionSupabaseUrl) {
  fail("TEST_SUPABASE_URL coincide com a URL de produção e foi recusada.");
}

const testRunId = crypto.randomUUID();
const testEmailSuffix = testRunId.replaceAll("-", "");
const fixture = { orderId: null, eventId: null, registrationId: null, userIds: [] };
const supabase = createClient(testSupabaseUrl, testServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function connect() {
  const connectionUrl = new URL(testDatabaseUrl);
  const { address } = await lookup(connectionUrl.hostname, { family: 4 });
  connectionUrl.hostname = address;
  const client = new Client({ connectionString: connectionUrl.toString(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

async function connectAs(profileId) {
  const client = await connect();
  await client.query("select set_config('request.jwt.claim.sub', $1, false)", [profileId]);
  await client.query("set role authenticated");
  return client;
}

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function createTestUser(label, role) {
  const email = `qr-${label}-${testEmailSuffix}@integration.invalid`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: `Teste QR ${label}` },
  });
  if (error || !data.user) fail(`Não foi possível criar o usuário de teste ${label}.`);
  fixture.userIds.push(data.user.id);
  return { id: data.user.id, email, role };
}

async function seedFixtures(client, pickupOperator, checkInOperator) {
  await client.query("update public.profiles set role = $2 where id = $1", [pickupOperator.id, pickupOperator.role]);
  await client.query("update public.profiles set role = $2 where id = $1", [checkInOperator.id, checkInOperator.role]);

  const orderResult = await client.query(
    `insert into public.orders (status, fulfillment, customer_name, subtotal_cents, total_cents)
     values ('em_preparo', 'retirada', 'Teste integração QR', 0, 0) returning id`,
  );
  fixture.orderId = orderResult.rows[0].id;
  await client.query("update public.orders set status = 'pronto', ready_at = now() where id = $1", [fixture.orderId]);
  const pickupResult = await client.query(
    "select pickup_qr_token from public.orders where id = $1",
    [fixture.orderId],
  );
  assert.ok(pickupResult.rows[0]?.pickup_qr_token, "O trigger deve gerar token opaco ao preparar retirada.");

  const eventResult = await client.query(
    `insert into public.events (title, slug, status, requires_registration, registration_price_cents)
     values ($1, $2, 'em_andamento', true, 0) returning id`,
    ["Evento teste de concorrência QR", `event-qr-${testEmailSuffix}`],
  );
  fixture.eventId = eventResult.rows[0].id;
  const registrationResult = await client.query(
    `insert into public.event_registrations (event_id, customer_id, attendee_name, attendee_email, amount_cents, status, check_in_code)
     values ($1, $2, 'Participante de teste', $3, 0, 'confirmada', $4) returning id, check_in_code`,
    [fixture.eventId, pickupOperator.id, pickupOperator.email, `CHK${testEmailSuffix.slice(0, 10).toUpperCase()}`],
  );
  fixture.registrationId = registrationResult.rows[0].id;
  await client.query(
    `insert into public.event_tickets (registration_id, event_id, recipient_profile_id, status)
     values ($1, $2, $3, 'emitido')`,
    [fixture.registrationId, fixture.eventId, pickupOperator.id],
  );

  return {
    pickupToken: pickupResult.rows[0].pickup_qr_token,
    checkInCode: registrationResult.rows[0].check_in_code,
  };
}

async function runBlockedPair(lockClient, lockSql, lockId, actionA, actionB) {
  await lockClient.query("begin");
  await lockClient.query(lockSql, [lockId]);
  let settled = 0;
  const track = (promise) => promise.finally(() => {
    settled += 1;
  });
  const first = track(actionA());
  const second = track(actionB());
  await pause(150);
  assert.equal(settled, 0, "As duas RPCs devem aguardar o bloqueio FOR UPDATE.");
  await lockClient.query("commit");
  return Promise.all([first, second]);
}

async function verifyPickupConcurrency(seedClient, pickupOperator, pickupToken) {
  const lockClient = await connect();
  const workerA = await connectAs(pickupOperator.id);
  const workerB = await connectAs(pickupOperator.id);
  try {
    const [first, second] = await runBlockedPair(
      lockClient,
      "select id from public.orders where id = $1 for update",
      fixture.orderId,
      () => workerA.query("select * from public.confirm_order_pickup_by_qr($1, $2)", [fixture.orderId, pickupToken]),
      () => workerB.query("select * from public.confirm_order_pickup_by_qr($1, $2)", [fixture.orderId, pickupToken]),
    );
    const results = [first.rows[0], second.rows[0]];
    assert.equal(results.filter((row) => row.already_picked_up === false).length, 1, "Uma única chamada deve efetivar a retirada.");
    assert.equal(results.filter((row) => row.already_picked_up === true).length, 1, "A releitura concorrente deve ser idempotente.");

    const state = await seedClient.query(
      "select status, picked_up_at, picked_up_by, pickup_qr_token, pickup_qr_expires_at from public.orders where id = $1",
      [fixture.orderId],
    );
    assert.equal(state.rows[0].status, "entregue");
    assert.ok(state.rows[0].picked_up_at);
    assert.equal(state.rows[0].picked_up_by, pickupOperator.id);
    assert.equal(state.rows[0].pickup_qr_token, null);
    assert.equal(state.rows[0].pickup_qr_expires_at, null);

    const history = await seedClient.query(
      "select count(*)::int as total from public.order_status_history where order_id = $1 and status = 'entregue'",
      [fixture.orderId],
    );
    assert.equal(history.rows[0].total, 1, "A retirada concorrente deve gravar um único evento final.");
  } finally {
    await Promise.allSettled([lockClient.end(), workerA.end(), workerB.end()]);
  }
}

async function verifyCheckInConcurrency(seedClient, checkInOperator, checkInCode) {
  const lockClient = await connect();
  const workerA = await connectAs(checkInOperator.id);
  const workerB = await connectAs(checkInOperator.id);
  try {
    const [first, second] = await runBlockedPair(
      lockClient,
      "select id from public.event_registrations where id = $1 for update",
      fixture.registrationId,
      () => workerA.query("select * from public.check_in_event_ticket($1)", [checkInCode]),
      () => workerB.query("select * from public.check_in_event_ticket($1)", [checkInCode]),
    );
    const results = [first.rows[0], second.rows[0]];
    assert.equal(results.filter((row) => row.already_checked_in === false).length, 1, "Uma única chamada deve efetivar o check-in.");
    assert.equal(results.filter((row) => row.already_checked_in === true).length, 1, "A releitura concorrente deve ser idempotente.");

    const registration = await seedClient.query(
      "select status, checked_in_at, checked_in_by from public.event_registrations where id = $1",
      [fixture.registrationId],
    );
    assert.equal(registration.rows[0].status, "check_in_realizado");
    assert.ok(registration.rows[0].checked_in_at);
    assert.equal(registration.rows[0].checked_in_by, checkInOperator.id);
    const ticket = await seedClient.query(
      "select status, used_at from public.event_tickets where registration_id = $1",
      [fixture.registrationId],
    );
    assert.equal(ticket.rows[0].status, "usado");
    assert.ok(ticket.rows[0].used_at);
  } finally {
    await Promise.allSettled([lockClient.end(), workerA.end(), workerB.end()]);
  }
}

async function cleanup(client) {
  if (fixture.orderId) await client.query("delete from public.orders where id = $1", [fixture.orderId]);
  if (fixture.registrationId) await client.query("delete from public.event_registrations where id = $1", [fixture.registrationId]);
  if (fixture.eventId) await client.query("delete from public.events where id = $1", [fixture.eventId]);
  await Promise.all(
    fixture.userIds.map(async (id) => {
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) throw error;
    }),
  );
}

const seedClient = await connect();
try {
  const pickupOperator = await createTestUser("retirada", "cozinha");
  const checkInOperator = await createTestUser("checkin", "caixa");
  const { pickupToken, checkInCode } = await seedFixtures(seedClient, pickupOperator, checkInOperator);
  await verifyPickupConcurrency(seedClient, pickupOperator, pickupToken);
  await verifyCheckInConcurrency(seedClient, checkInOperator, checkInCode);
  console.log("[qr-concurrency] Aprovado: retirada e check-in mantiveram unicidade sob duas chamadas simultâneas.");
} finally {
  try {
    await cleanup(seedClient);
  } finally {
    await seedClient.end();
  }
}
