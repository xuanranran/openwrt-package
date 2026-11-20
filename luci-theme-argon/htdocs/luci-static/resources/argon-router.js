'use strict';
'require baseclass';
'require ui';
'require rpc';
'require argon-menutree as tree';

const viewOwners = new WeakMap();
const viewIntervals = new Map();
let timerOwner = null;

function inViewScope(owner, fn, receiver, args) {
	const previous = timerOwner;
	timerOwner = owner;
	try { return fn.apply(receiver, args); }
	finally { timerOwner = previous; }
}

function installViewTimerTracking() {
	const methods = (window.L || L).view?.prototype;
	if (!methods || typeof methods.__init__ !== 'function')
		return;
	const init = methods.__init__;
	const set = window.setInterval, clear = window.clearInterval;
	window.setInterval = function(fn, ms, ...args) {
		const owner = timerOwner;
		if (!owner || typeof fn !== 'function')
			return set.call(window, fn, ms, ...args);
		const call = function(...values) {
			if (id === L.Poll?.timer)
				return fn.apply(this, values);
			if (!owner.disposed && !owner.suspended && !_expired)
				return inViewScope(owner, fn, this, values);
		};
		const id = set.call(window, call, ms, ...args);
		if (owner.disposed || _expired)
			clear.call(window, id);
		else
			viewIntervals.set(id, owner);
		return id;
	};
	window.clearInterval = function(id) {
		viewIntervals.delete(+id);
		return clear.call(window, id);
	};

	methods.__init__ = function() {
		const root = document.getElementById('view');
		if (!root)
			return init.apply(this, arguments);
		const owner = viewOwners.get(root) || { disposed: false };
		viewOwners.set(root, owner);
		const wrappers = [];
		// LuCI binds these methods during __init__, then calls them asynchronously.
		// Only their synchronous execution (not the entire loading window) owns timers.
		for (const name of ['load', 'render', 'addFooter']) {
			const fn = this[name];
			if (typeof fn !== 'function')
				continue;
			const own = Object.getOwnPropertyDescriptor(this, name);
			Object.defineProperty(this, name, {
				configurable: true,
				writable: true,
				value: function() { return inViewScope(owner, fn, this, arguments); }
			});
			wrappers.push([name, own]);
		}
		try {
			const rendering = init.apply(this, arguments);
			owner.rendering = rendering;
			return rendering;
		}
		finally {
			for (const [name, own] of wrappers) {
				if (own)
					Object.defineProperty(this, name, own);
				else
					delete this[name];
			}
		}
	};
}

