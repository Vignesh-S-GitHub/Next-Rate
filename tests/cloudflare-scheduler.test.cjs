const { test } = require('node:test');
const assert = require('node:assert/strict');
const modulePromise = import('../cloudflare/nextrate-scheduler/worker.mjs');
const now = Date.parse('2026-10-27T13:46:00Z');
const event = { scheduledTime: Date.parse('2026-10-27T13:45:00Z'), cron: '45 13 * * *' };

test('Cloudflare dispatch carries fixed destination, target time and timer provenance', async () => {
  const { dispatch } = await modulePromise;
  let calls = 0;
  await dispatch(event, 'test-token', async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.github.com/repos/Vignesh-S-GitHub/Next-Rate/actions/workflows/refresh-rates.yml/dispatches');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(JSON.parse(options.body), { ref: 'main', inputs: {
      scheduler: 'cloudflare', scheduled_at: '2026-10-27T13:45:00.000Z', cron: event.cron,
    }});
    return { status: 204 };
  }, now);
  assert.equal(calls, 1);
});

test('Missing secret and bad timer metadata fail before network access', async () => {
  const { dispatch } = await modulePromise;
  const noFetch = () => { throw new Error('unexpected request'); };
  await assert.rejects(dispatch(event, '', noFetch, now), /missing/);
  for (const bad of [
    { ...event, cron: '* * * * *' },
    { ...event, scheduledTime: now },
    { ...event, scheduledTime: event.scheduledTime + 1000 },
    { ...event, scheduledTime: NaN },
  ]) await assert.rejects(dispatch(bad, 'test-token', noFetch, now), /timer/);
  await assert.rejects(dispatch(event, 'test-token', noFetch, now + 4*3600000), /timer/);
  await assert.rejects(dispatch(event, 'test-token', noFetch, event.scheduledTime - 1), /timer/);
});

test('GitHub rejection never becomes success and never reveals credentials', async () => {
  const { dispatch } = await modulePromise;
  for (const status of [401, 403, 404, 422, 429, 500]) {
    await assert.rejects(dispatch(event, 'hidden-token', async () => ({ status }), now),
      error => error.message === `GitHub dispatch failed (${status})`);
  }
});

test('All six daily primary and recovery times are allowed', async () => {
  const { SLOTS, timerInputs } = await modulePromise;
  let slots = 0;
  for (const [cron, times] of Object.entries(SLOTS)) for (const [h, m] of times) {
    const scheduledTime = Date.UTC(2026, 9, 27, h, m);
    assert.equal(timerInputs({ cron, scheduledTime }, scheduledTime).cron, cron);
    slots++;
  }
  assert.equal(slots, 6);
});

test('Worker exposes a scheduled handler without an HTTP trigger', async () => {
  const { default: worker } = await modulePromise;
  assert.equal(typeof worker.scheduled, 'function');
  assert.equal(worker.fetch, undefined);
});
