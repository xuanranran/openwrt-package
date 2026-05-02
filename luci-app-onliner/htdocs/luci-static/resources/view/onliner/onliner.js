'use strict';
'require fs';
'require poll';
'require uci';
'require view';

var sortColumn = 'hostname';
var sortDirection = 'asc';
var latestInfo = { onlines: [] };
var searchQuery = '';

function ipToNum(ip) {
	if (!ip || typeof ip !== 'string' || ip === '-')
		return 0;

	return ip.split('.').reduce(function(num, octet) {
		return (num << 8) + (parseInt(octet, 10) || 0);
	}, 0);
}

function lower(value) {
	return value ? String(value).toLowerCase() : '';
}

function getStaticHosts() {
	var hosts = {};
	var sections = uci.sections('dhcp', 'host') || [];

	sections.forEach(function(section) {
		var name = section.name;
		var macs = section.mac;

		if (!name || !macs)
			return;

		if (!Array.isArray(macs))
			macs = [ macs ];

		macs.forEach(function(mac) {
			if (mac)
				hosts[lower(mac)] = name;
		});
	});

	return hosts;
}

function parseLeases(raw, hosts) {
	if (!raw)
		return hosts;

	raw.trim().split(/\r?\n/).forEach(function(line) {
		var fields = line.trim().split(/\s+/);
		var mac = fields[1];
		var hostname = fields[3];

		if (mac && hostname && hostname !== '*') {
			mac = lower(mac);
			if (!hosts[mac])
				hosts[mac] = hostname;
		}
	});

	return hosts;
}

function parseArp(raw, hosts) {
	var devices = [];
	var seen = {};

	if (!raw)
		return devices;

	raw.trim().split(/\r?\n/).slice(1).forEach(function(line) {
		var fields = line.trim().split(/\s+/);
		var ipaddr = fields[0];
		var flags = fields[2];
		var macaddr = fields[3];
		var device = fields[5];
		var macKey = lower(macaddr);

		if (flags !== '0x2' || !macaddr || macKey === '00:00:00:00:00:00')
			return;

		if (!/^(br-lan|eth|wlan)/.test(device || ''))
			return;

		if (seen[macKey])
			return;

		seen[macKey] = true;

		devices.push({
			hostname: hosts[macKey] || '?',
			ipaddr: ipaddr || '-',
			macaddr: macaddr,
			device: device || '-'
		});
	});

	return devices;
}

function loadOnlineData() {
	var staticHosts = getStaticHosts();

	return Promise.all([
		L.resolveDefault(fs.read_direct('/tmp/dhcp.leases'), ''),
		L.resolveDefault(fs.read_direct('/proc/net/arp'), '')
	]).then(function(res) {
		var hosts = parseLeases(res[0], staticHosts);

		return {
			onlines: parseArp(res[1], hosts)
		};
	});
}

function sortDevices(devices) {
	devices.sort(function(a, b) {
		var valA, valB;

		if (sortColumn === 'ipaddr') {
			valA = ipToNum(a.ipaddr);
			valB = ipToNum(b.ipaddr);
		}
		else {
			valA = lower(a[sortColumn]);
			valB = lower(b[sortColumn]);
		}

		var comparison = 0;

		if (valA > valB)
			comparison = 1;
		else if (valA < valB)
			comparison = -1;

		return sortDirection === 'asc' ? comparison : comparison * -1;
	});

	return devices;
}

