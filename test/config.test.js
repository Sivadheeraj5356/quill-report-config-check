const test = require('node:test');
const assert = require('node:assert/strict');
const { check } = require('../config.js');
const codes = (r) => r.findings.map((f) => f.code);

test('flags metric with no tenant filter', () => {
  const r = check('metric | revenue | sum(payments.amount) tz=utc');
  assert.ok(codes(r).includes('NO_TENANT_FILTER'));
});

test('passes metric with tenant filter', () => {
  const r = check('metric | revenue | sum(payments.amount) where tenant_id = :tenant tz=utc');
  assert.ok(!codes(r).includes('NO_TENANT_FILTER'));
});

test('flags SQL interpolation', () => {
  const r = check('metric | revenue | select sum(amount) from payments where tenant_id = ${tenantId} tz=utc');
  assert.ok(codes(r).includes('SQL_INTERPOLATION_SUSPECT'));
});

test('flags missing timezone', () => {
  const r = check('metric | orders | count(orders.id) where tenant_id = :tenant');
  assert.ok(codes(r).includes('NO_TIMEZONE'));
});

test('flags report without freshness declaration', () => {
  const r = check('report | weekly revenue | metric revenue where tenant_id = :tenant tz=utc');
  assert.ok(codes(r).includes('NO_FRESHNESS'));
});

test('flags ambiguous metric definitions', () => {
  const r = check('metric | revenue | sum(payments.amount) where tenant_id = :t tz=utc\nmetric | revenue | sum(invoices.total) where tenant_id = :t tz=utc');
  assert.ok(codes(r).includes('AMBIGUOUS_METRIC'));
});

test('clean config passes', () => {
  const r = check('metric | revenue | sum(payments.amount) where tenant_id = :tenant tz=utc\nreport | weekly revenue | metric revenue where tenant_id = :tenant tz=utc refresh=daily');
  assert.deepEqual(codes(r), ['CONFIG_CLEAN']);
  assert.equal(r.stats.defs, 2);
});
