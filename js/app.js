(() => {
	'use strict';

	const DISCORD_ID = '352142218527768576';
	const GH_USER = 'Leonidariogamer';
	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const $ = (sel, root = document) => root.querySelector(sel);
	const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

	/* ---------- Title: split into letters (label stays on the h1) ---------- */
	const h1 = $('#name');
	if (h1) {
		const text = h1.textContent;
		h1.textContent = '';
		[...text].forEach((ch, i) => {
			const s = document.createElement('span');
			s.className = 'ch';
			s.setAttribute('aria-hidden', 'true');
			s.style.setProperty('--i', i);
			s.textContent = ch;
			h1.append(s);
		});
	}

	/* ---------- Tabs ---------- */
	const tabs = $$('[role="tab"]');
	const mark = $('#tabmark');
	const pose = $('#pose');
	const ring = $('#ring');
	const sweep = $('#sweep');
	const order = tabs.map(t => t.id.replace('tab-', ''));
	let current = 'status';
	let initialised = false;

	function paint(name) {
		tabs.forEach(t => {
			const on = t.id === `tab-${name}`;
			t.setAttribute('aria-selected', on);
			t.tabIndex = on ? 0 : -1;
			if (on) t.append(mark);
		});
		$$('.panel').forEach(p => {
			const on = p.id === `panel-${name}`;
			p.hidden = !on;
			p.classList.toggle('is-entering', on);
		});
		const active = $(`#tab-${name}`);
		if (pose) pose.textContent = active.dataset.pose;
		const idx = order.indexOf(name);
		if (initialised) $$('.guides .draw').forEach(el => { el.style.animation = 'none'; void el.getBoundingClientRect(); el.style.animation = 'draw .8s cubic-bezier(.16,1,.3,1) both'; });
		initialised = true;
		if (ring) ring.style.setProperty('--turn', `${idx * 120}deg`);
	}

	const EASE = 'cubic-bezier(.16,1,.3,1)';
	const panelsEl = $('#panels');
	let seq = 0;

	function runSweep(forward) {
		if (!sweep || !sweep.animate) return;
		const w = panelsEl.clientWidth;
		const from = forward ? 0 : w, to = forward ? w : 0;
		sweep.animate(
			[{ transform: `translateX(${from}px)`, opacity: 1 }, { transform: `translateX(${to}px)`, opacity: 1, offset: .9 }, { transform: `translateX(${to}px)`, opacity: 0 }],
			{ duration: 700, easing: 'cubic-bezier(.65,0,.35,1)' }
		);
	}

	// 1) old content fades out  2) swap  3) box eases to the new height while the new content staggers in
	async function show(name, { focus = false, push = true } = {}) {
		if (!order.includes(name) || name === current) {
			if (focus) $(`#tab-${name}`)?.focus();
			return;
		}
		const forward = order.indexOf(name) > order.indexOf(current);
		current = name;
		const mine = ++seq;
		if (focus) $(`#tab-${name}`).focus();
		if (push) history.replaceState(null, '', `#${name}`);

		if (reduceMotion.matches || !panelsEl.animate) { paint(name); return; }

		const old = $('.panel:not([hidden])');
		const h0 = panelsEl.offsetHeight;
		const markFrom = mark.getBoundingClientRect();
		runSweep(forward);
		await old.animate(
			[{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${forward ? -18 : 18}px)` }],
			{ duration: 170, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }
		).finished.catch(() => {});
		if (mine !== seq) return; // a newer click took over
		paint(name);
		old.getAnimations().forEach(an => an.cancel());

		const h1 = panelsEl.offsetHeight;
		if (h0 !== h1) panelsEl.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 650, easing: EASE });
		const markTo = mark.getBoundingClientRect();
		mark.animate(
			[{ transform: `translateX(${markFrom.left - markTo.left}px) scaleX(${markFrom.width / markTo.width})`, transformOrigin: 'left' }, { transform: 'none', transformOrigin: 'left' }],
			{ duration: 550, easing: EASE }
		);
	}

	tabs.forEach(t => t.addEventListener('click', () => show(t.id.replace('tab-', ''))));
	$('#tablist').addEventListener('keydown', e => {
		const i = tabs.indexOf(document.activeElement);
		if (i < 0) return;
		let n = null;
		if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
		else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
		else if (e.key === 'Home') n = 0;
		else if (e.key === 'End') n = tabs.length - 1;
		if (n === null) return;
		e.preventDefault();
		show(order[n], { focus: true });
	});

	const fromHash = () => {
		const h = location.hash.slice(1);
		if (order.includes(h)) { show(h, { push: false }); }
	};
	window.addEventListener('hashchange', fromHash);
	if (order.includes(location.hash.slice(1)) && location.hash.slice(1) !== 'status') {
		current = 'status';
		const startName = location.hash.slice(1);
		paint(startName); current = startName;
	}

	/* ---------- Portrait tilt ---------- */
	const tilt = $('#tilt');
	if (tilt && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
		let raf = 0;
		window.addEventListener('pointermove', e => {
			if (reduceMotion.matches) return;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const r = tilt.getBoundingClientRect();
				const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
				const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
				tilt.style.setProperty('--ry', `${(dx * 14).toFixed(2)}deg`);
				tilt.style.setProperty('--rx', `${(-dy * 14).toFixed(2)}deg`);
			});
		}, { passive: true });
	}

	/* ---------- Music: YouTube player API, starts muted, unmutes low on first interaction ---------- */
	const VIDEO = 'eyFfubvho4M'; // Windows96 (the artist's own upload)
	const card = $('#music-card'), mPlay = $('#m-play'), mOpen = $('#m-open'), mMore = $('#music-more'), mVol = $('#m-vol'), mHint = $('#m-hint');
	const store = {
		get: k => { try { return localStorage.getItem(k); } catch { return null; } },
		set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } }
	};
	const optedOut = store.get('music') === 'off'; // someone who paused it last time isn't autoplayed again
	let yt, vol = Number(store.get('vol') ?? 15), muted = true;
	mVol.value = vol;

	const hint = t => { mHint.textContent = t; };
	function setState(s) {
		card.dataset.state = s;
		mPlay.setAttribute('aria-label', s === 'playing' ? 'Pause music' : 'Play music');
		if (s === 'playing' && muted) hint('Playing muted. Click anywhere to hear it at low volume.');
		else if (s === 'playing') hint('');
		else if (s === 'paused') hint('Paused.');
	}
	let gestured = false; // the visitor has clicked or pressed a key somewhere on the page
	function unmute() {
		if (!yt || !yt.unMute) return;
		yt.unMute(); yt.setVolume(vol); muted = false;
		if (card.dataset.state === 'playing') hint('');
		// YouTube sometimes drops the first unmute: check that it stuck
		setTimeout(() => { if (yt.isMuted && yt.isMuted()) { yt.unMute(); yt.setVolume(vol); } }, 500);
	}

	mOpen.addEventListener('click', () => {
		const open = mOpen.getAttribute('aria-expanded') !== 'true';
		mOpen.setAttribute('aria-expanded', open);
		mMore.inert = !open;
	});
	mPlay.addEventListener('click', () => {
		if (!yt) return;
		if (card.dataset.state === 'playing') { yt.pauseVideo(); store.set('music', 'off'); }
		else { unmute(); yt.playVideo(); store.set('music', 'on'); }
	});
	mVol.addEventListener('input', () => {
		vol = Number(mVol.value); store.set('vol', vol);
		if (yt) { yt.setVolume(vol); if (vol > 0 && muted) unmute(); }
	});
	// browsers only allow sound after a gesture: the first click or key anywhere unmutes it
	const firstGesture = e => {
		if (e.target.closest && e.target.closest('.music')) return;
		if (optedOut || !muted) return;
		gestured = true; // remembered even if the player isn't ready yet, onReady / onStateChange finish the job
		if (yt && yt.unMute) { unmute(); if (card.dataset.state !== 'playing') yt.playVideo(); }
	};
	['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, firstGesture, { capture: true }));

	window.onYouTubeIframeAPIReady = () => {
		yt = new YT.Player('yt', {
			videoId: VIDEO, width: '100%', height: '100%',
			playerVars: { autoplay: optedOut ? 0 : 1, mute: 1, controls: 0, disablekb: 1, loop: 1, playlist: VIDEO, playsinline: 1, rel: 0, modestbranding: 1 },
			events: {
				onReady: e => { e.target.setVolume(vol); e.target.mute(); if (!optedOut) { e.target.playVideo(); if (gestured) unmute(); } else setState('paused'); },
				onError: e => { setState('paused'); hint(e.data === 153 ? 'YouTube won’t play on pages opened as local files. It works once the site is online (or served locally).' : 'YouTube refused to play this (error ' + e.data + '). Use the Bandcamp link below.'); console.warn('YouTube player error', e.data); },
				onStateChange: e => { setState(e.data === 1 ? 'playing' : e.data === 2 ? 'paused' : card.dataset.state); if (e.data === 1 && gestured && muted && !optedOut) unmute(); }
			}
		});
	};
	const ytApi = document.createElement('script');
	ytApi.src = 'https://www.youtube.com/iframe_api';
	ytApi.async = true;
	document.head.append(ytApi);

	/* ---------- Background: flowing sketch lines + floating stickers ---------- */
	const bg = $('.bg');
	const STICKERS = [
		'<circle cx="12" cy="16" r="5"/><circle cx="5" cy="9" r="2.4"/><circle cx="10" cy="4.5" r="2.4"/><circle cx="16" cy="4.5" r="2.4"/><circle cx="20" cy="9" r="2.4"/>', // paw
		'<path d="M12 2l3 7 7 .6-5.3 4.6 1.7 7.3L12 17.8 5.6 21.5l1.7-7.3L2 9.6 9 9z"/>', // star
		'<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.8-8 11-8 11z"/>', // heart
		'<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.2" fill="#2A160E"/><circle cx="15" cy="10" r="1.2" fill="#2A160E"/><path d="M8 14.5c2 2.4 6 2.4 8 0" fill="none"/>', // smiley
		'<path d="M4 12l8-9 8 9-8 9z"/>' // diamond
	];
	const FILLS = ['var(--paper)', 'var(--amber-deep)', 'var(--red)', 'var(--paper-2)'];
	for (let i = 0; i < 14; i++) {
		const r = n => Math.abs(Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1; // stable pseudo-random
		const left = i % 2 === 0;
		const w = document.createElement('span');
		w.className = 'stk';
		w.setAttribute('aria-hidden', 'true');
		const st = w.style;
		st.setProperty('--x', (left ? 1 + r(1) * 9 : 89 + r(1) * 8).toFixed(1) + '%');
		st.setProperty('--y', ((i / 14) * 92 + r(2) * 6).toFixed(1) + '%');
		st.setProperty('--s', (54 + r(3) * 56).toFixed(0) + 'px');
		st.setProperty('--p', ((r(4) + .4) * 40 * (left ? 1 : -1)).toFixed(0));
		w.innerHTML = '<svg viewBox="0 0 24 24" style="--f:' + FILLS[i % FILLS.length] + ';--d:' + (9 + r(5) * 9).toFixed(1) + 's;--w:' + (-r(6) * 12).toFixed(1) + 's;--r0:' + (r(7) * 40 - 20).toFixed(0) + 'deg;--r1:' + (r(8) * 80 - 40).toFixed(0) + 'deg">' + STICKERS[i % STICKERS.length] + '</svg>';
		bg.append(w);
	}
	if (!reduceMotion.matches) {
		window.addEventListener('pointermove', e => {
			const s = bg.style;
			s.setProperty('--mx', (e.clientX / innerWidth - .5).toFixed(3));
			s.setProperty('--my', (e.clientY / innerHeight - .5).toFixed(3));
		}, { passive: true });

		// flow field: particles follow a slowly shifting sine field and leave fading pencil trails
		const cv = $('#flow'), cx = cv.getContext('2d');
		let W, H, parts = [], t = 0, ink = '#2A160E', px = -999, py = -999, raf = 0;
		const fit = () => {
			const dpr = Math.min(devicePixelRatio || 1, 1.25);
			W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
			cx.setTransform(dpr, 0, 0, dpr, 0, 0);
			parts = Array.from({ length: Math.min(180, Math.max(70, (innerWidth * innerHeight) / 11000 | 0)) }, () => spawn({}));
		};
		const spawn = p => { p.x = Math.random() * innerWidth; p.y = Math.random() * innerHeight; p.life = 120 + Math.random() * 220; return p; };
		window.addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; }, { passive: true });
		const frame = () => {
			t += .004;
			cx.globalCompositeOperation = 'destination-out';
			cx.fillStyle = 'rgba(0,0,0,.03)';
			cx.fillRect(0, 0, innerWidth, innerHeight);
			cx.globalCompositeOperation = 'source-over';
			cx.strokeStyle = ink; cx.globalAlpha = .5; cx.lineWidth = 1.6; cx.lineCap = 'round';
			cx.beginPath();
			for (const p of parts) {
				let a = (Math.sin(p.x * .0022 + t * 3) + Math.cos(p.y * .002 - t * 2.4) + Math.sin((p.x + p.y) * .0011 + t)) * 1.6;
				const dx = p.x - px, dy = p.y - py, d = dx * dx + dy * dy;
				if (d < 25000) a += Math.atan2(dy, dx) - a > 0 ? 1.4 : -1.4; // swirl away from the cursor
				const nx = p.x + Math.cos(a) * 1.8, ny = p.y + Math.sin(a) * 1.8;
				cx.moveTo(p.x, p.y); cx.lineTo(nx, ny);
				p.x = nx; p.y = ny;
				if (--p.life < 0 || nx < 0 || ny < 0 || nx > innerWidth || ny > innerHeight) spawn(p);
			}
			cx.stroke();
			cx.globalAlpha = 1;
			if ((t * 250 | 0) % 60 === 0) ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || ink;
			raf = requestAnimationFrame(frame);
		};
		fit();
		window.addEventListener('resize', fit);
		document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(frame); });
		raf = requestAnimationFrame(frame);
	}

	/* ---------- Works ---------- */
	const LANG_COLORS = { Python: '#3572A5', JavaScript: '#F1E05A', HTML: '#E34C26', CSS: '#7B52B6', Batchfile: '#C1F12E' };
	const REPOS = [
		{ name: 'FoxBot', lang: 'Python', stars: 1, desc: 'The source code of the bot that probably no one waited for.' },
		{ name: 'The-Trusty-Bot-Source-Code', lang: 'JavaScript', stars: 0, desc: 'The Trusty Discord bot source code.' },
		{ name: 'Gamble621', lang: 'HTML', stars: 0, desc: 'Were you ever bored on e6? Now you can gamble what you want to see using Gamble621.' },
		{ name: 'WindowsServerFreeVPS', lang: 'Batchfile', stars: 2, desc: 'No write-up yet, the batch file speaks for itself.' },
		{ name: 'Minty', lang: 'CSS', stars: 0, desc: "Minty's portfolio." }
	];

	const worksEl = $('#works-list');
	const starIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1z"/></svg>';

	function renderWorks() {
		worksEl.textContent = '';
		REPOS.forEach(r => {
			const li = document.createElement('li');
			li.className = 'work';
			const h3 = document.createElement('h3');
			const a = document.createElement('a');
			a.href = `https://github.com/${GH_USER}/${r.name}`;
			a.target = '_blank';
			a.rel = 'noopener';
			a.textContent = r.name;
			const sr = document.createElement('span');
			sr.className = 'sr';
			sr.textContent = ' (opens in a new tab)';
			a.append(sr);
			h3.append(a);
			const p = document.createElement('p');
			p.className = 'desc';
			p.textContent = r.desc;
			const meta = document.createElement('p');
			meta.className = 'meta';
			const lang = document.createElement('span');
			lang.className = 'lang';
			lang.style.setProperty('--lc', LANG_COLORS[r.lang] || '#2A160E');
			lang.textContent = r.lang;
			meta.append(lang);
			if (r.stars) {
				const st = document.createElement('span');
				st.className = 'stars';
				st.innerHTML = starIcon;
				const n = document.createElement('span');
				n.textContent = r.stars;
				st.append(n);
				const label = document.createElement('span');
				label.className = 'sr';
				label.textContent = r.stars === 1 ? 'star' : 'stars';
				st.append(label);
				meta.append(st);
			}
			li.append(h3, p, meta);
			worksEl.append(li);
		});
	}
	renderWorks();

	// Best-effort refresh of star counts and repo total from GitHub
	fetch(`https://api.github.com/users/${GH_USER}`)
		.then(r => r.ok ? r.json() : Promise.reject())
		.then(u => { if (Number.isInteger(u.public_repos)) $('#repo-count').textContent = u.public_repos; })
		.catch(() => {});
	fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100`)
		.then(r => r.ok ? r.json() : Promise.reject())
		.then(list => {
			let changed = false;
			REPOS.forEach(r => {
				const live = list.find(x => x.name === r.name);
				if (live && live.stargazers_count !== r.stars) { r.stars = live.stargazers_count; changed = true; }
			});
			if (changed) renderWorks();
		})
		.catch(() => {});

	/* ---------- Live Discord presence (Lanyard) ---------- */
	const now = $('#now');
	const word = $('#now-word');
	const userEl = $('#now-user');
	const acts = $('#acts');
	const STATE = {
		online: 'Online',
		idle: 'Idle',
		dnd: 'Do not disturb',
		offline: 'Offline'
	};
	let lastKey = '';

	const iconCache = {};
	function coverUrl(a) {
		const big = a.assets && a.assets.large_image;
		if (big && big.startsWith('mp:external/')) return Promise.resolve('https://media.discordapp.net/external/' + big.slice(12));
		if (big && a.application_id && /^\d+$/.test(big)) return Promise.resolve(`https://cdn.discordapp.com/app-assets/${a.application_id}/${big}.png?size=128`);
		if (!a.application_id) return Promise.resolve('');
		// no rich-presence art (most Steam games): fall back to the game's Discord application icon
		return iconCache[a.application_id] ||= fetch(`https://discord.com/api/v10/applications/${a.application_id}/rpc`)
			.then(r => r.ok ? r.json() : Promise.reject())
			.then(d => d.icon ? `https://cdn.discordapp.com/app-icons/${a.application_id}/${d.icon}.png?size=128` : '')
			.catch(() => '');
	}

	function addAct(kind, title, sub, art) {
		const li = document.createElement('li');
		if (art) art.then(u => {
			if (!u) return;
			const img = new Image();
			img.className = 'art';
			img.alt = title + ' cover';
			img.onload = () => { li.prepend(img); li.classList.add('has-art'); };
			img.src = u;
		});
		const s = document.createElement('strong');
		if (kind) {
			const k = document.createElement('span');
			k.className = 'verb';
			k.textContent = kind + ' ';
			s.append(k);
		}
		s.append(title);
		li.append(s);
		if (sub) {
			const d = document.createElement('span');
			d.textContent = sub;
			li.append(d);
		}
		acts.append(li);
	}

	/* ---------- Discord avatar -> portrait + palette ---------- */
	const pfp = $('.pfp');
	const root = document.documentElement.style;
	const NAMES = ['Main colour', 'Second colour', 'Third colour', 'Fourth colour', 'Fifth colour'];
	let avatarUrl = '';

	function toHsl([r, g, b]) {
		r /= 255; g /= 255; b /= 255;
		const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
		if (!d) return [0, 0, l];
		const s = d / (1 - Math.abs(2 * l - 1));
		const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
		return [h * 60, s, l];
	}
	const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
	const hex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

	function extract(img) {
		const N = 64, cv = document.createElement('canvas');
		cv.width = cv.height = N;
		const cx = cv.getContext('2d', { willReadFrequently: true });
		cx.drawImage(img, 0, 0, N, N);
		const px = cx.getImageData(0, 0, N, N).data, B = {};
		for (let i = 0; i < px.length; i += 4) {
			const p = i / 4, X = p % N, Y = (p / N) | 0;
			if (px[i + 3] < 200 || (X - 32) ** 2 + (Y - 32) ** 2 > 1000) continue;
			const k = (px[i] >> 4) << 8 | (px[i + 1] >> 4) << 4 | px[i + 2] >> 4;
			const b = B[k] ||= { n: 0, r: 0, g: 0, b: 0, x: 0, y: 0 };
			b.n++; b.r += px[i]; b.g += px[i + 1]; b.b += px[i + 2]; b.x += X; b.y += Y;
		}
		const all = Object.values(B).map(b => ({ rgb: [b.r / b.n, b.g / b.n, b.b / b.n], n: b.n, x: b.x / b.n / N * 100, y: b.y / b.n / N * 100 })).sort((a, b) => b.n - a.n);
		const out = [];
		for (const s of all) {
			if (out.every(o => Math.hypot(...o.rgb.map((v, i) => v - s.rgb[i])) > 70)) out.push(s);
			if (out.length === 5) break;
		}
		return out;
	}

	const html = document.documentElement;
	let lastSw = null;
	function theme(sw = lastSw) {
		if (!sw) return;
		lastSw = sw;
		const hs = sw.map(s => toHsl(s.rgb));
		const vivid = hs.map((h, i) => [h[1] * Math.sqrt(sw[i].n), i]).sort((a, b) => b[0] - a[0]);
		const g = hs[vivid[0][1]], hasColour = g[1] > .2;
		const gh = hasColour ? g[0] : 35, gs = hasColour ? Math.min(Math.max(g[1], .55), .9) : .55;
		const dark = hs.reduce((a, b) => b[2] < a[2] ? b : a), light = hs.reduce((a, b) => b[2] > a[2] ? b : a);
		const second = vivid.slice(1).map(v => hs[v[1]]).find(h => h[1] > .3 && Math.abs(h[0] - gh) > 30);
		const rh = second ? second[0] : (gh + 180) % 360;
		const ds = Math.min(dark[1], .5), ls = Math.min(light[1], .6), isDark = html.dataset.theme !== 'light';
		// lightness is clamped so text pairs keep AA contrast whatever the avatar looks like
		const v = {
			'--hi': hsl(gh, gs, .62), '--amber-deep': hsl(gh, gs, .5),
			'--red': hsl(rh, .7, rh > 40 && rh < 190 ? .27 : .36),
			'--card-fg': hsl(light[0], ls, .95)
		};
		if (isDark) Object.assign(v, {
			'--ground': hsl(gh, gs * .6, .12), '--ground-deep': hsl(gh, gs * .7, .19),
			'--hover': hsl(gh, gs * .45, .22), '--feature': hsl(gh, gs * .5, .21),
			'--card': hsl(dark[0], Math.min(dark[1], .3), .07),
			'--ink': hsl(light[0], Math.min(ls, .5), .93), '--ink-2': hsl(light[0], Math.min(ls, .35), .76),
			'--paper': hsl(dark[0], Math.min(ds, .3), .13), '--paper-2': hsl(dark[0], Math.min(ds, .3), .18)
		});
		else Object.assign(v, {
			'--ground': hsl(gh, gs, .62), '--ground-deep': hsl(gh, gs, .5),
			'--hover': hsl(gh, gs, .62), '--feature': hsl(gh, gs, .62),
			'--card': hsl(dark[0], ds, .1),
			'--ink': hsl(dark[0], ds, .1), '--ink-2': hsl(dark[0], Math.min(dark[1], .35), .3),
			'--paper': hsl(light[0], ls, .95), '--paper-2': hsl(light[0], ls, .89)
		});
		for (const k in v) root.setProperty(k, v[k]);
		const tc = $('meta[name="theme-color"]'); if (tc) tc.content = v['--ground'];
	}

	/* ---------- Theme toggle (dark by default) ---------- */
	const themeBtn = $('#theme');
	function paintToggle() { themeBtn.setAttribute('aria-label', html.dataset.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); }
	paintToggle();
	themeBtn.addEventListener('click', () => {
		const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
		const flip = () => { html.dataset.theme = next; theme(); paintToggle(); };
		try { localStorage.setItem('theme', next); } catch { /* storage blocked */ }
		if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(flip); else flip();
	});

	function applyAvatar(u) {
		if (!u || !u.avatar) return;
		const url = `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256`;
		if (url === avatarUrl) return;
		avatarUrl = url;
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			pfp.src = url;
			pfp.alt = 'Link_theFox’s current Discord avatar';
			try { // circular favicon: Discord avatars are square
				const f = document.createElement('canvas');
				f.width = f.height = 64;
				const fx = f.getContext('2d');
				fx.beginPath(); fx.arc(32, 32, 32, 0, 7); fx.clip();
				fx.drawImage(img, 0, 0, 64, 64);
				$('link[rel="icon"]').href = f.toDataURL();
			} catch { /* keep the static icon */ }
			try {
				const sw = extract(img);
				if (sw.length < 3) return;
				theme(sw);
				$$('.chip').forEach((chip, i) => {
					const s = sw[i], pin = $(`.pin[data-k="${chip.dataset.k}"]`);
					chip.hidden = pin.hidden = !s;
					if (!s) return;
					chip.style.setProperty('--c', hex(s.rgb));
					$('span', chip).textContent = NAMES[i];
					$('em', chip).textContent = hex(s.rgb);
					pin.style.setProperty('--x', s.x + '%'); pin.style.setProperty('--y', s.y + '%');
				});
			} catch { /* canvas blocked: keep image, keep default palette */ }
		};
		img.src = url;
	}

	function render(d) {
		applyAvatar(d.discord_user);
		const status = STATE[d.discord_status] ? d.discord_status : 'offline';
		const list = (d.activities || []).filter(a => a.type !== 4 && a.name !== 'Spotify');
		showWatching(list);
		const custom = (d.activities || []).find(a => a.type === 4);
		const key = JSON.stringify([status, d.spotify && d.spotify.song, list.map(a => [a.name, a.details, a.state]), custom && custom.state]);
		now.setAttribute('aria-busy', 'false');
		if (key === lastKey) return;
		lastKey = key;

		now.dataset.state = status;
		word.textContent = STATE[status];
		const u = d.discord_user;
		userEl.textContent = u ? `@${u.username}` : '';

		acts.textContent = '';
		if (custom && (custom.state || (custom.emoji && custom.emoji.name))) {
			addAct('', custom.state || custom.emoji.name);
		}
		if (d.listening_to_spotify && d.spotify) {
			addAct('Listening to', d.spotify.song, `${d.spotify.artist}`.replace(/;/g, ','), Promise.resolve(d.spotify.album_art_url));
		}
		list.forEach(a => {
			const verb = a.type === 0 ? 'Playing' : a.type === 1 ? 'Streaming' : a.type === 2 ? 'Listening to' : a.type === 3 ? 'Watching' : 'Doing';
			addAct(verb, a.name, [a.details, a.state].filter(Boolean).join(' · '), coverUrl(a));
		});
		if (!acts.children.length) {
			addAct('', status === 'offline' ? 'Not around right now.' : "Not doing anything right now.");
		}
	}

	const watching = $('#watching');
	function showWatching(list) {
		// PreMiD publishes YouTube as a Discord activity, which Lanyard passes through
		const yt = list.find(a => /^youtube/i.test(a.name));
		watching.textContent = yt ? [yt.details, yt.state].filter(Boolean).join(' \u00b7 ') + ' (YouTube, via PreMiD)' : 'Nothing on YouTube right now';
	}

	function unavailable() {
		watching.textContent = 'Can\u2019t tell right now';
		now.setAttribute('aria-busy', 'false');
		now.dataset.state = 'offline';
		word.textContent = 'Out of range';
		userEl.textContent = 'Can’t reach Discord right now.';
		acts.textContent = '';
		addAct('', 'Join the Discord instead', 'The invite is in Find me.');
	}

	fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`)
		.then(r => r.json())
		.then(j => j.success ? render(j.data) : unavailable())
		.catch(unavailable);

	let retry = 0;
	function live() {
		if (!('WebSocket' in window)) return;
		let ws, beat;
		try { ws = new WebSocket('wss://api.lanyard.rest/socket'); } catch { return; }
		ws.onmessage = e => {
			let m; try { m = JSON.parse(e.data); } catch { return; }
			if (m.op === 1) {
				beat = setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ op: 3 })), m.d.heartbeat_interval);
				ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
			} else if (m.op === 0 && m.d) {
				retry = 0;
				render(m.d);
			}
		};
		ws.onclose = () => {
			clearInterval(beat);
			retry = Math.min(retry + 1, 6);
			setTimeout(live, 1000 * 2 ** retry);
		};
	}
	live();
})();