function clearViewIntervals(root) {
	const owner = root ? viewOwners.get(root) : null;
	if (root && !owner)
		return;
	if (owner) {
		owner.disposed = true;
		viewOwners.delete(root);
	}
	for (const [id, current] of viewIntervals) {
		if (!root || current === owner) {
			if (id === L.Poll?.timer)
				viewIntervals.delete(id);
			else
				window.clearInterval(id);
		}
	}
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
	const request = (window.L || L).Request;
	if (request && typeof request.addInterceptor === 'function') {
		request.addInterceptor((res) => {
			try {
				if (res?.status === 403 &&
				    (res.headers?.get?.('X-LuCI-Login-Required') ??
				     res.getResponseHeader?.('X-LuCI-Login-Required')) === 'yes') {
					markExpired();
				}
			} catch (e) {}
		});
	}
	if (rpc && typeof rpc.addInterceptor === 'function') {
		rpc.addInterceptor((msg, req) => {
			// LuCI checks this permission after an ordinary RPC reports access denied.
			const args = req?.params;
			if (req?.object === 'session' && req.method === 'access' &&
			    args?.scope === 'uci' && args.object === 'luci' && args.function === 'read' &&
			    msg?.jsonrpc === '2.0' && msg.error?.code === -32002)
				markExpired();
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
let _activeStage = null;
let _reloadRequired = false;

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
	wrapper.inert = true;
	wrapper.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 0; max-height: 0; overflow: hidden; visibility: hidden; pointer-events: none; opacity: 0; z-index: -9999; margin: 0; padding: 0; border: none;';
	const view = document.createElement('div');
	view.id = 'view';
	view.style.cssText = 'margin: 0; padding: 0; border: none; width: 100%;';
	wrapper.appendChild(view);
	const outgoing = contentHost.querySelector(':scope > #view');
	const scroll = scrollContainer()?.scrollTop || 0;
	if (outgoing) {
		const owner = viewOwners.get(outgoing);
		if (owner) owner.suspended = true;
		outgoing.replaceWith(wrapper);
	} else {
		contentHost.appendChild(wrapper);
	}
	return { wrapper, view, outgoing, scroll };
}

function hasRenderedView(view) {
	return view.querySelector(':scope > :not(.spinning):not(script)') !== null;
}

function renderedIn(view) {
	const painted = () => hasRenderedView(view);
	if (painted()) return Promise.resolve();
	return new Promise((resolve, reject) => {
		const timer = window.setTimeout(() => {
			finish(() => reject(new Error('argon-router: view did not render within ' + RENDER_TIMEOUT + ' ms')));
		}, RENDER_TIMEOUT);
		const mo = new MutationObserver(() => {
			if (painted()) finish(resolve);
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
	clearViewIntervals(stage.view);
	const host = stage.wrapper.parentNode;
	const after = stage.wrapper.nextSibling;
	discard(stage.wrapper);
	if (host && stage.outgoing) {
		const owner = viewOwners.get(stage.outgoing);
		if (owner) owner.suspended = false;
		host.insertBefore(stage.outgoing, after);
		const scroller = scrollContainer();
		if (scroller) scroller.scrollTop = stage.scroll;
	}
}

async function beforeRenderDeadline(job) {
	let timeout;
	try {
		return await Promise.race([job, new Promise((resolve, reject) => {
			timeout = window.setTimeout(() => {
				reject(new Error('argon-router: view load or render timed out'));
			}, RENDER_TIMEOUT);
		})]);
	} finally {
		window.clearTimeout(timeout);
	}
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

function commitStage(stage, contentHost, rsegs) {
	sweepAround(contentHost, rsegs);
	const live = stage.view;
	live.removeAttribute('style');
	stage.wrapper.replaceWith(live);
	if (stage.outgoing) {
		clearViewIntervals(stage.outgoing);
		discard(stage.outgoing);
	}

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
const PREFETCH_LIMIT = 64;
const PREFETCH_CONCURRENCY = 8;
const PREFETCH_TIMEOUT = 5000;

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

function warmClass(name, depth, root) {
	if (_expired || classLoaded(name) || _warming.has(name) ||
	    _warming.size >= PREFETCH_CONCURRENCY)
		return;
	if (_prefetched.delete(name)) {
		_prefetched.add(name);
		return;
	}
	const controller = new AbortController();
	const timer = window.setTimeout(() => controller.abort(), PREFETCH_TIMEOUT);
	const entry = { claimed: false, body: null };
	entry.body = Promise.resolve()
		.then(() => fetch(moduleUrl(name), { credentials: 'same-origin', signal: controller.signal }))
		.then(res => {
			if (!res.ok) throw new Error('Prefetch HTTP ' + res.status);
			return res.text();
		})
		.then(src => {
			_prefetched.add(name);
			while (_prefetched.size > PREFETCH_LIMIT)
				_prefetched.delete(_prefetched.values().next().value);
			if (!entry.claimed && depth < PREFETCH_DEPTH && !classLoaded(root)) {
				for (const d of pragmaDeps(src)) warmClass(d, depth + 1, root);
			}
		}).catch(() => {
			// Speculative failures must stay retryable.
		}).finally(() => {
			window.clearTimeout(timer);
			_warming.delete(name);
		});
	_warming.set(name, entry);
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
	const entry = _warming.get(className);
	if (!entry) return Promise.resolve();
	entry.claimed = true;
	let t = 0;
	return Promise.race([ entry.body, new Promise((r) => { t = window.setTimeout(r, WARM_WAIT_MS); }) ])
		.finally(() => window.clearTimeout(t));
}

// Scroll restoration
const _scrollMem = new Map();
const _scrollSess = Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
let _histN = 0;
let _curId = null;
const SCROLL_MEM_MAX = 50;

function newEntryId() { return _scrollSess + ':' + (++_histN); }

function adoptEntry() {
	// Native history restoration can apply after popstate and overwrite the SPA offset.
	if ('scrollRestoration' in history)
		history.scrollRestoration = 'manual';
	const st = history.state;
	if (st && st.argonid) { _curId = st.argonid; return; }
	_curId = newEntryId();
	try { history.replaceState(Object.assign({}, st, { argonid: _curId }), '', window.location.href); } catch (e) {}
}

function saveScroll() {
	if (!_curId) return;
	_scrollMem.delete(_curId);
	_scrollMem.set(_curId, Math.round(_activeStage?.scroll ?? (scrollContainer()?.scrollTop || 0)));
	while (_scrollMem.size > SCROLL_MEM_MAX)
		_scrollMem.delete(_scrollMem.keys().next().value);
}

function scrollContainer() {
	return document.querySelector('.main-right') || document.scrollingElement;
}

function restoreScroll(pos, gen) {
	const scroller = scrollContainer();
	if (!scroller) return;
	if (!pos) {
		scroller.scrollTop = 0;
		return;
	}
	const until = Date.now() + 5000;
	let cancelled = false;
	const stop = () => { cancelled = true; off(); };
	const opts = { passive: true, capture: true };
	function off() {
		window.removeEventListener('wheel', stop, opts);
		window.removeEventListener('touchstart', stop, opts);
		window.removeEventListener('keydown', onKey, opts);
	}
	window.addEventListener('wheel', stop, opts);
	window.addEventListener('touchstart', stop, opts);
	const onKey = ev => {
		if (!ev.target?.closest?.('input, textarea, select, [contenteditable]') &&
		    ['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '].includes(ev.key))
			stop();
	};
	window.addEventListener('keydown', onKey, opts);

	(function tick() {
		if (cancelled) return;
		if (gen !== _navGen) { off(); return; }
		const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
		if (max >= pos || Date.now() > until) {
			scroller.scrollTop = Math.min(max, pos);
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

function navigate(pathname, push, entryId = null) {
	if (_expired || _reloadRequired || !getContentHost()) return false;
	const segs = tree.segsFromPath(pathname);
	const res = segs && tree.resolveSegs(segs);
	if (!res) return false;
	const node = res.node;
	const className = tree.viewClassFor(node);
	if (!className || (typeof node.css === 'string' && node.css !== '')) return false;

	const rsegs = res.segs;
	const gen = ++_navGen;
	const restoreTo = push ? 0 : (_scrollMem.get(entryId) ?? 0);
	const previous = _inflight;
	progressStart();
	_inflight = Promise.all([warmedThen(className), previous.catch(() => {})]).then(async () => {
		if (gen !== _navGen) return;
		if (_expired || _reloadRequired) throw new Error('SPA render unavailable');
		const contentHost = getContentHost();
		if (!contentHost) throw new Error('Missing SPA content host');
		const RT = window.L || L;
		const env = RT.env || L.env;
		const route = {
			requestpath: rsegs.slice(),
			dispatchpath: rsegs.slice(),
			pathinfo: '/' + segs.join('/'),
			nodespec: {
				satisfied: true, action: node.action, title: node.title, depends: node.depends,
				readonly: tree.readonlyForSegs(rsegs)
			}
		};
		const prior = Object.fromEntries(Object.keys(route).map(key => [key, env[key]]));
		const poll = L.Poll;
		const queue = poll?.queue?.slice();
		const polling = poll?.active?.();
		try { ui.hideModal?.(); } catch (e) {}
		const stage = _activeStage = stageView(contentHost);
		let committed = false;
		try {
			if (queue) {
				poll.stop();
				poll.queue.length = 0;
				poll.start();
			}
			syncPollIndicator();
			Object.assign(env, route);
			await beforeRenderDeadline(Promise.resolve().then(async () => {
				await flushUciCache();
				if (gen !== _navGen || _expired || _reloadRequired) return;
				const cached = _seenClasses.has(className) || classLoaded(className);
				const view = await RT.require(className);
				if (RT.view && !(view instanceof RT.view))
					throw new TypeError('Loaded class ' + className + ' is not a view');
				_seenClasses.add(className);
				if (cached && gen === _navGen && !_expired && !_reloadRequired) new view.constructor();
				const rendering = viewOwners.get(stage.view)?.rendering;
				if (rendering) await rendering;
				else if (gen === _navGen && !_expired) await renderedIn(stage.view);
				else if (!cached) throw new Error('Cannot verify a superseded native view finished');
			}));
			if (gen !== _navGen) return;
			if (_expired || !hasRenderedView(stage.view)) throw new Error('View failed to render');
			const host = titleHost();
			const title = node.title ? (host + ' - ' + _(node.title) + ' - LuCI') : (host + ' - LuCI');
			if (push) {
				const same = pathname === window.location.pathname;
				const id = same ? _curId : newEntryId();
				history[same ? 'replaceState' : 'pushState']({ argonnav: true, argonid: id }, '', pathname);
				_curId = id;
			} else {
				_curId = entryId;
			}
			_curPath = pathname;
			document.body.dataset.page = rsegs.join('-');
			commitStage(stage, contentHost, rsegs);
			committed = true;
			document.title = title;
			document.getElementById('maincontent')?.focus({ preventScroll: true });
			renderMenu();
			restoreScroll(restoreTo, gen);
			if (rsegs.join('-') === 'admin-status-overview')
				RT.require('menu-argon').then(ma => ma.initCircularProgressBars?.()).catch(() => {});
			syncPollIndicator();
		} catch (e) {
			// On timeout a late native render may still look up the global #view.
			_reloadRequired = true;
			throw e;
		} finally {
			_activeStage = null;
			if (!committed) {
				dropStage(stage);
				Object.assign(env, prior);
				if (queue) {
					poll.stop();
					poll.queue.splice(0, poll.queue.length, ...queue);
					if (polling && !_expired && !_reloadRequired) poll.start();
				}
			}
		}
	}).catch(e => {
		if (gen !== _navGen) return;
		console.error('argon-router: SPA nav to ' + className + ' failed, falling back to full load', e);
		if (pathname === window.location.pathname)
			window.location.reload();
		else
			window.location.assign(pathname);
	}).finally(progressEnd);

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
	if (vp) {
		const ready = viewOwners.get(vp)?.rendering || renderedIn(vp);
		_inflight = beforeRenderDeadline(ready).catch(() => { _reloadRequired = true; });
	}

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
		if (!a || a.contains(ev.relatedTarget)) return;
		prefetchFrom(ev);
	}, { passive: true });

	document.addEventListener('focusin', prefetchFrom, { passive: true });
	document.addEventListener('pointerdown', prefetchFrom, { passive: true });

	window.addEventListener('popstate', () => {
		if (window.location.search) {
			window.location.reload();
			return;
		}

		if (window.location.pathname === _curPath && !_progressPending)
			return;

		saveScroll();
		const entry = history.state?.argonid;
		if (!navigate(window.location.pathname, false, entry)) {
			window.location.reload();
		}
	});
}

installViewTimerTracking();

return baseclass.extend({
	init: function() {
		ui.menu.load().then((t) => {
			tree.setTree(t);
			wireRouter();
			window.L.require('menu-argon').then(ma => { _maInstance = ma; }).catch(() => {});
		});
	}
});
