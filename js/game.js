/* Paw Catch: loaded on demand by app.js the first time the secret is found. */
(() => {
	'use strict';
	const dlg = document.getElementById('game'), cv = document.getElementById('game-cv'), cx = cv.getContext('2d');
	const startBtn = document.getElementById('game-start'), closeBtn = document.getElementById('game-close');
	const eScore = document.getElementById('g-score'), eBest = document.getElementById('g-best'), eLives = document.getElementById('g-lives'), live = document.getElementById('g-live');
	const W = cv.width, H = cv.height, R = 34;
	const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
	const store = {
		get: k => { try { return localStorage.getItem(k); } catch { return null; } },
		set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } }
	};

	let best = Number(store.get('pawbest') || 0), raf = 0, last = 0, running = false;
	let px, tx, score, lives, items, spawn, hurt, t;
	const keys = {};
	const face = new Image();
	face.src = document.querySelector('.pfp').src;
	eBest.textContent = best;

	const reset = () => { px = tx = W / 2; score = 0; lives = 3; items = []; spawn = 0; hurt = 0; t = 0; sync(); };
	const sync = () => { eScore.textContent = score; eLives.textContent = lives; };

	function drawPaw(x, y, s, fill) {
		cx.fillStyle = fill;
		cx.beginPath(); cx.arc(x, y + s * .25, s * .45, 0, 7); cx.fill();
		[[-.62, -.2], [-.22, -.55], [.22, -.55], [.62, -.2]].forEach(([dx, dy]) => { cx.beginPath(); cx.arc(x + dx * s, y + dy * s, s * .22, 0, 7); cx.fill(); });
	}
	function drawStar(x, y, s, fill) {
		cx.fillStyle = fill; cx.beginPath();
		for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * .45 : s; cx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
		cx.closePath(); cx.fill();
	}
	function drawBug(x, y, s, fill) {
		cx.strokeStyle = fill; cx.lineWidth = 3; cx.lineCap = 'round';
		for (let i = -1; i <= 1; i++) { cx.beginPath(); cx.moveTo(x - s * .6, y + i * s * .35); cx.lineTo(x + s * .6, y + i * s * .35 + i * 4); cx.stroke(); }
		cx.fillStyle = fill; cx.beginPath(); cx.ellipse(x, y, s * .55, s * .7, 0, 0, 7); cx.fill();
		cx.fillStyle = css('--card'); cx.beginPath(); cx.arc(x - s * .2, y - s * .2, 3, 0, 7); cx.arc(x + s * .2, y - s * .2, 3, 0, 7); cx.fill();
	}

	function step(dt) {
		t += dt;
		const dir = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
		if (dir) tx = Math.min(W - R, Math.max(R, tx + dir * 560 * dt));
		px += (tx - px) * Math.min(1, dt * 14);

		spawn -= dt;
		if (spawn <= 0) {
			const roll = Math.random();
			items.push({ x: R + Math.random() * (W - 2 * R), y: -30, v: 150 + Math.min(t * 5, 220) + Math.random() * 60, kind: roll < .22 ? 'bug' : roll < .3 ? 'star' : 'paw', s: 22 });
			spawn = Math.max(.32, .85 - t * .012);
		}
		for (const it of items) {
			it.y += it.v * dt;
			if (!it.done && Math.hypot(it.x - px, it.y - (H - 70)) < R + it.s * .7) {
				it.done = true;
				if (it.kind === 'bug') { lives--; hurt = .5; } else score += it.kind === 'star' ? 5 : 1;
				sync();
			}
		}
		items = items.filter(i => !i.done && i.y < H + 40);
		hurt = Math.max(0, hurt - dt);
		if (lives <= 0) end();
	}

	function draw() {
		cx.fillStyle = css('--card'); cx.fillRect(0, 0, W, H);
		cx.strokeStyle = 'rgba(120,170,230,.12)'; cx.lineWidth = 1;
		for (let x = 0; x <= W; x += 32) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke(); }
		for (let y = 0; y <= H; y += 32) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
		for (const it of items) (it.kind === 'bug' ? drawBug : it.kind === 'star' ? drawStar : drawPaw)(it.x, it.y, it.s, it.kind === 'bug' ? css('--red') : css('--hi'));
		// the fox
		cx.save();
		cx.translate(px, H - 70);
		if (hurt) cx.translate(Math.sin(t * 90) * 5, 0);
		cx.beginPath(); cx.arc(0, 0, R, 0, 7); cx.clip();
		if (face.complete && face.naturalWidth) cx.drawImage(face, -R, -R, R * 2, R * 2); else { cx.fillStyle = css('--hi'); cx.fill(); }
		cx.restore();
		cx.strokeStyle = hurt ? css('--red') : css('--card-fg'); cx.lineWidth = 3;
		cx.beginPath(); cx.arc(px, H - 70, R, 0, 7); cx.stroke();
	}

	function loop(ts) {
		if (!running) return;
		const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
		step(dt); draw();
		if (running) raf = requestAnimationFrame(loop);
	}

	let paused = false;
	function start() {
		if (paused) { paused = false; startBtn.hidden = true; running = true; last = performance.now(); raf = requestAnimationFrame(loop); return; }
		reset(); running = true; last = performance.now();
		startBtn.hidden = true;
		live.textContent = 'Game started.';
		raf = requestAnimationFrame(loop);
	}
	function end() {
		running = false; cancelAnimationFrame(raf); draw();
		if (score > best) { best = score; store.set('pawbest', best); eBest.textContent = best; }
		live.textContent = `Game over. You caught ${score}. Best ${best}.`;
		startBtn.textContent = 'Play again'; startBtn.hidden = false; startBtn.focus();
		cx.fillStyle = 'rgba(0,0,0,.55)'; cx.fillRect(0, 0, W, H);
		cx.fillStyle = css('--card-fg'); cx.textAlign = 'center';
		cx.font = '800 54px "Bricolage Grotesque", sans-serif'; cx.fillText('Game over', W / 2, H / 2 - 10);
		cx.font = '600 28px "Bricolage Grotesque", sans-serif'; cx.fillText(`${score} caught`, W / 2, H / 2 + 34);
	}
	function stop() { running = false; cancelAnimationFrame(raf); }

	startBtn.addEventListener('click', start);
	closeBtn.addEventListener('click', () => dlg.close());
	dlg.addEventListener('close', stop);
	dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); }); // backdrop click
	document.addEventListener('visibilitychange', () => { if (document.hidden && running) { stop(); paused = true; startBtn.textContent = 'Resume'; startBtn.hidden = false; } });
	window.addEventListener('keydown', e => { if (!dlg.open) return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(k)) { keys[k] = true; if (k.startsWith('Arrow')) e.preventDefault(); } });
	window.addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });
	const drag = e => { const r = cv.getBoundingClientRect(); tx = Math.min(W - R, Math.max(R, (e.clientX - r.left) / r.width * W)); };
	cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); drag(e); });
	cv.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') drag(e); });

	window.PawGame = {
		open() {
			face.src = document.querySelector('.pfp').src;
			reset(); running = false; paused = false; draw();
			startBtn.textContent = 'Start'; startBtn.hidden = false;
			live.textContent = '';
			dlg.showModal();
			startBtn.focus();
		}
	};
	reset(); draw();
})();