function renderTable(table, info) {
	if (!table || !info || !info.onlines)
		return;

	latestInfo = info;

	var devices = info.onlines.filter(function(device) {
		if (!searchQuery)
			return true;

		return lower(device.hostname).includes(searchQuery) ||
			lower(device.ipaddr).includes(searchQuery) ||
			lower(device.macaddr).includes(searchQuery);
	});

	sortDevices(devices);

	table.querySelectorAll('.sort-arrow').forEach(function(span) {
		span.textContent = '';
	});

	var activeArrow = table.querySelector('#sort-arrow-' + sortColumn);
	if (activeArrow)
		activeArrow.innerHTML = sortDirection === 'asc' ? '&#9650;' : '&#9660;';

	document.querySelectorAll('.sort-control').forEach(function(span) {
		span.classList.remove('active');
		span.textContent = span.getAttribute('data-label-short');
	});

	var activeMobileControl = document.querySelector('.sort-control[data-sort="' + sortColumn + '"]');
	if (activeMobileControl) {
		activeMobileControl.classList.add('active');
		activeMobileControl.innerHTML = activeMobileControl.getAttribute('data-label-short') +
			(sortDirection === 'asc' ? ' &#9650;' : ' &#9660;');
	}

	while (table.rows.length > 1)
		table.deleteRow(1);

	if (devices.length > 0) {
		devices.forEach(function(device, i) {
			var row = table.insertRow(-1);
			row.className = 'cbi-section-table-row cbi-rowstyle-' + ((i % 2) + 1);

			[
				[ _('Hostname'), device.hostname || '?' ],
				[ _('IPv4 Address'), device.ipaddr || '-' ],
				[ _('MAC Address'), device.macaddr || '-' ],
				[ _('Interface'), device.device || '-' ]
			].forEach(function(cellInfo) {
				var cell = row.insertCell(-1);
				cell.setAttribute('data-label', cellInfo[0]);
				cell.textContent = cellInfo[1];
			});
		});
	}
	else {
		var row = table.insertRow(-1);
		var cell = row.insertCell(-1);

		row.className = 'cbi-section-table-row';
		cell.colSpan = 4;
		cell.appendChild(E('em', {}, searchQuery ? _('No matching devices found.') : _('There is no one online now.')));
	}
}

function setSort(table, column) {
	if (sortColumn === column)
		sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
	else {
		sortColumn = column;
		sortDirection = 'asc';
	}

	renderTable(table, latestInfo);
}

