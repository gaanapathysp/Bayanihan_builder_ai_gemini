// Empty base — all calls go through the Vite proxy so phone access via ngrok works
const BASE = ''

async function json(res) {
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function uploadBaseline(formData) {
  return json(await fetch(`${BASE}/uploads/baseline`, { method: 'POST', body: formData }))
}

export async function startClaim(body) {
  return json(await fetch(`${BASE}/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

export async function uploadDamage(claimId, formData) {
  return json(await fetch(`${BASE}/claims/${claimId}/damage`, { method: 'POST', body: formData }))
}

export async function getDossier(claimId) {
  return json(await fetch(`${BASE}/claims/${claimId}/dossier`))
}

export async function submitDecision(claimId, body) {
  return json(await fetch(`${BASE}/claims/${claimId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))
}
