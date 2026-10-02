// Records when Discord status flips to offline, so the site can show "last online".
// Runs from .github/workflows/last-seen.yml; writes status.json only on a change.
import { readFileSync, writeFileSync } from 'node:fs';

const ID = '352142218527768576';
let cur = process.env.FAKE_STATUS; // test hook
if (!cur) {
	const res = await fetch(`https://api.lanyard.rest/v1/users/${ID}`);
	const j = res.ok ? await res.json() : null;
	cur = j && j.success ? j.data.discord_status : null;
}
if (!cur) { console.log('Lanyard unreachable, leaving status.json alone'); process.exit(0); }

const next = cur === 'offline' ? 'offline' : 'online';
const prev = JSON.parse(readFileSync('status.json', 'utf8'));
if (prev.status === next) { console.log('no change:', next); process.exit(0); }

const lastOnline = next === 'offline' ? Math.floor(Date.now() / 1000) : prev.lastOnline;
writeFileSync('status.json', JSON.stringify({ status: next, lastOnline }) + '\n');
console.log('status ->', next);