var css = `
body.onliner-compact-page .main-right > #maincontent > .container {
	flex-grow: 0 !important;
	margin-bottom: 0 !important;
}
body.onliner-compact-page footer {
	margin-top: 1rem !important;
}
.onliner-page {
	font-family: 'Google Sans', sans-serif;
	font-size: 16px;
	line-height: 1.6;
	overflow-wrap: break-word;
	word-break: break-all;
	padding-bottom: 0;
}
.onliner-page h2[name="content"] {
	font-size: 28px;
	margin-bottom: 20px;
	border-bottom: 0 solid #ddd;
	padding-bottom: 10px;
	font-weight: 800;
}
.onliner-page .cbi-section {
	background-color: #ffffff;
	border: 1px solid #e0e0e0;
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	margin-bottom: 0;
	padding: 25px;
}
.onliner-page .cbi-section > legend {
	font-size: 20px;
	font-weight: 800;
	padding: 0 10px;
	margin-left: 10px;
}
.onliner-page #search_box {
	width: 100%;
	padding: 10px;
	margin-bottom: 20px;
	border: 1px solid #ddd;
	border-radius: 4px;
	font-size: 16px;
	box-sizing: border-box;
}
.onliner-page table.cbi-section-table {
	border-collapse: collapse;
	border: none;
	width: 100%;
}
.onliner-page table.cbi-section-table th {
	background-color: #f8f9fa;
	border: none;
	border-bottom: 2px solid #dee2e6;
	padding: 14px 18px;
	text-align: left;
	font-weight: 800;
	white-space: nowrap;
}
.onliner-page table.cbi-section-table td {
	border: none;
	border-top: 1px solid #dee2e6;
	padding: 14px 18px;
	text-align: left;
	vertical-align: middle;
}
.onliner-page table.cbi-section-table tbody tr:hover {
	background-color: #f1f3f5;
}
.onliner-page th.sortable {
	cursor: pointer;
	position: relative;
	user-select: none;
}
.onliner-page th.sortable:hover {
	background-color: #e9ecef;
}
.onliner-page .sort-arrow {
	font-size: 12px;
	position: absolute;
	right: 18px;
	top: 50%;
	transform: translateY(-50%);
	color: #6c757d;
	display: inline-block;
	width: 1em;
}
.onliner-page .mobile-sorter {
	display: none;
}
[data-darkmode="true"] .onliner-page h2[name="content"] {
	border-bottom-color: #444;
}
[data-darkmode="true"] .onliner-page .cbi-section {
	background-color: #1e1e1e;
	border-color: #333;
}
[data-darkmode="true"] .onliner-page .cbi-section > legend {
	color: #eee;
}
[data-darkmode="true"] .onliner-page #search_box {
	background-color: #2a2a2a !important;
	border-color: #555 !important;
	color: #f5f5f5 !important;
}
[data-darkmode="true"] .onliner-page table.cbi-section-table th {
	background-color: #2a2a2a;
	border-bottom-color: #555;
	color: #f5f5f5;
}
[data-darkmode="true"] .onliner-page table.cbi-section-table td {
	border-top-color: #3a3a3a;
}
[data-darkmode="true"] .onliner-page table.cbi-section-table tbody tr:hover {
	background-color: #2c2c2c;
}
[data-darkmode="true"] .onliner-page th.sortable:hover {
	background-color: #333;
}
[data-darkmode="true"] .onliner-page .sort-arrow {
	color: #aaa;
}
@media (min-width: 769px) and (max-width: 1280px) {
	.onliner-page .cbi-section {
		padding: 20px !important;
		max-width: 1024px !important;
		margin-left: auto !important;
		margin-right: auto !important;
	}
	.onliner-page #search_box {
		display: block !important;
		float: none !important;
		width: 100% !important;
	}
	.onliner-page table.cbi-section-table {
		table-layout: fixed !important;
		width: 100% !important;
		margin-top: 15px !important;
	}
	.onliner-page #online_status_table tr {
		display: table-row !important;
	}
	.onliner-page #online_status_table th,
	.onliner-page #online_status_table td {
		display: table-cell !important;
	}
	.onliner-page table.cbi-section-table th,
	.onliner-page table.cbi-section-table td {
		box-sizing: border-box !important;
		padding: 15px 20px !important;
		word-wrap: break-word !important;
	}
	.onliner-page table.cbi-section-table th {
		font-weight: 600 !important;
		letter-spacing: 0.5px !important;
	}
	.onliner-page .cbi-section-table th:nth-of-type(1), .onliner-page .cbi-section-table td:nth-of-type(1) { width: 25% !important; }
	.onliner-page .cbi-section-table th:nth-of-type(2), .onliner-page .cbi-section-table td:nth-of-type(2) { width: 25% !important; }
	.onliner-page .cbi-section-table th:nth-of-type(3), .onliner-page .cbi-section-table td:nth-of-type(3) { width: 30% !important; }
	.onliner-page .cbi-section-table th:nth-of-type(4), .onliner-page .cbi-section-table td:nth-of-type(4) { width: 20% !important; }
	.onliner-page .sort-arrow {
		right: 15px !important;
	}
}
@media (max-width: 768px) {
	.onliner-page #online_status_table .cbi-section-table-titles {
		display: none;
	}
	.onliner-page .mobile-sorter {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 15px;
		padding: 10px;
		background-color: rgb(136 152 170 / 15%);
		border-radius: 4px;
		align-items: center;
	}
	.onliner-page .mobile-sorter .sort-control {
		padding: 6px 10px;
		background-color: #e9ecef00;
		border: 1px solid #dee2e6;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
	}
	.onliner-page .mobile-sorter .sort-control.active {
		background-color: #007bff;
		color: white;
		border-color: #007bff;
	}
	.onliner-page #online_status_table tr {
		display: block;
		margin-bottom: 15px;
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 10px;
	}
	.onliner-page #online_status_table tr:hover {
		background-color: transparent;
	}
	.onliner-page #online_status_table td {
		display: block;
		text-align: right;
		position: relative;
		padding-left: 50%;
		border: none;
		border-bottom: 1px dotted #ccc;
		min-height: 22px;
	}
	.onliner-page #online_status_table td:last-child {
		border-bottom: none;
	}
	.onliner-page #online_status_table td:before {
		content: attr(data-label);
		position: absolute;
		left: 10px;
		font-weight: 800;
		text-align: left;
		padding-right: 10px;
		width: 45%;
		white-space: nowrap;
	}
	[data-darkmode="true"] .onliner-page .mobile-sorter {
		background-color: #2a2a2a;
	}
	[data-darkmode="true"] .onliner-page .mobile-sorter .sort-control {
		background-color: #3c3c3c;
		color: #f1f1f1;
		border-color: #555;
	}
	[data-darkmode="true"] .onliner-page .mobile-sorter .sort-control.active {
		background-color: #3399ff;
		border-color: #3399ff;
		color: #ffffff;
	}
	[data-darkmode="true"] .onliner-page #online_status_table tr {
		border-color: #3a3a3a;
	}
	[data-darkmode="true"] .onliner-page #online_status_table td {
		border-bottom-color: #3a3a3a;
	}
}
`;

