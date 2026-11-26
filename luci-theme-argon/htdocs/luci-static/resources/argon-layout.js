'use strict';
'require baseclass';
'require ui';

const TAB_STRIP = '#tabmenu > ul.tabs, ul.cbi-tabmenu';
const OVERVIEW = 'admin-status-overview';
const LEASE_TABLE = 'table#status_leases, table#status_leases6';
const RULE_SUMMARY = ':is(#cbi-firewall-rule, #cbi-firewall-nat, #cbi-firewall-redirect) .cbi-section-table-row > .td[data-name="_match"] small:has(> span:first-child + br + span + br + span)';
const FIREWALL_HANDLE = ':is(#cbi-firewall-zone, #cbi-firewall-rule, #cbi-firewall-nat, #cbi-firewall-redirect) .cbi-section-actions .drag-handle';
const DROP_MARK = '.drag-over-above, .drag-over-below';

function fitTabs(strip, narrow) {
	strip.classList.remove('argon-tabs-compact');
	if (!narrow || !strip.clientWidth)
		return;
	const nativeRealtimeTabs = document.body.dataset.page?.startsWith('admin-status-realtime-') &&
		strip.matches('#tabmenu > ul.tabs, #map > ul.cbi-tabmenu');
	if (!nativeRealtimeTabs && strip.scrollWidth > strip.clientWidth)
		strip.classList.add('argon-tabs-compact');

	const active = strip.querySelector(':scope > li.active, :scope > li.cbi-tab');
	if (!active || strip.scrollWidth <= strip.clientWidth)
		return;

	// Scroll only this strip, not its closest page scroller.
	const bounds = strip.getBoundingClientRect();
	const left = bounds.left + strip.clientLeft;
	const right = left + strip.clientWidth;
	const tab = active.getBoundingClientRect();
	if (tab.left < left)
		strip.scrollLeft += Math.floor(tab.left - left);
	else if (tab.right > right)
		strip.scrollLeft += Math.ceil(Math.min(tab.right - right, tab.left - left));
}

function labelLeases(view) {
	if (!view || view.parentElement.classList.contains('argon-staging'))
		return;

	// LuCI recreates these two tables on each status poll. Keep the native rows and controls.
	view.querySelectorAll(LEASE_TABLE).forEach(function(table) {
		const titles = table.querySelector('tr.table-titles');
		if (!titles || !titles.cells.length)
			return;

		const headers = Array.from(titles.cells, function(header) {
			return { label: header.textContent.trim(), action: header.classList.contains('cbi-section-actions') };
		});
		table.setAttribute('role', 'table');
		Array.from(table.tBodies).forEach(group => group.setAttribute('role', 'rowgroup'));
		Array.from(titles.cells).forEach(header => header.setAttribute('role', 'columnheader'));
		Array.from(table.rows).forEach(function(row) {
			row.setAttribute('role', 'row');
			if (row === titles)
				return;
			Array.from(row.cells).forEach(function(cell, i) {
				cell.setAttribute('role', 'cell');
				const header = headers[i];
				if (header && cell.colSpan === 1 && !row.classList.contains('placeholder')) {
					cell.setAttribute('data-argon-lease-label', header.label);
					cell.toggleAttribute('data-argon-lease-action', header.action ||
						(i === headers.length - 1 && !!cell.querySelector('button, input[type="button"]')));
				}
			});
		});

		if (!table.parentElement.classList.contains('argon-lease-list')) {
			const container = document.createElement('div');
			container.className = 'argon-lease-list';
			table.before(container);
			container.append(table);
		}
	});
}

function formatRuleSummaries(view) {
	if (!view || view.parentElement.classList.contains('argon-staging'))
		return;

	const portLabels = new Set(['port', '\u7aef\u53e3', _('port'), _('Port')].map(s => s.toLowerCase()));
	view.querySelectorAll(RULE_SUMMARY).forEach(function(summary) {
		// Keep the flow on one line, except for its destination port field.
		Array.from(summary.children[4].childNodes).forEach(function(node) {
			if (node.nodeType !== 3 || node.nextSibling?.nodeName !== 'VAR')
				return;
			const match = node.data.match(/^(\s*[,\u060c\u3001\uff0c]\s*)(\S.*?)\s*[:\uff1a]?\s*$/);
			if (!match || !portLabels.has(match[2].trim().toLowerCase()))
				return;
			node.splitText(match[1].length);
			node.replaceWith(E('span', { 'class': 'argon-rule-field-break' }, [
				E('span', {}, [document.createTextNode(node.data)]), E('br', { hidden: '' })
			]));
		});
	});
}

