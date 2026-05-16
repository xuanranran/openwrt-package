(function() {
	'use strict';

	var desktop;
	var taskbar;
	var mainContent;
	var zIndex = 100;
	var windowCount = 0;
	var windows = {};
	var openedTopLevelWindow = false;
	var lastMenuSource = null;
	var initialWindow = null;

	function qs(selector, root) {
		return (root || document).querySelector(selector);
	}

	function qsa(selector, root) {
		return Array.prototype.slice.call((root || document).querySelectorAll(selector));
	}

	function textOf(node) {
		return (node && node.textContent || '').replace(/\s+/g, ' ').trim();
	}

	function pageTitle() {
		var heading = qs('#maincontent > h2, #maincontent h2, #maincontent h1');
		var title = document.title.split('|').pop().trim();
		if (isRootRoute() && title)
			return title;
		return textOf(heading) || title || 'Status';
	}

	function routeFromHref(href) {
		try {
			var url = new URL(href || window.location.href, window.location.href);
			return url.pathname + url.search + url.hash;
		} catch (e) {
			return '';
		}
	}

	function isRootRoute() {
		var path = window.location.pathname.replace(/\/+$/, '');
		return /\/cgi-bin\/luci$/.test(path);
	}

	function syncBrowserRoute(win, replace) {
		if (!win || !win.dataset.windowHref || !window.history || !window.history[replace ? 'replaceState' : 'pushState'])
			return;

		var route = routeFromHref(win.dataset.windowHref);
		var current = window.location.pathname + window.location.search + window.location.hash;
		if (!route || route === current)
			return;

		try {
			window.history[replace ? 'replaceState' : 'pushState']({
				win98WindowId: win.dataset.windowId,
				href: win.dataset.windowHref
			}, '', route);
		} catch (e) {}
	}

	function routeWithTab(href, tab) {
		try {
			var url = new URL(href || window.location.href, window.location.href);
			url.hash = tab ? 'tab=' + encodeURIComponent(tab) : '';
			return url.href;
		} catch (e) {
			return href || window.location.href;
		}
	}

	function syncWindowTabRoute(win, doc, tab, replace) {
		if (!win || !tab)
			return;

		var baseHref = win.dataset.windowHref || (doc && doc.location && doc.location.href) || window.location.href;
		win.dataset.windowHref = routeWithTab(baseHref, tab);
		if (win.classList.contains('is-active'))
			syncBrowserRoute(win, replace);
	}

	function installTabAddressSync(doc, win) {
		if (!doc || !win || doc.documentElement.dataset.win98TabSync === '1')
			return;

		doc.documentElement.dataset.win98TabSync = '1';
		doc.addEventListener('click', function(event) {
			var parent;
			var tab;
			var href;
			var targetUrl;
			var currentUrl;
			var isSameDocumentTab = false;
			var link = event.target.closest && event.target.closest([
				'.cbi-tab > a',
				'.cbi-tab-disabled > a',
				'ul.cbi-tabmenu > li > a',
				'#tabmenu ul > li > a'
			].join(', '));
			if (!link)
				return;

			parent = link.parentNode;
			href = link.getAttribute('href') || '';
			tab = parent && parent.dataset ? parent.dataset.tab : '';
			if (!tab)
				tab = (link.hash || '').replace(/^#(?:tab=)?/, '');
			if (!tab) {
				try {
					targetUrl = new URL(link.href, doc.location.href);
					tab = (targetUrl.hash || '').replace(/^#(?:tab=)?/, '') || targetUrl.searchParams.get('tab') || '';
				} catch (e) {}
			}
			if (!tab)
				tab = textOf(link).toLowerCase().replace(/[^a-z0-9_:-]+/g, '-').replace(/^-+|-+$/g, '');
			if (!tab)
				return;

			try {
				targetUrl = targetUrl || new URL(link.href, doc.location.href);
				currentUrl = new URL(doc.location.href);
				isSameDocumentTab = href === '#' || href.indexOf('#') === 0 ||
					(targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search);
			} catch (e) {
				isSameDocumentTab = href === '#' || href.indexOf('#') === 0;
			}

			if (!isSameDocumentTab)
				return;

			event.preventDefault();

			setTimeout(function() {
				syncWindowTabRoute(win, doc, tab, false);
			}, 0);
		}, true);
	}

	function framedScroller(doc) {
		var candidates;
		if (!doc)
			return null;

		candidates = [
			doc.querySelector('#maincontent'),
			doc.querySelector('#modal_overlay'),
			doc.scrollingElement,
			doc.documentElement,
			doc.body
		];

		for (var i = 0; i < candidates.length; i++) {
			var candidate = candidates[i];
			if (!candidate)
				continue;
			if (candidate.scrollHeight > candidate.clientHeight || candidate.scrollWidth > candidate.clientWidth)
				return candidate;
		}

		return candidates[0] || null;
	}

	function installFramedScrollbars(doc) {
		var scroller = framedScroller(doc);
		if (!scroller || doc.documentElement.dataset.win98Scrollbars === '1')
			return;

		doc.documentElement.dataset.win98Scrollbars = '1';
		doc.documentElement.classList.add('win98-custom-scrollbars');
		scroller.classList.add('win98-scrollbar-scroller');

		var vertical = doc.createElement('div');
		var horizontal = doc.createElement('div');
		var corner = doc.createElement('div');
		var updateTimer = null;
		vertical.className = 'win98-scrollbar win98-scrollbar-vertical';
		horizontal.className = 'win98-scrollbar win98-scrollbar-horizontal';
		corner.className = 'win98-scrollbar-corner';
		vertical.innerHTML = '<button type="button" class="win98-scrollbar-button is-up"></button><div class="win98-scrollbar-track"><button type="button" class="win98-scrollbar-thumb"></button></div><button type="button" class="win98-scrollbar-button is-down"></button>';
		horizontal.innerHTML = '<button type="button" class="win98-scrollbar-button is-left"></button><div class="win98-scrollbar-track"><button type="button" class="win98-scrollbar-thumb"></button></div><button type="button" class="win98-scrollbar-button is-right"></button>';
		doc.body.append(vertical, horizontal, corner);

		function update() {
			var maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
			var maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
			var vTrack = qs('.win98-scrollbar-track', vertical);
			var hTrack = qs('.win98-scrollbar-track', horizontal);
			var vThumb = qs('.win98-scrollbar-thumb', vertical);
			var hThumb = qs('.win98-scrollbar-thumb', horizontal);
			var vTrackSize = Math.max(1, vTrack.clientHeight);
			var hTrackSize = Math.max(1, hTrack.clientWidth);
			var vThumbSize = maxTop ? Math.max(28, Math.floor(scroller.clientHeight / scroller.scrollHeight * vTrackSize)) : vTrackSize;
			var hThumbSize = maxLeft ? Math.max(28, Math.floor(scroller.clientWidth / scroller.scrollWidth * hTrackSize)) : hTrackSize;

			vertical.hidden = maxTop <= 0;
			horizontal.hidden = maxLeft <= 0;
			corner.hidden = maxTop <= 0 || maxLeft <= 0;
			vThumb.style.setProperty('height', vThumbSize + 'px', 'important');
			hThumb.style.setProperty('width', hThumbSize + 'px', 'important');
			vThumb.style.setProperty('top', (maxTop ? Math.round(scroller.scrollTop / maxTop * (vTrackSize - vThumbSize)) : 0) + 'px');
			hThumb.style.setProperty('left', (maxLeft ? Math.round(scroller.scrollLeft / maxLeft * (hTrackSize - hThumbSize)) : 0) + 'px');
		}

		function scheduleUpdate() {
			if (updateTimer != null)
				doc.defaultView.cancelAnimationFrame(updateTimer);
			updateTimer = doc.defaultView.requestAnimationFrame(function() {
				updateTimer = null;
				update();
			});
		}

		function pageStep(axis, direction) {
			if (axis === 'y')
				scroller.scrollTop += direction * Math.max(40, scroller.clientHeight - 40);
			else
				scroller.scrollLeft += direction * Math.max(40, scroller.clientWidth - 40);
		}

		function dragThumb(bar, axis, event) {
			var thumb = qs('.win98-scrollbar-thumb', bar);
			var track = qs('.win98-scrollbar-track', bar);
			var start = axis === 'y' ? event.clientY : event.clientX;
			var startScroll = axis === 'y' ? scroller.scrollTop : scroller.scrollLeft;
			var maxScroll = axis === 'y' ? scroller.scrollHeight - scroller.clientHeight : scroller.scrollWidth - scroller.clientWidth;
			var trackSize = axis === 'y' ? track.clientHeight : track.clientWidth;
			var thumbSize = axis === 'y' ? thumb.offsetHeight : thumb.offsetWidth;
			var travel = Math.max(1, trackSize - thumbSize);

			function move(moveEvent) {
				var current = axis === 'y' ? moveEvent.clientY : moveEvent.clientX;
				var next = startScroll + (current - start) / travel * maxScroll;
				if (axis === 'y')
					scroller.scrollTop = next;
				else
					scroller.scrollLeft = next;
			}

			function stop() {
				doc.removeEventListener('pointermove', move);
				doc.removeEventListener('pointerup', stop);
			}

			event.preventDefault();
			doc.addEventListener('pointermove', move);
			doc.addEventListener('pointerup', stop);
		}

		qs('.is-up', vertical).addEventListener('click', function() { scroller.scrollTop -= 48; scheduleUpdate(); });
		qs('.is-down', vertical).addEventListener('click', function() { scroller.scrollTop += 48; scheduleUpdate(); });
		qs('.is-left', horizontal).addEventListener('click', function() { scroller.scrollLeft -= 48; scheduleUpdate(); });
		qs('.is-right', horizontal).addEventListener('click', function() { scroller.scrollLeft += 48; scheduleUpdate(); });
		qs('.win98-scrollbar-track', vertical).addEventListener('click', function(event) {
			if (event.target !== event.currentTarget)
				return;
			pageStep('y', event.offsetY > qs('.win98-scrollbar-thumb', vertical).offsetTop ? 1 : -1);
		});
		qs('.win98-scrollbar-track', horizontal).addEventListener('click', function(event) {
			if (event.target !== event.currentTarget)
				return;
			pageStep('x', event.offsetX > qs('.win98-scrollbar-thumb', horizontal).offsetLeft ? 1 : -1);
		});
		qs('.win98-scrollbar-thumb', vertical).addEventListener('pointerdown', function(event) { dragThumb(vertical, 'y', event); });
		qs('.win98-scrollbar-thumb', horizontal).addEventListener('pointerdown', function(event) { dragThumb(horizontal, 'x', event); });
		scroller.addEventListener('scroll', scheduleUpdate);
		doc.defaultView.addEventListener('resize', scheduleUpdate);
		new doc.defaultView.MutationObserver(scheduleUpdate).observe(doc.body, {
			childList: true,
			subtree: true,
			characterData: true
		});
		setTimeout(update, 0);
		setTimeout(update, 250);
		setTimeout(update, 1000);
	}

	function installInnerScrollbars(doc) {
		if (!doc || !doc.body)
			return;

		function install(scroller) {
			if (!scroller || scroller.dataset.win98InnerScrollbars === '1' || scroller.closest('.win98-inner-scrollbar-wrap'))
				return;

			if (scroller.tagName === 'TEXTAREA')
				scroller.setAttribute('wrap', 'off');

			if (scroller.scrollHeight <= scroller.clientHeight && scroller.scrollWidth <= scroller.clientWidth)
				return;

			scroller.dataset.win98InnerScrollbars = '1';
			scroller.classList.add('win98-inner-scrollbar-scroller', 'win98-scrollbar-scroller');

			var rect = scroller.getBoundingClientRect();
			var wrapper = doc.createElement('div');
			var vertical = doc.createElement('div');
			var horizontal = doc.createElement('div');
			var corner = doc.createElement('div');
			var updateTimer = null;

			wrapper.className = 'win98-inner-scrollbar-wrap';
			wrapper.style.width = rect.width ? rect.width + 'px' : '100%';
			wrapper.style.height = rect.height ? rect.height + 'px' : scroller.offsetHeight + 'px';
			scroller.parentNode.insertBefore(wrapper, scroller);
			wrapper.appendChild(scroller);

			vertical.className = 'win98-scrollbar win98-scrollbar-vertical is-inner';
			horizontal.className = 'win98-scrollbar win98-scrollbar-horizontal is-inner';
			corner.className = 'win98-scrollbar-corner is-inner';
			vertical.innerHTML = '<button type="button" class="win98-scrollbar-button is-up"></button><div class="win98-scrollbar-track"><button type="button" class="win98-scrollbar-thumb"></button></div><button type="button" class="win98-scrollbar-button is-down"></button>';
			horizontal.innerHTML = '<button type="button" class="win98-scrollbar-button is-left"></button><div class="win98-scrollbar-track"><button type="button" class="win98-scrollbar-thumb"></button></div><button type="button" class="win98-scrollbar-button is-right"></button>';
			wrapper.append(vertical, horizontal, corner);

			function update() {
				var maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
				var maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
				var vTrack = qs('.win98-scrollbar-track', vertical);
				var hTrack = qs('.win98-scrollbar-track', horizontal);
				var vThumb = qs('.win98-scrollbar-thumb', vertical);
				var hThumb = qs('.win98-scrollbar-thumb', horizontal);
				var vTrackSize = Math.max(1, vTrack.clientHeight);
				var hTrackSize = Math.max(1, hTrack.clientWidth);
				var vThumbSize = maxTop ? Math.max(28, Math.floor(scroller.clientHeight / scroller.scrollHeight * vTrackSize)) : vTrackSize;
				var hThumbSize = maxLeft ? Math.max(28, Math.floor(scroller.clientWidth / scroller.scrollWidth * hTrackSize)) : hTrackSize;

				vertical.hidden = maxTop <= 0;
				horizontal.hidden = maxLeft <= 0;
				corner.hidden = maxTop <= 0 || maxLeft <= 0;
				vertical.style.bottom = maxLeft > 0 ? '17px' : '0';
				horizontal.style.right = maxTop > 0 ? '17px' : '0';
				scroller.style.right = maxTop > 0 ? '17px' : '0';
				scroller.style.bottom = maxLeft > 0 ? '17px' : '0';
				vThumb.style.setProperty('height', vThumbSize + 'px', 'important');
				hThumb.style.setProperty('width', hThumbSize + 'px', 'important');
				vThumb.style.setProperty('top', (maxTop ? Math.round(scroller.scrollTop / maxTop * (vTrackSize - vThumbSize)) : 0) + 'px');
				hThumb.style.setProperty('left', (maxLeft ? Math.round(scroller.scrollLeft / maxLeft * (hTrackSize - hThumbSize)) : 0) + 'px');
			}

			function scheduleUpdate() {
				if (updateTimer != null)
					doc.defaultView.cancelAnimationFrame(updateTimer);
				updateTimer = doc.defaultView.requestAnimationFrame(function() {
					updateTimer = null;
					update();
				});
			}

			function pageStep(axis, direction) {
				if (axis === 'y')
					scroller.scrollTop += direction * Math.max(40, scroller.clientHeight - 40);
				else
					scroller.scrollLeft += direction * Math.max(40, scroller.clientWidth - 40);
				scheduleUpdate();
			}

			function dragThumb(bar, axis, event) {
				var thumb = qs('.win98-scrollbar-thumb', bar);
				var track = qs('.win98-scrollbar-track', bar);
				var start = axis === 'y' ? event.clientY : event.clientX;
				var startScroll = axis === 'y' ? scroller.scrollTop : scroller.scrollLeft;
				var maxScroll = axis === 'y' ? scroller.scrollHeight - scroller.clientHeight : scroller.scrollWidth - scroller.clientWidth;
				var trackSize = axis === 'y' ? track.clientHeight : track.clientWidth;
				var thumbSize = axis === 'y' ? thumb.offsetHeight : thumb.offsetWidth;
				var travel = Math.max(1, trackSize - thumbSize);

				function move(moveEvent) {
					var current = axis === 'y' ? moveEvent.clientY : moveEvent.clientX;
					var next = startScroll + (current - start) / travel * maxScroll;
					if (axis === 'y')
						scroller.scrollTop = next;
					else
						scroller.scrollLeft = next;
				}

				function stop() {
					doc.removeEventListener('pointermove', move);
					doc.removeEventListener('pointerup', stop);
				}

				event.preventDefault();
				doc.addEventListener('pointermove', move);
				doc.addEventListener('pointerup', stop);
			}

			qs('.is-up', vertical).addEventListener('click', function() { scroller.scrollTop -= 48; scheduleUpdate(); });
			qs('.is-down', vertical).addEventListener('click', function() { scroller.scrollTop += 48; scheduleUpdate(); });
			qs('.is-left', horizontal).addEventListener('click', function() { scroller.scrollLeft -= 48; scheduleUpdate(); });
			qs('.is-right', horizontal).addEventListener('click', function() { scroller.scrollLeft += 48; scheduleUpdate(); });
			qs('.win98-scrollbar-track', vertical).addEventListener('click', function(event) {
				if (event.target === event.currentTarget)
					pageStep('y', event.offsetY > qs('.win98-scrollbar-thumb', vertical).offsetTop ? 1 : -1);
			});
			qs('.win98-scrollbar-track', horizontal).addEventListener('click', function(event) {
				if (event.target === event.currentTarget)
					pageStep('x', event.offsetX > qs('.win98-scrollbar-thumb', horizontal).offsetLeft ? 1 : -1);
			});
			qs('.win98-scrollbar-thumb', vertical).addEventListener('pointerdown', function(event) { dragThumb(vertical, 'y', event); });
			qs('.win98-scrollbar-thumb', horizontal).addEventListener('pointerdown', function(event) { dragThumb(horizontal, 'x', event); });
			scroller.addEventListener('scroll', scheduleUpdate);
			doc.defaultView.addEventListener('resize', scheduleUpdate);
			setTimeout(update, 0);
			setTimeout(update, 250);
			setTimeout(update, 1000);
		}

		function scan() {
			qsa('textarea, pre', doc).forEach(install);
		}

		scan();
		setTimeout(scan, 250);
		setTimeout(scan, 1000);
	}

	function installWindowContentScrollbars(content) {
		if (!content || content.dataset.win98Scrollbars === '1')
			return;

		content.dataset.win98Scrollbars = '1';
		content.classList.add('has-custom-scrollbar');

		var scroller = document.createElement('div');
		scroller.className = 'win98-window-scroller win98-scrollbar-scroller';
		while (content.firstChild)
			scroller.appendChild(content.firstChild);
		content.appendChild(scroller);

		var vertical = document.createElement('div');
		var horizontal = document.createElement('div');
		var corner = document.createElement('div');
		var updateTimer = null;
		vertical.className = 'win98-scrollbar win98-scrollbar-vertical is-contained';
		horizontal.className = 'win98-scrollbar win98-scrollbar-horizontal is-contained';
		corner.className = 'win98-scrollbar-corner is-contained';
		vertical.innerHTML = '<button type="button" class="win98-scrollbar-button is-up"></button><div class="win98-scrollbar-track"><button type="button" class="win98-scrollbar-thumb"></button></div><button type="button" class="win98-scrollbar-button is-down"></button>';
		horizontal.innerHTML = '<button type="button" class="win98-scrollbar-button is-left"></button><div class="win98-scrollbar-track"><button type="button" class="win98-scrollbar-thumb"></button></div><button type="button" class="win98-scrollbar-button is-right"></button>';
		content.append(vertical, horizontal, corner);

		function update() {
			var overflowTolerance = 12;
			var maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
			var maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
			var vTrack = qs('.win98-scrollbar-track', vertical);
			var hTrack = qs('.win98-scrollbar-track', horizontal);
			var vThumb = qs('.win98-scrollbar-thumb', vertical);
			var hThumb = qs('.win98-scrollbar-thumb', horizontal);
			var vTrackSize = Math.max(1, vTrack.clientHeight);
			var hTrackSize = Math.max(1, hTrack.clientWidth);

			if (maxLeft <= overflowTolerance) {
				maxLeft = 0;
				scroller.scrollLeft = 0;
			}

			var vThumbSize = maxTop ? Math.max(28, Math.floor(scroller.clientHeight / scroller.scrollHeight * vTrackSize)) : vTrackSize;
			var hThumbSize = maxLeft ? Math.max(28, Math.floor(scroller.clientWidth / scroller.scrollWidth * hTrackSize)) : hTrackSize;

			vertical.hidden = maxTop <= 0;
			horizontal.hidden = maxLeft <= 0;
			corner.hidden = maxTop <= 0 || maxLeft <= 0;
			vertical.style.bottom = maxLeft > 0 ? '21px' : '4px';
			horizontal.style.right = maxTop > 0 ? '21px' : '4px';
			scroller.style.right = maxTop > 0 ? '21px' : '4px';
			scroller.style.bottom = maxLeft > 0 ? '21px' : '4px';
			vThumb.style.setProperty('height', vThumbSize + 'px', 'important');
			hThumb.style.setProperty('width', hThumbSize + 'px', 'important');
			vThumb.style.setProperty('top', (maxTop ? Math.round(scroller.scrollTop / maxTop * (vTrackSize - vThumbSize)) : 0) + 'px');
			hThumb.style.setProperty('left', (maxLeft ? Math.round(scroller.scrollLeft / maxLeft * (hTrackSize - hThumbSize)) : 0) + 'px');
		}

		function scheduleUpdate() {
			if (updateTimer != null)
				cancelAnimationFrame(updateTimer);
			updateTimer = requestAnimationFrame(function() {
				updateTimer = null;
				update();
			});
		}

		function pageStep(axis, direction) {
			if (axis === 'y')
				scroller.scrollTop += direction * Math.max(40, scroller.clientHeight - 40);
			else
				scroller.scrollLeft += direction * Math.max(40, scroller.clientWidth - 40);
			scheduleUpdate();
		}

		function dragThumb(bar, axis, event) {
			var thumb = qs('.win98-scrollbar-thumb', bar);
			var track = qs('.win98-scrollbar-track', bar);
			var start = axis === 'y' ? event.clientY : event.clientX;
			var startScroll = axis === 'y' ? scroller.scrollTop : scroller.scrollLeft;
			var maxScroll = axis === 'y' ? scroller.scrollHeight - scroller.clientHeight : scroller.scrollWidth - scroller.clientWidth;
			var trackSize = axis === 'y' ? track.clientHeight : track.clientWidth;
			var thumbSize = axis === 'y' ? thumb.offsetHeight : thumb.offsetWidth;
			var travel = Math.max(1, trackSize - thumbSize);

			function move(moveEvent) {
				var current = axis === 'y' ? moveEvent.clientY : moveEvent.clientX;
				var next = startScroll + (current - start) / travel * maxScroll;
				if (axis === 'y')
					scroller.scrollTop = next;
				else
					scroller.scrollLeft = next;
			}

			function stop() {
				document.removeEventListener('pointermove', move);
				document.removeEventListener('pointerup', stop);
			}

			event.preventDefault();
			document.addEventListener('pointermove', move);
			document.addEventListener('pointerup', stop);
		}

		qs('.is-up', vertical).addEventListener('click', function() { scroller.scrollTop -= 48; scheduleUpdate(); });
		qs('.is-down', vertical).addEventListener('click', function() { scroller.scrollTop += 48; scheduleUpdate(); });
		qs('.is-left', horizontal).addEventListener('click', function() { scroller.scrollLeft -= 48; scheduleUpdate(); });
		qs('.is-right', horizontal).addEventListener('click', function() { scroller.scrollLeft += 48; scheduleUpdate(); });
		qs('.win98-scrollbar-track', vertical).addEventListener('click', function(event) {
			if (event.target === event.currentTarget)
				pageStep('y', event.offsetY > qs('.win98-scrollbar-thumb', vertical).offsetTop ? 1 : -1);
		});
		qs('.win98-scrollbar-track', horizontal).addEventListener('click', function(event) {
			if (event.target === event.currentTarget)
				pageStep('x', event.offsetX > qs('.win98-scrollbar-thumb', horizontal).offsetLeft ? 1 : -1);
		});
		qs('.win98-scrollbar-thumb', vertical).addEventListener('pointerdown', function(event) { dragThumb(vertical, 'y', event); });
		qs('.win98-scrollbar-thumb', horizontal).addEventListener('pointerdown', function(event) { dragThumb(horizontal, 'x', event); });
		scroller.addEventListener('scroll', scheduleUpdate);
		window.addEventListener('resize', scheduleUpdate);
		new MutationObserver(scheduleUpdate).observe(scroller, {
			childList: true,
			subtree: true,
			characterData: true
		});
		setTimeout(update, 0);
		setTimeout(update, 250);
		setTimeout(update, 1000);
	}

	function focusWindow(win) {
		if (!win || win.classList.contains('is-minimized'))
			return;

		zIndex += 1;
		win.style.zIndex = zIndex;
		qsa('.win98-window.is-active').forEach(function(active) {
			active.classList.remove('is-active');
		});
		win.classList.add('is-active');
		updateTaskButtons(win.dataset.windowId);
		syncBrowserRoute(win, false);
	}

	function updateTaskButtons(activeId) {
		qsa('.win98-task-button', taskbar).forEach(function(button) {
			var win = windows[button.dataset.windowId];
			if (win)
				syncTaskButton(win, button);
			button.classList.toggle('is-active', button.dataset.windowId === activeId);
			button.classList.toggle('is-minimized', !!win && win.classList.contains('is-minimized'));
			button.classList.toggle('is-maximized', !!win && win.classList.contains('is-maximized'));
		});
	}

	function syncTaskButton(win, button) {
		var title;
		var icon;
		var classes;
		var titleIcon;
		if (!win)
			return;

		button = button || qs('.win98-task-button[data-window-id="' + win.dataset.windowId + '"]', taskbar);
		if (!button)
			return;

		title = win.dataset.windowTitle || (qs('.win98-window-title', win) || {}).textContent || '';
		icon = win.dataset.iconClass || iconClass(title, win.dataset.windowHref);

		button.textContent = title;
		button.title = title;
		classes = Array.prototype.filter.call(button.classList, function(cls) {
			return cls.indexOf('icon-') !== 0;
		});
		button.className = classes.concat(icon).join(' ');

		titleIcon = qs('.win98-window-title-icon', win);
		if (titleIcon)
			titleIcon.style.setProperty('--win98-title-icon', 'url("' + iconUrl(icon) + '")');
	}

	function makeButton(action, title) {
		var button = document.createElement('button');
		button.type = 'button';
		button.className = 'win98-window-button';
		button.dataset.windowAction = action;
		button.title = title;
		button.setAttribute('aria-label', title);
		return button;
	}

	function createTaskButton(win, title) {
		var button = document.createElement('button');
		button.type = 'button';
		win.dataset.windowTitle = title;
		button.className = 'win98-task-button ' + (win.dataset.iconClass || iconClass(title, win.dataset.windowHref));
		button.dataset.windowId = win.dataset.windowId;
		button.textContent = title;
		button.addEventListener('click', function() {
			if (win.classList.contains('is-minimized')) {
				win.classList.remove('is-minimized');
				focusWindow(win);
			} else if (win.classList.contains('is-active')) {
				win.classList.add('is-minimized');
				win.classList.remove('is-active');
				updateTaskButtons('');
			} else {
				focusWindow(win);
			}
		});
		taskbar.appendChild(button);
	}

	function setWindowState(win, state) {
		if (state === 'maximized') {
			if (!win.dataset.restoreStyle) {
				win.dataset.restoreStyle = [
					win.style.left,
					win.style.top,
					win.style.width,
					win.style.height
				].join('|');
			}
			win.classList.add('is-maximized');
			win.classList.remove('is-minimized');
		} else {
			var restore = (win.dataset.restoreStyle || '').split('|');
			win.classList.remove('is-maximized');
			if (restore.length === 4) {
				win.style.left = restore[0];
				win.style.top = restore[1];
				win.style.width = restore[2];
				win.style.height = restore[3];
			}
			delete win.dataset.restoreStyle;
		}
		focusWindow(win);
	}

	function syncMaximizeButton(win, button) {
		if (!button)
			return;

		if (win.classList.contains('is-maximized')) {
			button.dataset.windowAction = 'restore';
			button.title = 'Restore';
			button.setAttribute('aria-label', 'Restore');
		} else {
			button.dataset.windowAction = 'maximize';
			button.title = 'Maximize';
			button.setAttribute('aria-label', 'Maximize');
		}
	}

	function cssLengthToPixels(value, fallback, axis) {
		if (typeof value === 'number')
			return value;
		if (!value)
			return fallback;

		var probe = document.createElement('div');
		probe.style.position = 'absolute';
		probe.style.visibility = 'hidden';
		probe.style.boxSizing = 'border-box';
		if (axis === 'height')
			probe.style.height = value;
		else
			probe.style.width = value;
		desktop.appendChild(probe);
		var pixels = axis === 'height' ? probe.getBoundingClientRect().height : probe.getBoundingClientRect().width;
		probe.remove();
		return pixels || fallback;
	}

	function defaultWindowPosition(width, height) {
		var desktopWidth = desktop ? desktop.clientWidth : window.innerWidth;
		var desktopHeight = desktop ? desktop.clientHeight : window.innerHeight;
		var offset = qsa('.win98-window:not([data-window-position="manual"])', desktop).length * 28;
		var baseLeft = Math.max(0, Math.round((desktopWidth - width) / 2));
		var baseTop = Math.max(0, Math.round((desktopHeight - height) / 2));
		var maxLeft = Math.max(0, desktopWidth - width);
		var maxTop = Math.max(0, desktopHeight - height);
		var left = baseLeft + offset;
		var top = baseTop + offset;

		if (left > maxLeft)
			left = Math.max(0, baseLeft - Math.min(baseLeft, offset));
		if (top > maxTop)
			top = Math.max(0, baseTop - Math.min(baseTop, offset));

		return { left: Math.min(maxLeft, left), top: Math.min(maxTop, top) };
	}

	function makeWindow(title, options) {
		options = options || {};
		windowCount += 1;
		var width = options.width || 'min(calc(100vw - 112px), max(1176px, 78vw))';
		var height = options.height || 'min(calc(100vh - 136px), max(780px, 78vh))';
		var measuredWidth = cssLengthToPixels(width, 720, 'width');
		var measuredHeight = cssLengthToPixels(height, 480, 'height');
		var position = options.left != null && options.top != null
			? { left: options.left, top: options.top }
			: defaultWindowPosition(measuredWidth, measuredHeight);

		var win = document.createElement('section');
		win.className = 'win98-window';
		win.dataset.windowId = 'win98-window-' + windowCount;
		win.dataset.windowHref = options.href || '';
		win.dataset.iconClass = iconClass(title, win.dataset.windowHref);
		if (options.manualPosition)
			win.dataset.windowPosition = 'manual';
		win.style.left = position.left + 'px';
		win.style.top = position.top + 'px';
		win.style.width = width;
		win.style.height = height;

		var titlebar = document.createElement('div');
		titlebar.className = 'win98-window-titlebar';

		var titleIcon = document.createElement('span');
		titleIcon.className = 'win98-window-title-icon';
		titleIcon.style.setProperty('--win98-title-icon', 'url("' + iconUrl(win.dataset.iconClass) + '")');

		var caption = document.createElement('span');
		caption.className = 'win98-window-title';
		caption.textContent = title;

		var controls = document.createElement('div');
		controls.className = 'win98-window-controls';
		var minimize = makeButton('minimize', 'Minimize');
		var maximize = makeButton('maximize', 'Maximize');
		var close = makeButton('close', 'Close');
		controls.append(minimize, maximize, close);
		titlebar.append(titleIcon, caption, controls);

		var body = document.createElement('div');
		body.className = 'win98-window-body';

		var toolbar = makeWindowToolbar();
		body.appendChild(makeWindowMenu());
		body.appendChild(toolbar);

		var content = document.createElement('div');
		content.className = 'win98-window-content';
		body.appendChild(content);

		win.append(titlebar, body);
		desktop.appendChild(win);
		windows[win.dataset.windowId] = win;
		createTaskButton(win, title);

		win.addEventListener('mousedown', function() {
			focusWindow(win);
		});
		minimize.addEventListener('click', function(event) {
			event.stopPropagation();
			win.classList.add('is-minimized');
			win.classList.remove('is-active');
			updateTaskButtons('');
		});
		maximize.addEventListener('click', function(event) {
			event.stopPropagation();
			setWindowState(win, win.classList.contains('is-maximized') ? 'normal' : 'maximized');
			syncMaximizeButton(win, maximize);
		});
		close.addEventListener('click', function(event) {
			event.stopPropagation();
			var button = qs('.win98-task-button[data-window-id="' + win.dataset.windowId + '"]', taskbar);
			if (button)
				button.remove();
			delete windows[win.dataset.windowId];
			win.remove();
			var remaining = qsa('.win98-window:not(.is-minimized)');
			if (remaining.length)
				focusWindow(remaining[remaining.length - 1]);
		});
		enableDrag(win, titlebar);
		titlebar.addEventListener('dblclick', function(event) {
			if (event.target.closest('.win98-window-controls'))
				return;
			setWindowState(win, win.classList.contains('is-maximized') ? 'normal' : 'maximized');
			syncMaximizeButton(win, maximize);
		});
		if (options.focus !== false)
			focusWindow(win);
		return { win: win, body: content, title: caption, toolbar: toolbar };
	}

	function makeWindowMenu() {
		var menu = document.createElement('div');
		menu.className = 'win98-window-menu';

		['File', 'Edit', 'View', 'Go', 'Favorites', 'Help'].forEach(function(label) {
			var item = document.createElement('button');
			item.type = 'button';
			item.textContent = label;
			item.tabIndex = -1;
			menu.appendChild(item);
		});

		var badge = document.createElement('span');
		badge.className = 'win98-window-menu-badge';
		menu.appendChild(badge);
		return menu;
	}

	function makeWindowToolbar() {
		var toolbar = document.createElement('div');
		toolbar.className = 'win98-window-toolbar';

		[
			['back', 'Back'],
			['forward', 'Forward'],
			['up', 'Up']
		].forEach(function(def) {
			var button = document.createElement('button');
			button.type = 'button';
			button.className = 'win98-window-tool win98-window-tool-' + def[0];
			button.dataset.windowTool = def[0];
			button.textContent = def[1];
			button.tabIndex = -1;
			button.disabled = true;
			toolbar.appendChild(button);
		});

		return toolbar;
	}

	function toolbarButton(toolbar, action) {
		return toolbar ? qs('[data-window-tool="' + action + '"]', toolbar) : null;
	}

	function setToolbarState(toolbar, state) {
		['back', 'forward', 'up'].forEach(function(action) {
			var button = toolbarButton(toolbar, action);
			if (button)
				button.disabled = !state[action];
		});
	}

	function findMenuNodeByHref(root, href) {
		var targetRoute = routeFromHref(href);
		var found = null;

		function walk(node) {
			if (!node || found)
				return;
			if (node.href && routeFromHref(node.href) === targetRoute) {
				found = node;
				return;
			}
			(node.children || []).forEach(walk);
		}

		walk(root);
		return found;
	}

	function findOverviewMenuNode(root) {
		var found = null;

		function walk(node) {
			if (!node || found)
				return;
			if (node.icon === 'icon-overview' || (node.title || '').replace(/\s+/g, ' ').trim().toLowerCase() === 'overview') {
				found = node;
				return;
			}
			(node.children || []).forEach(walk);
		}

		walk(root);
		return found;
	}

	function enableDrag(win, handle) {
		var startX, startY, startLeft, startTop, dragging = false;

		handle.addEventListener('pointerdown', function(event) {
			if (event.button !== 0 || event.target.closest('.win98-window-controls') || win.classList.contains('is-maximized'))
				return;

			dragging = true;
			startX = event.clientX;
			startY = event.clientY;
			startLeft = win.offsetLeft;
			startTop = win.offsetTop;
			document.body.classList.add('win98-dragging');
			event.preventDefault();
			if (handle.setPointerCapture)
				handle.setPointerCapture(event.pointerId);
			focusWindow(win);
		});

		handle.addEventListener('pointermove', function(event) {
			if (!dragging)
				return;

			var maxLeft = Math.max(0, desktop.clientWidth - win.offsetWidth);
			var maxTop = Math.max(0, desktop.clientHeight - win.offsetHeight);
			var left = Math.min(maxLeft, Math.max(0, startLeft + event.clientX - startX));
			var top = Math.min(maxTop, Math.max(0, startTop + event.clientY - startY));
			win.style.left = left + 'px';
			win.style.top = top + 'px';
		});

		handle.addEventListener('pointerup', function(event) {
			if (dragging) {
				dragging = false;
				if (handle.releasePointerCapture)
					handle.releasePointerCapture(event.pointerId);
				document.body.classList.remove('win98-dragging');
			}
		});

		handle.addEventListener('pointercancel', function(event) {
			if (dragging) {
				dragging = false;
				if (handle.releasePointerCapture)
					handle.releasePointerCapture(event.pointerId);
				document.body.classList.remove('win98-dragging');
			}
		});
	}

	function openFrameWindow(title, href) {
		var created = makeWindow(title, {
			width: 'min(calc(100vw - 112px), max(1224px, 78vw))',
			height: 'min(calc(100vh - 136px), max(828px, 78vh))',
			href: href
		});
		var frame = document.createElement('iframe');

		frame.className = 'win98-window-frame';
		frame.src = href;
		frame.title = title;
		frame.addEventListener('load', function() {
			try {
				created.win.dataset.windowHref = frame.contentWindow.location.href;
				installTabAddressSync(frame.contentDocument, created.win);
				installFramedScrollbars(frame.contentDocument);
				installInnerScrollbars(frame.contentDocument);
			} catch (e) {
				created.win.dataset.windowHref = frame.src;
			}
			if (created.win.classList.contains('is-active'))
				syncBrowserRoute(created.win, false);
		});
		created.body.classList.add('has-frame');
		created.body.appendChild(frame);
		return created.win;
	}

	function closeStartMenu() {
		var start = qs('.win98-start');
		if (start)
			start.removeAttribute('open');
	}

	function iconUrl(icon, size) {
		var name = (icon || 'icon-app').replace(/^icon-/, '');
		var map = {
			admin: 'admin-detail',
			'control-panel': 'control-panel',
			system: 'system-detail',
			log: 'log-detail',
			processes: 'process-detail',
			software: 'software-detail',
			startup: 'startup-detail',
			crontab: 'crontab-detail',
			flash: 'flash-detail',
			reboot: 'reboot-detail',
			bandwidth: 'bandwidth-detail',
			upnp: 'upnp-detail',
			dhcp: 'dhcp-detail',
			binding: 'binding-detail',
			diagnostics: 'diagnostics-detail',
			speedtest: 'speedtest-detail'
		};
		return '/luci-static/win98/icons/menu/large/' + (map[name] || name || 'app') + '.png';
	}

	function menuNodeFromLi(li, parent) {
		var link = qs(':scope > a', li);
		var childList = qs(':scope > ul', li);
		var title = textOf(link);
		var href = link ? link.href : '';
		var node = {
			title: title,
			href: href,
			parent: parent || null,
			children: [],
			icon: iconClass(title, href)
		};

		if (childList) {
			node.children = qsa(':scope > li', childList).map(function(child) {
				return menuNodeFromLi(child, node);
			});
			if (node.icon === 'icon-app')
				node.icon = 'icon-folder';
		}

		return node;
	}

	function topLevelMenuNode(list) {
		var node = {
			title: 'Control Panel',
			href: '',
			parent: null,
			children: [],
			icon: 'icon-control-panel'
		};

		node.children = qsa(':scope > li', list).map(function(li) {
			return menuNodeFromLi(li, node);
		}).filter(function(child) {
			return child.children && child.children.length;
		});

		return node;
	}

	function activateFolderItem(node, navigate) {
		if (node.children && node.children.length) {
			navigate({ type: 'folder', node: node }, true);
			return;
		}

		if (!node.href)
			return;

		if (node.href.indexOf('/admin/logout') !== -1)
			window.location.href = node.href;
		else
			navigate({ type: 'page', node: node }, true);
	}

	function openFolderWindow(rootNode, options) {
		options = options || {};
		var created = makeWindow(rootNode.title, {
			width: 'min(calc(100vw - 112px), max(984px, 78vw))',
			height: 'min(calc(100vh - 136px), max(672px, 78vh))',
			left: options.left,
			top: options.top,
			focus: options.focus,
			manualPosition: options.manualPosition
		});
		var history = options.initialEntry
			? [{ type: 'folder', node: options.initialEntry.node.parent || rootNode }, options.initialEntry]
			: [{ type: 'folder', node: rootNode }];
		var index = history.length - 1;

		created.body.classList.add('is-control-panel');

		function currentEntry() {
			return history[index];
		}

		function updateNavigation() {
			var entry = currentEntry();
			var node = entry.node;
			setToolbarState(created.toolbar, {
				back: index > 0,
				forward: index < history.length - 1,
				up: entry.type === 'page' || !!node.parent
			});
			created.title.textContent = node.title;
			created.win.dataset.windowTitle = node.title;
			created.win.dataset.iconClass = node.icon;
			created.win.dataset.windowHref = entry.type === 'page' ? node.href : '';
			syncTaskButton(created.win);
		}

		function selectItem(item) {
			var description = qs('.win98-folder-sidebar-description', created.body);
			qsa('.win98-control-panel-item.is-selected', created.body).forEach(function(selected) {
				selected.classList.remove('is-selected');
			});
			item.classList.add('is-selected');
			if (description)
				description.textContent = 'Double-click to open ' + (item.title || textOf(item)) + '.';
		}

		function navigate(entry, push) {
			if (push) {
				history = history.slice(0, index + 1);
				history.push(entry);
				index = history.length - 1;
			}
			render(entry);
		}

		function render(entry) {
			var node = entry.node;
			created.body.textContent = '';
			created.body.classList.toggle('has-frame', entry.type === 'page');
			created.body.classList.toggle('is-control-panel', entry.type === 'folder');
			created.body.classList.toggle('has-webview-sidebar', entry.type === 'folder');

			if (entry.type === 'page') {
				var frame = document.createElement('iframe');
				frame.className = 'win98-window-frame';
				frame.src = node.href;
				frame.title = node.title;
				frame.addEventListener('load', function() {
					try {
						node.href = frame.contentWindow.location.href;
						created.win.dataset.windowHref = node.href;
						created.win.dataset.windowTitle = node.title;
						created.win.dataset.iconClass = node.icon;
						syncTaskButton(created.win);
						installTabAddressSync(frame.contentDocument, created.win);
						installFramedScrollbars(frame.contentDocument);
						installInnerScrollbars(frame.contentDocument);
					} catch (e) {
						created.win.dataset.windowHref = frame.src;
						syncTaskButton(created.win);
					}
					if (created.win.classList.contains('is-active'))
						syncBrowserRoute(created.win, false);
				});
				created.body.appendChild(frame);
				updateNavigation();
				return;
			}

			var shell = document.createElement('div');
			var sidebar = document.createElement('aside');
			var sideIcon = document.createElement('span');
			var sideTitle = document.createElement('strong');
			var sideLine = document.createElement('span');
			var sideDescription = document.createElement('p');
			var view = document.createElement('div');
			var statusbar = document.createElement('div');
			var countPane = document.createElement('span');
			var spacerPane = document.createElement('span');
			var titlePane = document.createElement('span');
			shell.className = 'win98-folder-shell';
			sidebar.className = 'win98-folder-sidebar';
			sideIcon.className = 'win98-folder-sidebar-icon';
			sideIcon.style.setProperty('--win98-sidebar-icon', 'url("' + iconUrl(node.icon, 'large') + '")');
			sideTitle.className = 'win98-folder-sidebar-title';
			sideTitle.textContent = node.title;
			sideLine.className = 'win98-folder-sidebar-line';
			sideDescription.className = 'win98-folder-sidebar-description';
			sideDescription.textContent = 'Select an item to view its description.';
			sidebar.append(sideIcon, sideTitle, sideLine, sideDescription);
			view.className = 'win98-control-panel-view';
			(node.children || []).forEach(function(child) {
				var item = document.createElement('button');
				item.type = 'button';
				item.className = 'win98-control-panel-item ' + child.icon;
				item.style.setProperty('--win98-item-icon', 'url("' + iconUrl(child.icon, 'large') + '")');
				item.title = child.title;

				var label = document.createElement('span');
				label.textContent = child.title;
				item.appendChild(label);

				item.addEventListener('mousedown', function() {
					selectItem(item);
				});
				item.addEventListener('dblclick', function() {
					activateFolderItem(child, navigate);
				});
				item.addEventListener('keydown', function(event) {
					if (event.key === 'Enter') {
						event.preventDefault();
						activateFolderItem(child, navigate);
					}
				});
				view.appendChild(item);
			});

			if (!node.children || !node.children.length) {
				var empty = document.createElement('p');
				empty.className = 'win98-control-panel-empty';
				empty.textContent = 'This folder is empty.';
				view.appendChild(empty);
			}

			shell.append(sidebar, view);
			created.body.appendChild(shell);
			statusbar.className = 'win98-folder-statusbar';
			countPane.className = 'win98-folder-statusbar-pane is-count';
			countPane.textContent = (node.children || []).length + ' object' + ((node.children || []).length === 1 ? '' : 's');
			spacerPane.className = 'win98-folder-statusbar-pane is-spacer';
			titlePane.className = 'win98-folder-statusbar-pane is-title ' + node.icon;
			titlePane.style.setProperty('--win98-status-icon', 'url("' + iconUrl(node.icon) + '")');
			titlePane.textContent = node.title;
			statusbar.append(countPane, spacerPane, titlePane);
			created.body.appendChild(statusbar);
			updateNavigation();
		}

		toolbarButton(created.toolbar, 'back').addEventListener('click', function() {
			if (index > 0) {
				index -= 1;
				render(currentEntry());
			}
		});
		toolbarButton(created.toolbar, 'forward').addEventListener('click', function() {
			if (index < history.length - 1) {
				index += 1;
				render(currentEntry());
			}
		});
		toolbarButton(created.toolbar, 'up').addEventListener('click', function() {
			var entry = currentEntry();
			var node = entry.node;
			if (entry.type === 'page') {
				navigate({ type: 'folder', node: node.parent || rootNode }, true);
			} else if (node.parent) {
				navigate({ type: 'folder', node: node.parent }, true);
			}
		});

		render(currentEntry());
		return created.win;
	}

	function exposeApi() {
		window.win98Theme = window.win98Theme || {};
		window.win98Theme.openWindow = function(title, href) {
			return openFrameWindow(title, new URL(href, window.location.href).href);
		};
	}

	function buildMenuList(list, parentNode) {
		var out = document.createElement('ul');
		out.className = 'win98-start-list';

		qsa(':scope > li', list).forEach(function(li) {
			var link = qs(':scope > a', li);
			if (!link)
				return;

			var node = menuNodeFromLi(li, parentNode || null);
			var item = document.createElement('li');
			var anchor = document.createElement('a');
			anchor.href = node.href;
			anchor.textContent = node.title;
			anchor.setAttribute('role', 'menuitem');

			var childList = qs(':scope > ul', li);
			if (childList) {
				item.className = 'has-children is-folder ' + iconClass(anchor.textContent, link.href);
				anchor.href = '#';
				anchor.addEventListener('click', function(event) {
					event.preventDefault();
					openFolderWindow(node);
					closeStartMenu();
				});
				item.appendChild(anchor);
				item.appendChild(buildMenuList(childList, node));
			} else {
				item.className = 'is-leaf ' + iconClass(anchor.textContent, anchor.href);
				anchor.addEventListener('click', function(event) {
					if (anchor.href.indexOf('/admin/logout') === -1) {
						event.preventDefault();
						if (node.parent) {
							openFolderWindow(node.parent, {
								initialEntry: { type: 'page', node: node }
							});
						} else {
							openFrameWindow(anchor.textContent, anchor.href);
						}
						closeStartMenu();
					}
				});
				item.appendChild(anchor);
			}

			out.appendChild(item);
		});

		if (!parentNode) {
			qsa(':scope > li', out).forEach(function(item) {
				if (item.classList.contains('icon-logout'))
					item.classList.add('is-start-logout');
			});
		}

		return out;
	}

	function iconClass(label, href) {
		var value = ((label || '') + ' ' + (href || '')).toLowerCase();
		var title = (label || '').replace(/\s+/g, ' ').trim().toLowerCase();
		try {
			var url = new URL(href || '', window.location.href);
			if (href && /\/cgi-bin\/luci\/?$/.test(url.pathname))
				return 'icon-overview';
		} catch (e) {}
		if (title === 'status')
			return 'icon-status';
		if (title === 'system')
			return 'icon-system';
		if (title === 'control panel')
			return 'icon-control-panel';
		if (title === 'services')
			return 'icon-services';
		if (title === 'network')
			return 'icon-network';
		if (title === 'administration')
			return 'icon-admin';
		if (value.indexOf('logout') !== -1 || value.indexOf('log out') !== -1)
			return 'icon-logout';
		if (value.indexOf('overview') !== -1)
			return 'icon-overview';
		if (value.indexOf('realtime') !== -1 || value.indexOf('graph') !== -1)
			return 'icon-realtime';
		if (value.indexOf('route') !== -1 || value.indexOf('routing') !== -1)
			return 'icon-routes';
		if (value.indexOf('nftables') !== -1 || value.indexOf('firewall') !== -1)
			return 'icon-firewall';
		if (value.indexOf('system log') !== -1 || value.indexOf('/logs') !== -1 || value.indexOf('log') !== -1)
			return 'icon-log';
		if (value.indexOf('process') !== -1)
			return 'icon-processes';
		if (value.indexOf('mwan') !== -1 || value.indexOf('multiwan') !== -1)
			return 'icon-mwan';
		if (value.indexOf('package-manager') !== -1 || value.indexOf('software') !== -1 || value.indexOf('package') !== -1)
			return 'icon-software';
		if (value.indexOf('startup') !== -1)
			return 'icon-startup';
		if (value.indexOf('crontab') !== -1 || value.indexOf('scheduled') !== -1)
			return 'icon-crontab';
		if (value.indexOf('firmware') !== -1 || value.indexOf('upgrade') !== -1)
			return 'icon-software';
		if (value.indexOf('flash') !== -1 || value.indexOf('backup') !== -1)
			return 'icon-flash';
		if (value.indexOf('reboot') !== -1)
			return 'icon-reboot';
		if (value.indexOf('service') !== -1)
			return 'icon-services';
		if (value.indexOf('nlbw') !== -1 || value.indexOf('bandwidth') !== -1)
			return 'icon-bandwidth';
		if (value.indexOf('upnp') !== -1 || value.indexOf('pcp') !== -1)
			return 'icon-upnp';
		if (value.indexOf('interface') !== -1 || value.indexOf('/network/network') !== -1)
			return 'icon-interfaces';
		if (value.indexOf('dhcp') !== -1 || value.indexOf('dns') !== -1)
			return 'icon-dhcp';
		if (value.indexOf('arpbind') !== -1 || value.indexOf('ip/mac') !== -1 || value.indexOf('binding') !== -1)
			return 'icon-binding';
		if (value.indexOf('diagnostics') !== -1)
			return 'icon-diagnostics';
		if (value.indexOf('speedtest') !== -1)
			return 'icon-speedtest';
		if (value.trim() === 'system' || /\/admin\/system\/system(?:$|\?|#)/.test(value))
			return 'icon-system';
		if (value.indexOf('admin') !== -1 || value.indexOf('password') !== -1 || value.indexOf('administration') !== -1)
			return 'icon-admin';
		if (value.indexOf('service') !== -1)
			return 'icon-services';
		if (value.indexOf('status') !== -1)
			return 'icon-status';
		if (value.indexOf('services') !== -1)
			return 'icon-services';
		if (value.indexOf('network') !== -1 || value.indexOf('wireless') !== -1)
			return 'icon-network';
		return 'icon-app';
	}

	function buildStartMenu() {
		var source = qs('#mainmenu ul.l1');
		var target = qs('[data-win98-start-menu]');
		if (!source || !target)
			return false;

		lastMenuSource = source;
		target.textContent = '';
		target.appendChild(buildMenuList(source));
		return true;
	}

	function openVirtualRootWindow(options) {
		var node;
		var source = lastMenuSource || qs('#mainmenu ul.l1');
		if (!source)
			return null;

		node = topLevelMenuNode(source);
		if (!node.children.length)
			return null;

		return openFolderWindow(node, options || {});
	}

	function maybeOpenTopLevelWindow(source) {
		var active;
		var left;
		var top;
		if (openedTopLevelWindow || !source)
			return;

		lastMenuSource = source;

		openedTopLevelWindow = true;
		active = qs('.win98-window.is-active');
		left = active ? Math.max(0, active.offsetLeft - 96) : undefined;
		top = active ? Math.max(0, active.offsetTop - 72) : undefined;
		openVirtualRootWindow({
			left: left,
			top: top,
			focus: false,
			manualPosition: true
		});
	}

	function wireInitialWindowUp(source) {
		var rootNode;
		var node;
		var up;
		if (!initialWindow || initialWindow.dataset.win98InitialUp === '1' || !source)
			return;

		rootNode = topLevelMenuNode(source);
		node = findMenuNodeByHref(rootNode, initialWindow.dataset.windowHref || window.location.href);
		if (!node && isRootRoute())
			node = findOverviewMenuNode(rootNode);
		if (!node || !node.parent)
			return;

		initialWindow.dataset.win98InitialUp = '1';
		initialWindow.dataset.iconClass = node.icon;
		initialWindow.dataset.windowTitle = node.title;
		syncTaskButton(initialWindow);
		up = toolbarButton(qs('.win98-window-toolbar', initialWindow), 'up');
		if (!up)
			return;

		up.disabled = false;
		up.addEventListener('click', function() {
			openFolderWindow(node.parent, {
				initialEntry: { type: 'page', node: node },
				focus: true
			});
		});
	}

	function clearDesktopSelection(except) {
		qsa('.win98-desktop-icon.is-selected', desktop).forEach(function(icon) {
			if (icon !== except)
				icon.classList.remove('is-selected');
		});
	}

	function installDesktopIcons() {
		var icon = document.createElement('button');
		icon.type = 'button';
		icon.className = 'win98-desktop-icon icon-control-panel';
		icon.title = 'Control Panel';
		icon.innerHTML = '<span class="win98-desktop-icon-image"></span><span class="win98-desktop-icon-label">Control Panel</span>';
		icon.style.setProperty('--win98-desktop-icon', 'url("' + iconUrl('icon-control-panel', 'large') + '")');

		icon.addEventListener('mousedown', function(event) {
			event.stopPropagation();
			clearDesktopSelection(icon);
			icon.classList.add('is-selected');
		});

		icon.addEventListener('dblclick', function(event) {
			event.preventDefault();
			event.stopPropagation();
			openVirtualRootWindow();
		});

		icon.addEventListener('keydown', function(event) {
			if (event.key === 'Enter') {
				event.preventDefault();
				openVirtualRootWindow();
			}
		});

		desktop.addEventListener('mousedown', function(event) {
			if (!event.target.closest('.win98-desktop-icon'))
				clearDesktopSelection();
		});

		desktop.appendChild(icon);
	}

	function installWin98Tooltips() {
		var tooltip;
		var activeTarget;
		var selector = [
			'.win98-desktop-icon',
			'.win98-control-panel-item',
			'.win98-window-button',
			'.win98-window-tool',
			'.win98-task-button',
			'[data-win98-clock]'
		].join(', ');

		function ensureTooltip() {
			if (tooltip)
				return tooltip;

			tooltip = document.createElement('div');
			tooltip.className = 'win98-tooltip';
			tooltip.setAttribute('role', 'tooltip');
			document.body.appendChild(tooltip);
			return tooltip;
		}

		function tooltipText(target) {
			if (!target)
				return '';

			if (target.title) {
				target.dataset.win98Tooltip = target.title;
				target.removeAttribute('title');
			}

			return target.dataset.win98Tooltip ||
				target.getAttribute('aria-label') ||
				target.dataset.windowTitle ||
				textOf(target);
		}

		function moveTooltip(event) {
			var tip = ensureTooltip();
			var left = event.clientX + 12;
			var top = event.clientY + 18;
			var rect;

			tip.style.left = left + 'px';
			tip.style.top = top + 'px';
			rect = tip.getBoundingClientRect();

			if (rect.right > window.innerWidth - 4)
				left = Math.max(4, event.clientX - rect.width - 12);
			if (rect.bottom > window.innerHeight - 4)
				top = Math.max(4, event.clientY - rect.height - 12);

			tip.style.left = left + 'px';
			tip.style.top = top + 'px';
		}

		function showTooltip(target, event) {
			var text = tooltipText(target);
			var tip;
			if (!text)
				return;

			activeTarget = target;
			tip = ensureTooltip();
			tip.textContent = text;
			tip.style.display = 'block';
			if (event && event.clientX != null)
				moveTooltip(event);
			else {
				var rect = target.getBoundingClientRect();
				moveTooltip({ clientX: rect.left + 8, clientY: rect.bottom });
			}
		}

		function hideTooltip(target) {
			if (target && activeTarget && target !== activeTarget)
				return;

			activeTarget = null;
			if (tooltip)
				tooltip.style.display = 'none';
		}

		document.addEventListener('mouseover', function(event) {
			var target = event.target.closest && event.target.closest(selector);
			if (!target || target.contains(event.relatedTarget))
				return;
			showTooltip(target, event);
		});

		document.addEventListener('mousemove', function(event) {
			if (activeTarget)
				moveTooltip(event);
		});

		document.addEventListener('mouseout', function(event) {
			var target = event.target.closest && event.target.closest(selector);
			if (!target || target.contains(event.relatedTarget))
				return;
			hideTooltip(target);
		});

		document.addEventListener('focusin', function(event) {
			var target = event.target.closest && event.target.closest(selector);
			if (target)
				showTooltip(target);
		});

		document.addEventListener('focusout', function(event) {
			var target = event.target.closest && event.target.closest(selector);
			if (target)
				hideTooltip(target);
		});

		window.addEventListener('blur', function() {
			hideTooltip();
		});
	}

	function waitForMenu() {
		var attempts = 0;
		var timer = setInterval(function() {
			var source = qs('#mainmenu ul.l1');
			attempts += 1;
			if (buildStartMenu() || attempts > 80) {
				clearInterval(timer);
				wireInitialWindowUp(source);
				maybeOpenTopLevelWindow(source);
			}
		}, 100);
	}

	function makeDesktop() {
		mainContent = qs('#maincontent');
		if (!mainContent || mainContent.dataset.win98Windowed === '1')
			return;

		mainContent.dataset.win98Windowed = '1';
		mainContent.classList.add('win98-desktop-host');
		desktop = document.createElement('div');
		desktop.className = 'win98-desktop';
		taskbar = qs('.win98-footer-stats');

		var currentNodes = [];
		qsa(':scope > *', mainContent).forEach(function(node) {
			if (node.id !== 'content')
				currentNodes.push(node);
		});

		mainContent.appendChild(desktop);
		installDesktopIcons();
		var initial = makeWindow(pageTitle(), {
			width: 'min(calc(100vw - 112px), max(1104px, 78vw))',
			height: 'min(calc(100vh - 136px), max(720px, 78vh))',
			href: window.location.href
		});
		initialWindow = initial.win;

		currentNodes.forEach(function(node) {
			initial.body.appendChild(node);
		});
		installWindowContentScrollbars(initial.body);
		installTabAddressSync(document, initial.win);
	}

	function boot() {
		if (window.self !== window.top) {
			document.documentElement.classList.add('win98-framed-page');
			return;
		}

		makeDesktop();
		exposeApi();
		installWin98Tooltips();
		waitForMenu();
	}

	if (document.readyState === 'loading')
		document.addEventListener('DOMContentLoaded', boot);
	else
		boot();
})();
