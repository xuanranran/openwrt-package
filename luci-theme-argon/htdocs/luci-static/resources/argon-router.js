'use strict';
'require baseclass';
'require ui';
'require rpc';
'require argon-menutree as tree';

// Track setInterval to prevent background timer leaks across SPA navigations
const _viewIntervals = (window.__argonViewIntervals || (window.__argonViewIntervals = new Map()));
(function hookIntervals() {
	if (window.__argonIntervalsHooked) return;
	window.__argonIntervalsHooked = true;
	const _si = window.setInterval, _ci = window.clearInterval;
	window.setInterval = function(fn, ms) {
		const id = _si.apply(window, arguments);
		_viewIntervals.set(id, { fn, ms, rest: Array.prototype.slice.call(arguments, 2), live: id });
		return id;
	};
	window.clearInterval = function(id) {
		const spec = _viewIntervals.get(id);
		_viewIntervals.delete(id);
		if (spec) return (spec.live == null) ? undefined : _ci.call(window, spec.live);
		return _ci.apply(window, arguments);
	};
})();

function pollTickId() {
	if (!L.Poll) return false;
	const running = (typeof L.Poll.active === 'function') ? L.Poll.active() : (L.Poll.timer != null);
	if (running && L.Poll.timer == null) return false;
	return running ? L.Poll.timer : null;
}

function clearViewIntervals() {
	const keep = pollTickId();
	if (keep === false) return;
	_viewIntervals.forEach((spec, id) => { if (id !== keep) window.clearInterval(id); });
}

function flushUciCache() {
	const uci = window.L && window.L.uci;
	if (!uci || typeof uci.unload !== 'function') return null;
	const state = uci.state;
	if (!state || typeof state !== 'object') return null;
	const names = state.values ? Object.keys(state.values) : [];
	if (!names.length) return null;
	try { uci.unload(names); }
	catch (e) {
		console.error('argon-router: uci.unload threw during cache flush', e);
		return null;
	}
	if (!window.L.network) return null;
	const refill = [ 'network', 'wireless', 'luci' ].filter((p) => names.indexOf(p) !== -1);
	if (!refill.length) return null;
	return uci.load(refill).catch((e) => {
		console.error('argon-router: reloading uci ' + refill.join(', ') + ' failed', e);
	});
}

let _expired = false;
function markExpired() {
	if (_expired) return;
	_expired = true;
	if (L.Poll && typeof L.Poll.stop === 'function') L.Poll.stop();
	clearViewIntervals();
}

function watchSession() {
	if (L.Request && typeof L.Request.addInterceptor === 'function') {
		L.Request.addInterceptor((xhr) => {
			try {
				if (xhr && xhr.status === 403 &&
				    xhr.getResponseHeader &&
				    xhr.getResponseHeader('X-LuCI-Login-Required') === 'yes') {
					markExpired();
				}
			} catch (e) {}
		});
	}
	if (rpc && typeof rpc.addInterceptor === 'function') {
		rpc.addInterceptor((msg) => {
			try {
				if (!msg || msg.jsonrpc !== '2.0') return;
				if (msg.error && msg.error.code && msg.error.message) {
					markExpired();
				}
			} catch (e) {}
		});
	}
}

function syncPollIndicator() {
	if (L.Poll && L.Poll.queue && L.Poll.queue.length === 0) {
		try { ui.hideIndicator('poll-status'); }
		catch (e) {}
	}
}
document.addEventListener('poll-stop', syncPollIndicator);

function discard(el) {
	try {
		const dom = window.L ? window.L.dom : null;
		if (!dom || typeof dom.content !== 'function') { el.remove(); return; }
		const bin = document.createElement('div');
		bin.appendChild(el);
		dom.content(bin, null);
	} catch (e) {
		el.remove();
	}
}