return view.extend({
	load: function() {
		return L.resolveDefault(uci.load('dhcp'), null);
	},

	render: function() {
		document.body.classList.add('onliner-compact-page');

		var table = E('table', { 'class': 'cbi-section-table', 'id': 'online_status_table' }, [
			E('tr', { 'class': 'cbi-section-table-titles' }, [
				E('th', { 'class': 'cbi-section-table-cell sortable', 'data-sort': 'hostname' }, [
					_('Hostname'), E('span', { 'class': 'sort-arrow', 'id': 'sort-arrow-hostname' })
				]),
				E('th', { 'class': 'cbi-section-table-cell sortable', 'data-sort': 'ipaddr' }, [
					_('IPv4 Address'), E('span', { 'class': 'sort-arrow', 'id': 'sort-arrow-ipaddr' })
				]),
				E('th', { 'class': 'cbi-section-table-cell sortable', 'data-sort': 'macaddr' }, [
					_('MAC Address'), E('span', { 'class': 'sort-arrow', 'id': 'sort-arrow-macaddr' })
				]),
				E('th', { 'class': 'cbi-section-table-cell sortable', 'data-sort': 'device' }, [
					_('Interface'), E('span', { 'class': 'sort-arrow', 'id': 'sort-arrow-device' })
				])
			]),
			E('tr', { 'class': 'cbi-section-table-row' }, [
				E('td', { 'colspan': 4 }, E('em', {}, _('Collecting data...')))
			])
		]);

		var search = E('input', {
			'type': 'text',
			'id': 'search_box',
			'placeholder': _('Search by hostname, IPv4 address, or MAC address...'),
			'keyup': function(ev) {
				searchQuery = lower(ev.target.value);
				renderTable(table, latestInfo);
			}
		});

		var mobileSorter = E('div', { 'class': 'mobile-sorter' }, [
			E('span', { 'class': 'sort-control', 'data-sort': 'hostname', 'data-label-short': _('Hostname') }, _('Hostname')),
			E('span', { 'class': 'sort-control', 'data-sort': 'ipaddr', 'data-label-short': _('IP') }, _('IP')),
			E('span', { 'class': 'sort-control', 'data-sort': 'macaddr', 'data-label-short': _('MAC') }, _('MAC')),
			E('span', { 'class': 'sort-control', 'data-sort': 'device', 'data-label-short': _('Interface') }, _('Interface'))
		]);

		var page = E('div', { 'class': 'onliner-page' }, [
			E('style', { 'type': 'text/css' }, css),
			E('h2', { 'name': 'content' }, _('Status')),
			E('fieldset', { 'class': 'cbi-section' }, [
				E('legend', {}, _('Online User List')),
				search,
				mobileSorter,
				table
			])
		]);

		table.querySelectorAll('th.sortable').forEach(function(th) {
			th.addEventListener('click', function() {
				setSort(table, th.getAttribute('data-sort'));
			});
		});

		mobileSorter.querySelectorAll('.sort-control').forEach(function(control) {
			control.addEventListener('click', function() {
				setSort(table, control.getAttribute('data-sort'));
			});
		});

		var update = function() {
			return loadOnlineData().then(renderTable.bind(null, table));
		};

		poll.add(update, 5);
		update();

		return page;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