function supportFirewallTouchSort(root, narrow) {
	const scroller = root.closest('.main-right');
	if (!scroller)
		return;

	// Update the content scroller before LuCI measures the native drop target.
	root.addEventListener('touchmove', function(ev) {
		const touch = ev.targetTouches[0];
		if (!narrow.matches || !touch || !ev.target.matches?.(FIREWALL_HANDLE))
			return;
		const bounds = scroller.getBoundingClientRect();
		if (touch.clientY < Math.max(0, bounds.top) + 30)
			scroller.scrollTop -= 30;
		else if (touch.clientY > Math.min(window.innerHeight, bounds.bottom) - 30)
			scroller.scrollTop += 30;
	}, { capture: true, passive: true });

	// Native hit testing leaves the gaps between cards without a drop target.
	root.addEventListener('touchmove', function(ev) {
		const touch = ev.targetTouches[0];
		if (!narrow.matches || !touch || !ev.target.matches?.(FIREWALL_HANDLE))
			return;
		const group = ev.target.closest('tbody');
		if (!group || !document.querySelector('.touchsort-element'))
			return;
		let visibleDrop = false;
		for (const row of group.querySelectorAll(DROP_MARK)) {
			if (row.getBoundingClientRect().height && !row.classList.contains('placeholder'))
				visibleDrop = true;
			else
				row.classList.remove('drag-over-above', 'drag-over-below');
		}
		if (visibleDrop)
			return;
		let last = null;
		for (const row of group.children) {
			if (!row.matches('.cbi-section-table-row:not(.placeholder)'))
				continue;
			const rect = row.getBoundingClientRect();
			if (!rect.height)
				continue;
			if (touch.clientY < rect.top) {
				row.classList.add('drag-over-above');
				return;
			}
			last = row;
		}
		last?.classList.add('drag-over-below');
	}, { passive: true });

	root.addEventListener('touchcancel', function(ev) {
		if (!ev.target.matches?.(FIREWALL_HANDLE))
			return;
		document.querySelector('.touchsort-element')?.remove();
		ev.target.closest('tbody')?.querySelectorAll(DROP_MARK).forEach(function(row) {
			row.classList.remove('drag-over-above', 'drag-over-below');
		});
	}, { passive: true });
}

function watchPackageDialogs() {
	const modal = document.querySelector('#modal_overlay > .modal');
	if (!modal)
		return;

	function classify() {
		let type = '';
		if (/^admin-system-(?:opkg|package-manager)$/.test(document.body.dataset.page || '')) {
			if (modal.querySelector(':scope > pre') && modal.querySelector(':scope > .button-row'))
				type = 'log';
			else if (modal.querySelector(':scope > .right > .btn[data-command][data-package]'))
				type = modal.querySelector('input[name="overwrite"]') ? 'details' : 'confirm';
		}
		if (type)
			modal.dataset.argonPackageDialog = type;
		else
			delete modal.dataset.argonPackageDialog;
	}

	new MutationObserver(classify).observe(modal, { childList: true });
	classify();
}

return baseclass.extend({
	__init__: function() {
		const root = document.getElementById('maincontent');
		if (!root)
			return;
		watchPackageDialogs();

		const narrow = matchMedia('(max-width: 768px), (max-width: 1024px) and (pointer: coarse)');
		supportFirewallTouchSort(root, narrow);
		const strips = new Map(), pending = new Set();
		let frame = 0, leases = true, rules = true;

		function schedule() {
			if (frame)
				return;
			frame = requestAnimationFrame(function() {
				frame = 0;
				if (leases && document.body.dataset.page === OVERVIEW)
					labelLeases(root.querySelector('#view'));
				if (rules)
					formatRuleSummaries(root.querySelector('#view'));
				leases = false;
				rules = false;
				pending.forEach(function(strip) {
					if (root.contains(strip))
						fitTabs(strip, narrow.matches);
				});
				pending.clear();
			});
		}

		function queue(strip) {
			pending.add(strip);
			schedule();
		}

		const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(function(entries) {
			entries.forEach(function(entry) {
				const strip = entry.target, width = entry.contentRect.width;
				if (strips.has(strip) && strips.get(strip) !== width) {
					strips.set(strip, width);
					queue(strip);
				}
			});
		}) : null;

		function watch(strip) {
			if (strips.has(strip))
				return;
			strips.set(strip, null);
			if (resize)
				resize.observe(strip);
			queue(strip);
		}

		function queueAll() {
			strips.forEach((width, strip) => queue(strip));
		}

		root.querySelectorAll(TAB_STRIP).forEach(watch);
		narrow.addEventListener('change', queueAll);
		if (!resize)
			window.addEventListener('resize', queueAll);
		if (document.fonts)
			document.fonts.ready.then(queueAll);

		new MutationObserver(function(records) {
			let removed = false;
			records.forEach(function(record) {
				const target = record.target;
				if (record.type === 'attributes') {
					if (target.matches('li') && strips.has(target.parentElement))
						queue(target.parentElement);
					return;
				}

				if (strips.has(target))
					queue(target);
				if (!leases && document.body.dataset.page === OVERVIEW && target.closest(LEASE_TABLE))
					leases = true;
				if (!rules && target.closest(RULE_SUMMARY))
					rules = true;
				record.addedNodes.forEach(function(node) {
					if (node.nodeType !== 1)
						return;
					if (node.matches(TAB_STRIP))
						watch(node);
					node.querySelectorAll(TAB_STRIP).forEach(watch);
					if (!leases && document.body.dataset.page === OVERVIEW &&
					    (node.matches(LEASE_TABLE) || node.querySelector(LEASE_TABLE)))
						leases = true;
					if (!rules && (node.matches(RULE_SUMMARY) || node.querySelector(RULE_SUMMARY)))
						rules = true;
				});
				if (!removed)
					removed = Array.from(record.removedNodes).some(node => node.nodeType === 1);
			});
			if (removed) {
				strips.forEach(function(width, strip) {
					if (root.contains(strip))
						return;
					if (resize)
						resize.unobserve(strip);
					strips.delete(strip);
					pending.delete(strip);
				});
			}
			if (leases || rules)
				schedule();
		}).observe(root, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
		schedule();
	}
});