// Overview global helpers needed when navigating to Status -> Overview without page reload
function ensureOverviewHelpers() {
	if (typeof window.progressbar !== 'function') {
		window.progressbar = function(query, value, max, byte) {
			var pg = document.querySelector(query),
			    vn = parseInt(value) || 0,
			    mn = parseInt(max) || 100,
			    fv = byte ? String.format('%1024.2mB', value) : value,
			    fm = byte ? String.format('%1024.2mB', max) : max,
			    pc = Math.floor((100 / mn) * vn),
			    reading = '%s / %s (%d%%)'.format(fv, fm, pc);
			if (pg && pg.firstElementChild) {
				pg.firstElementChild.style.width = pc + '%';
				pg.setAttribute('title', reading);
			}
		};
	}
	if (typeof window.renderBox !== 'function') {
		window.renderBox = function(title, active, childs) {
			childs = childs || [];
			if (window.L && window.L.itemlist) {
				childs.unshift(window.L.itemlist(E('span'), [].slice.call(arguments, 3)));
			}
			return E('div', { class: 'ifacebox' }, [
				E('div', { class: 'ifacebox-head center ' + (active ? 'active' : '') },
					E('strong', [title])),
				E('div', { class: 'ifacebox-body left' }, childs)
			]);
		};
	}
	if (typeof window.renderBadge !== 'function') {
		window.renderBadge = function(icon, title) {
			return E('span', { class: 'ifacebadge' }, [
				E('img', { src: icon, title: title || '' }),
				(window.L && window.L.itemlist) ? window.L.itemlist(E('span'), [].slice.call(arguments, 2)) : ''
			]);
		};
	}
}

// Staging and Observation
const RENDER_TIMEOUT = 15000;
let _inflight = Promise.resolve();

function getContentHost() {
	const live = document.getElementById('view');
	if (live && live.parentNode) return live.parentNode;
	return document.querySelector('#maincontent > .container') || document.querySelector('#maincontent');
}

function stageView(contentHost) {
	if (contentHost && window.getComputedStyle(contentHost).position === 'static') {
		contentHost.style.position = 'relative';
	}
	const wrapper = document.createElement('div');
	wrapper.className = 'argon-staging';
	wrapper.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 0; max-height: 0; overflow: hidden; visibility: hidden; pointer-events: none; opacity: 0; z-index: -9999; margin: 0; padding: 0; border: none;';
	const view = document.createElement('div');
	view.id = 'view';
	view.style.cssText = 'margin: 0; padding: 0; border: none; width: 100%;';
	wrapper.appendChild(view);
	contentHost.insertBefore(wrapper, contentHost.firstChild);
	return { wrapper, view };
}

function renderedIn(view) {
	const painted = () => view.querySelector(':scope > :not(.spinning):not(script)') !== null;
	if (painted()) return Promise.resolve();
	return new Promise((resolve, reject) => {
		const timer = window.setTimeout(() => {
			finish(() => reject(new Error('argon-router: view did not render within ' + RENDER_TIMEOUT + ' ms')));
		}, RENDER_TIMEOUT);
		const mo = new MutationObserver(() => {
			if (painted() || view.childElementCount === 0) finish(resolve);
		});
		function finish(settle) {
			window.clearTimeout(timer);
			mo.disconnect();
			settle();
		}
		mo.observe(view, { childList: true });
	});
}

function dropStage(stage) {
	if (stage && stage.wrapper && stage.wrapper.parentNode) discard(stage.wrapper);
}

function sweepAround(contentHost, rsegs) {
	const isOverview = rsegs && rsegs.join('-') === 'admin-status-overview';
	Array.from(contentHost.children).forEach((c) => {
		if (c.id !== 'view' && c.id !== 'tabmenu' && !c.classList.contains('argon-staging') &&
		    !c.classList.contains('alert-message') && c.nodeName !== 'NOSCRIPT' &&
		    !(isOverview && c.nodeName === 'H2' && c.getAttribute('name') === 'content'))
			discard(c);
	});
}

function liveView(contentHost, stage) {
	for (const el of contentHost.querySelectorAll(':scope > #view'))
		if (el !== stage.view) return el;
	const v = document.createElement('div');
	v.id = 'view';
	contentHost.appendChild(v);
	return v;
}

function commitStage(stage, contentHost, rsegs) {
	sweepAround(contentHost, rsegs);
	const live = liveView(contentHost, stage);
	const nodes = Array.from(stage.view.childNodes);
	const dom = window.L ? window.L.dom : null;
	if (live && dom && typeof dom.content === 'function')
		dom.content(live, nodes);
	else if (live)
		live.replaceChildren(...nodes);

	if (rsegs && rsegs.join('-') === 'admin-status-overview') {
		let h2 = contentHost.querySelector('h2[name="content"]');
		if (!h2) {
			h2 = document.createElement('h2');
			h2.setAttribute('name', 'content');
			const fn = window._ || (typeof _ === 'function' ? _ : null);
			h2.textContent = fn ? fn('Status') : 'Status';
			contentHost.insertBefore(h2, live);
		}
	}

	renderMenu();
	dropStage(stage);
}

