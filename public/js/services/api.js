export class ApiError extends Error {
  constructor(status, details) {
    super('Permintaan gagal');
    this.status = status;
    this.details = details;
  }
}

async function postJson(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new ApiError(response.status, Array.isArray(data?.details) ? data.details : []);
  }
  return data;
}

export function matchDevice(device) {
  return postJson('/api/match', device);
}

export function lookupGpu(renderer) {
  return postJson('/api/gpu', { renderer });
}
