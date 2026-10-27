// Timer only: no public HTTP endpoint can trigger a market refresh.
export const SLOTS = Object.freeze({
  '45 7 * * *': [[7, 45]],
  '45 13 * * *': [[13, 45]],
  '15 8,14 * * *': [[8, 15], [14, 15]],
  '45 8,14 * * *': [[8, 45], [14, 45]],
});

export function timerInputs(controller, now = Date.now()) {
  const stamp = new Date(controller.scheduledTime);
  if (!Number.isFinite(stamp.getTime()) || stamp.getUTCSeconds() || stamp.getUTCMilliseconds()
      || now < stamp.getTime() || now - stamp.getTime() > 3 * 60 * 60 * 1000
      || !SLOTS[controller.cron]?.some(([h, m]) => h === stamp.getUTCHours() && m === stamp.getUTCMinutes())) {
    throw new Error('Unapproved or stale timer event');
  }
  return { scheduler: 'cloudflare', scheduled_at: stamp.toISOString(), cron: controller.cron };
}

export async function dispatch(controller, token, fetcher = fetch, now = Date.now()) {
  const inputs = timerInputs(controller, now);
  if (!token) throw new Error('GITHUB_ACTIONS_TOKEN is missing');
  // Keep the destination and branch fixed; never log credentials or response bodies.
  const response = await fetcher('https://api.github.com/repos/Vignesh-S-GitHub/Next-Rate/actions/workflows/refresh-rates.yml/dispatches', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'NextRate-Cloudflare-Scheduler',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main', inputs }),
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  if (response.status !== 204) {
    // Recovery timers retry later. Do not blindly retry an ambiguous POST.
    throw new Error(`GitHub dispatch failed (${response.status})`);
  }
  console.log(JSON.stringify({ event: 'dispatch_accepted', ...inputs, status: 204 }));
}

export default {
  async scheduled(controller, env) {
    await dispatch(controller, env.GITHUB_ACTIONS_TOKEN);
  },
};