// Nav progress indicator (Argon primary color)
const PROGRESS_DELAY = 150;
let _progressPending = 0;
let _progressTimer = 0;
function progressBar() {
	let bar = document.getElementById('argon-nav-progress');
	if (!bar) {
		bar = document.createElement('div');
		bar.id = 'argon-nav-progress';
		bar.setAttribute('aria-hidden', 'true');
		bar.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 99999; background: var(--primary, #5e72e4); opacity: 0; transition: opacity 0.2s, transform 0.3s ease-out; transform: scaleX(0); transform-origin: left; pointer-events: none; box-shadow: 0 0 8px rgba(94, 114, 228, 0.6);';
		document.body.insertBefore(bar, document.body.firstChild);
	}
	return bar;
}
function progressStart() {
	_progressPending++;
	window.clearTimeout(_progressTimer);
	_progressTimer = window.setTimeout(() => {
		const bar = progressBar();
		bar.style.opacity = '1';
		bar.style.transform = 'scaleX(0.7)';
	}, PROGRESS_DELAY);
}
function progressEnd() {
	if (--_progressPending > 0) return;
	_progressPending = 0;
	window.clearTimeout(_progressTimer);
	const bar = progressBar();
	bar.style.transform = 'scaleX(1)';
	_progressTimer = window.setTimeout(() => {
		bar.style.opacity = '0';
		window.setTimeout(() => {
			bar.style.transform = 'scaleX(0)';
		}, 200);
	}, 200);
}

// Prefetching logic
function moduleUrl(className) {
	const v = L.env.resource_version ? ('?v=' + L.env.resource_version) : '';
	return (L.env.base_url || '') + '/' + className.replace(/\./g, '/') + '.js' + v;
}

const PRAGMA_HEAD = 2000;
const PREFETCH_DEPTH = 3;

function pragmaDeps(src) {
	const re = /(['"])require[ \t]+([^'"]+?)\1/g;
	const head = src.slice(0, PRAGMA_HEAD);
	const out = [];
	let m;
	while ((m = re.exec(head)))
		out.push(m[2].split(/[ \t]+as[ \t]+/)[0]);
	return out;
}

function classLoaded(name) {
	if (name.indexOf('.') < 0) return true;
	try {
		let ptr = window.L;
		for (const part of name.split('.')) {
			ptr = ptr[part];
			if (ptr == null) return false;
		}
		return ptr instanceof window.L.Class;
	} catch (e) { return false; }
}

const _seenClasses = new Set();
const _prefetched = new Set();
const _warming = new Map();
const _committed = new Set();

function warmClass(name, depth, root) {
	if (_prefetched.has(name)) return;
	_prefetched.add(name);
	if (classLoaded(name)) return;
	let req;
	try { req = fetch(moduleUrl(name), { credentials: 'same-origin' }); }
	catch (e) { return; }
	const body = req.then((res) => (res.ok ? res.text() : '')).catch(() => '');
	_warming.set(name, body.then(() => {}, () => {}));
	if (depth < PREFETCH_DEPTH)
		body.then((src) => {
			if (_committed.has(root)) return;
			for (const d of pragmaDeps(src)) warmClass(d, depth + 1, root);
		});
}

function prefetchSegs(segs) {
	if (!Array.isArray(segs) || !segs.length) return;
	const res = tree.resolveSegs(segs);
	const className = tree.viewClassFor(res && res.node);
	if (className) warmClass(className, 0, className);
}

function prefetchView(pathname) {
	const segs = tree.segsFromPath(pathname);
	if (segs) prefetchSegs(segs);
}

const WARM_WAIT_MS = 5000;
function warmedThen(className) {
	_committed.add(className);
	const body = _warming.get(className);
	if (!body) return Promise.resolve();
	let t = 0;
	return Promise.race([ body, new Promise((r) => { t = window.setTimeout(r, WARM_WAIT_MS); }) ])
		.finally(() => window.clearTimeout(t));
}

// Scroll restoration
const _scrollMem = new Map();
const _scrollSess = Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
let _histN = 0;
let _curId = null;
const SCROLL_MEM_MAX = 50;
let _pendingRestore = null;

function newEntryId() { return _scrollSess + ':' + (++_histN); }

function adoptEntry() {
	const st = history.state;
	if (st && st.argonid) { _curId = st.argonid; return; }
	_curId = newEntryId();
	try { history.replaceState(Object.assign({}, st, { argonid: _curId }), '', window.location.href); } catch (e) {}
}

function saveScroll() {
	if (!_curId) return;
	_scrollMem.delete(_curId);
	_scrollMem.set(_curId, Math.round(window.scrollY) || 0);
	while (_scrollMem.size > SCROLL_MEM_MAX)
		_scrollMem.delete(_scrollMem.keys().next().value);
}

function restoreScroll(pos, gen) {
	if (!pos) return;
	const until = Date.now() + 5000;
	let cancelled = false;
	const stop = () => { cancelled = true; off(); };
	const opts = { passive: true, capture: true };
	function off() {
		window.removeEventListener('wheel', stop, opts);
		window.removeEventListener('touchstart', stop, opts);
		window.removeEventListener('keydown', stop, opts);
	}
	window.addEventListener('wheel', stop, opts);
	window.addEventListener('touchstart', stop, opts);
	window.addEventListener('keydown', stop, opts);

	(function tick() {
		if (cancelled) return;
		if (gen !== _navGen || Date.now() > until) { off(); return; }
		const de = document.documentElement;
		if (de.scrollHeight - de.clientHeight >= pos) {
			window.scrollTo(0, pos);
			off();
		} else {
			requestAnimationFrame(tick);
		}
	})();
}

// Host & Menu rendering for Argon
let _titleHost = null;
function titleHost() {
	if (_titleHost === null) {
		const brand = document.querySelector('.main-left .brand') || document.querySelector('header .brand');
		_titleHost = (brand ? brand.textContent.trim() : (document.title.split('-')[0] || '').trim()) || 'OpenWrt';
	}
	return _titleHost;
}

let _maInstance = null;
function renderMenu() {
	const treeData = tree.tree();
	if (!treeData) return;

	const tabmenu = document.querySelector('#tabmenu');
	const modemenu = document.querySelector('#modemenu');
	const mainmenu = document.querySelector('#mainmenu');

	const doRender = (ma) => {
		if (tabmenu) { L.dom.content(tabmenu, null); tabmenu.style.display = 'none'; }
		if (modemenu) { L.dom.content(modemenu, null); modemenu.style.display = 'none'; }
		if (mainmenu) {
			mainmenu.querySelectorAll('ul.nav').forEach(el => el.remove());
		}

		// Close mobile sidebar if open
		const showSideButton = document.querySelector('a.showSide');
		if (showSideButton && showSideButton.classList.contains('active')) {
			const darkMask = document.querySelector('.darkMask');
			const scrollbarArea = document.querySelector('.main-right');
			showSideButton.classList.remove('active');
			if (mainmenu) mainmenu.classList.remove('active');
			if (scrollbarArea) scrollbarArea.classList.remove('active');
			if (darkMask) darkMask.classList.remove('active');
		}

		if (typeof ma.render === 'function') {
			ma.render(treeData);
		}
	};

	if (_maInstance) {
		doRender(_maInstance);
	} else {
		window.L.require('menu-argon').then(ma => {
			_maInstance = ma;
			doRender(ma);
		});
	}
}

let _navGen = 0;
let _curPath = window.location.pathname;

function navigate(pathname, push) {
	if (_expired) return false;

	const segs = tree.segsFromPath(pathname);
	if (!segs) return false;

	const res = tree.resolveSegs(segs);
	if (!res) return false;

	const node = res.node;
	const className = tree.viewClassFor(node);
	if (!className) return false;

	if (typeof node.css === 'string' && node.css !== '') return false;

	const rsegs = res.segs;
	const gen = ++_navGen;
	const restoreTo = _pendingRestore;
	_pendingRestore = null;
	_curPath = pathname;

	const contentHost = getContentHost();
	if (!contentHost) return false;

	if (ui.hideModal) {
		try { ui.hideModal(); } catch (e) {}
	}

	L.env.requestpath  = rsegs.slice();
	L.env.dispatchpath = rsegs.slice();
	L.env.pathinfo     = '/' + segs.join('/');
	L.env.nodespec     = {
		satisfied: true,
		action: node.action,
		title: node.title,
		depends: node.depends,
		readonly: tree.readonlyForSegs(rsegs)
	};

	if (push) {
		const same = pathname === window.location.pathname;
		if (!same) _curId = newEntryId();
		history[same ? 'replaceState' : 'pushState']({ argonnav: true, argonid: _curId }, '', pathname);
	}

	const host = titleHost();
	document.title = node.title ? (host + ' - ' + _(node.title) + ' - LuCI') : (host + ' - LuCI');

	const main = document.getElementById('maincontent');
	if (main) main.focus({ preventScroll: true });

	// Use window.L to avoid the two-L trap
	const RT = window.L || L;
	const cached = _seenClasses.has(className);
	const previous = _inflight;
	let release;
	_inflight = new Promise((r) => { release = r; });
	progressStart();

	Promise.all([ warmedThen(className), previous.catch(() => {}) ]).then(() => {
		if (gen !== _navGen) return null;

		if (L.Poll && L.Poll.queue) {
			L.Poll.queue.length = 0;
			L.Poll.stop();
			L.Poll.start();
		}
		syncPollIndicator();
		clearViewIntervals();
		const uciWarm = flushUciCache();

		const stage = stageView(contentHost);
		const painted = renderedIn(stage.view);
		_seenClasses.add(className);

		return Promise.resolve(uciWarm)
			.then(() => RT.require(className))
			.then((view) => {
				if (RT.view && !(view instanceof RT.view))
					throw new TypeError('Loaded class ' + className + ' is not a view');
				if (cached) new view.constructor();
				return painted;
			})
			.then(() => {
				if (gen !== _navGen) { dropStage(stage); return; }
				document.body.setAttribute('data-page', rsegs.join('-'));
				commitStage(stage, contentHost, rsegs);
				if (push && !restoreTo) {
					window.scrollTo(0, 0);
				}
				if (rsegs.join('-') === 'admin-status-overview') {
					window.L.require('menu-argon').then(ma => {
						if (typeof ma.initCircularProgressBars === 'function') {
							ma.initCircularProgressBars();
						}
					});
				}
				syncPollIndicator();
				if (restoreTo) restoreScroll(restoreTo, gen);
			})
			.catch((e) => { dropStage(stage); throw e; });
	}).catch((e) => {
		console.error('argon-router: SPA nav to ' + className + ' failed, falling back to full load', e);
		if (gen === _navGen) window.location = pathname;
	}).then(() => {
		progressEnd();
		release();
	});

	return true;
}

function linkUrlFrom(ev) {
	const a = ev.target.closest ? ev.target.closest('a[href]') : null;
	if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download'))
		return null;
	const raw = a.getAttribute('href');
	if (!raw || raw.charAt(0) === '#') return null;
	let url;
	try { url = new URL(a.href, window.location.href); } catch (e) { return null; }
	return url.origin === window.location.origin ? url : null;
}

let _lastHovered = null;
function prefetchFrom(ev) {
	const url = linkUrlFrom(ev);
	if (url && !url.search && !url.hash)
		prefetchView(url.pathname);
}

let _wiring = false;
function wireRouter() {
	if (_wiring) return;
	_wiring = true;

	titleHost();
	adoptEntry();
	ensureOverviewHelpers();

	const curClass = tree.viewClassFor(tree.currentNode());
	if (curClass) _seenClasses.add(curClass);

	const vp = document.getElementById('view');
	if (vp) _inflight = renderedIn(vp).catch(() => {});

	watchSession();
	syncPollIndicator();

	document.addEventListener('click', function(ev) {
		if (ev.defaultPrevented || ev.button !== 0 ||
		    ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey)
			return;

		const url = linkUrlFrom(ev);
		if (!url) return;

		if (url.search || url.hash) return;

		saveScroll();
		if (navigate(url.pathname, true))
			ev.preventDefault();
	}, false);

	document.addEventListener('pointerover', (ev) => {
		const a = ev.target.closest ? ev.target.closest('a[href]') : null;
		if (!a || a === _lastHovered) return;
		_lastHovered = a;
		prefetchFrom(ev);
	}, { passive: true });

	document.addEventListener('focusin', prefetchFrom, { passive: true });
	document.addEventListener('pointerdown', prefetchFrom, { passive: true });

	window.addEventListener('popstate', () => {
		if (window.location.search) {
			window.location.reload();
			return;
		}

		if (window.location.pathname === _curPath)
			return;

		saveScroll();
		adoptEntry();
		_pendingRestore = _scrollMem.get(_curId) || null;
		if (!navigate(window.location.pathname, false)) {
			_pendingRestore = null;
			window.location.reload();
		}
	});
}

return baseclass.extend({
	init: function() {
		ui.menu.load().then((t) => {
			tree.setTree(t);
			wireRouter();
			window.L.require('menu-argon').then(ma => { _maInstance = ma; }).catch(() => {});
		});
	}
});
