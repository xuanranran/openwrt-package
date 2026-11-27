'use strict';
'require view';
'require form';
'require uci';
'require network';
'require rpc';
'require ui';
'require poll';

const listClients = rpc.declare({
	object: 'luci.device_access',
	method: 'clients'
});

function fetchClients() {
	return L.resolveDefault(listClients().then(result => result.clients), null);
}

const config = 'device_access';
const clientProfiles = () => uci.sections(config, 'client');
const aliases = (profile) => L.toArray(profile?.macs).map(mac => mac.toLowerCase());
const profileFor = (mac) => clientProfiles().find(profile => aliases(profile).includes(mac));

function counterRate(current, previous, seconds) {
	if (current?.bytes == null || previous?.bytes == null || current.handle !== previous.handle ||
		current.bytes < previous.bytes || seconds <= 0)
		return null;
	return (current.bytes - previous.bytes) * 8 / seconds;
}

function displayRate(bps) {
	if (bps == null)
		return '–';
	if (bps >= 1000000)
		return '%s Mbit/s'.format((bps / 1000000).toFixed(2));
	return '%s kbit/s'.format((bps / 1000).toFixed(1));
}

function updateRates(traffic, clients, at) {
	const previous = new Map(traffic.sample.map(client => [ client.group || client.mac, client ]));
	const elapsed = (at - traffic.at) / 1000;
	traffic.rates = new Map(clients.map(client => {
		const old = previous.get(client.group || client.mac);
		return [ client.mac, {
			upload: counterRate(client.upload, old?.upload, elapsed),
			download: counterRate(client.download, old?.download, elapsed)
		} ];
	}));
	traffic.sample = clients;
	traffic.at = at;
}

function setModalDefaults(section, defaults) {
	for (const field of section.children) {
		if (Object.prototype.hasOwnProperty.call(defaults, field.option)) {
			field.load = () => defaults[field.option];
			field.forcewrite = true;
		}
	}
}

function renderClients(map, rules, profiles, hosts, traffic) {
	const columns = {
		name: _('Device name'),
		ip: _('IP address'),
		mac: _('Device MAC address'),
		connection: _('Connection'),
		upload: _('Upload speed'),
		download: _('Download speed'),
		actions: _('Actions')
	};
	const cell = (key, contents, showLabel = false) => E('td', {
		'class': 'device-access-cell device-access-' + key, 'role': 'cell'
	}, [
		showLabel ? E('span', { 'class': 'device-access-label', 'aria-hidden': 'true' }, columns[key]) : null,
		contents
	]);
	const button = (label, fn) => E('button', {
		'type': 'button',
		'class': 'btn cbi-button device-access-button',
		'disabled': map.readonly || null,
		'click': ui.createHandlerFn(null, fn)
	}, [ label ]);
	const body = E('tbody', { 'class': 'device-access-devices', 'role': 'rowgroup' });
	const table = E('table', {
		'class': 'device-access-table', 'role': 'table', 'aria-label': _('Connected devices')
	}, [
		E('thead', { 'class': 'device-access-head', 'role': 'rowgroup' }, [
			E('tr', { 'role': 'row' }, Object.values(columns).map(label => E('th', {
				'scope': 'col', 'role': 'columnheader'
			}, label)))
		]),
		body
	]);
	const empty = E('p', { 'class': 'device-access-empty' });
	const speedCells = new Map();
	function paintRates() {
		for (const [ mac, cells ] of speedCells) {
			const rates = traffic.rates.get(mac);
			cells.up.textContent = displayRate(rates?.upload);
			cells.down.textContent = displayRate(rates?.download);
		}
	}
	function update(clients) {
		const rows = (clients || []).map(client => {
			const profile = profileFor(client.mac);
			const hostname = hosts?.getHostnameByMACAddr(client.mac.toUpperCase()) ||
				hosts?.getHostnameByMACAddr(client.mac) || '';
			const rule = uci.sections(config, 'device').find(rule => rule.mac?.toLowerCase() === client.mac);
			const name = profile?.name || rule?.name || hostname;
			return { client, name, hostname, profile };
		}).sort((a, b) => Number(b.client.reachable) - Number(a.client.reachable) ||
			a.name.localeCompare(b.name) || a.client.mac.localeCompare(b.client.mac));
		speedCells.clear();
		body.replaceChildren(...rows.map(({ client, name, hostname, profile }) => {
			const up = E('span', { 'class': 'device-access-rate' });
			const down = E('span', { 'class': 'device-access-rate' });
			speedCells.set(client.mac, { up, down });
			const actions = [
				button(_('Block internet'), () => rules.editClient(client, name, 'always')),
				button(_('Set internet schedule'), () => rules.editClient(client, name, 'outside')),
				button(_('Device settings'), () => profiles.editClient(client, hostname, profile))
			];
			if (client.privateMac && !profile && clientProfiles().length)
				actions.push(button(_('Link to device'), () => profiles.linkClient(client, hostname)));
			return E('tr', { 'class': 'device-access-device', 'role': 'row' }, [
				cell('name', E('strong', {}, name || '–')),
				cell('ip', E('span', {}, (client.ipv4.length ? client.ipv4 : client.ipv6).join(', ') || '–'), true),
				cell('mac', E('div', { 'class': 'device-access-address' }, [
					E('code', {}, client.mac),
					client.privateMac ? E('small', {}, _('Possible private MAC')) : null
				]), true),
				cell('connection', E('span', { 'class': 'device-access-status' },
					client.reachable ? _('Reachable') : _('Connection unconfirmed'))),
				cell('upload', up, true),
				cell('download', down, true),
				cell('actions', E('div', { 'class': 'device-access-action-buttons' }, actions))
			]);
		}));
		table.hidden = !rows.length;
		empty.hidden = !!rows.length;
		empty.textContent = clients ? _('No connected devices detected.') : _('Could not load connected devices.');
		paintRates();
	}
	traffic.paint = paintRates;
	update(traffic.clients);
	return E('div', { 'class': 'cbi-section' }, [
		E('h3', {}, [ _('Connected devices') ]),
		E('div', { 'class': 'cbi-section-descr' }, [
			_('Speeds show traffic forwarded through the selected internet zone.')
		]),
		table,
		empty,
		E('div', { 'class': 'cbi-section-actions' }, [
			button(_('Refresh'), async () => {
				const result = await fetchClients();
				if (result)
					updateRates(traffic, result, performance.now());
				update(traffic.clients = result);
			})
		])
	]);
}

function addProfiles(map, hints) {
	const profiles = map.section(form.GridSection, 'client', _('Device profiles'),
		_('Linked MAC addresses share a device name, speed limits and access rules.'));
	profiles.anonymous = true;
	profiles.addremove = true;

	let option = profiles.option(form.Value, 'name', _('Device name'));
	option.rmempty = false;

	option = profiles.option(form.DynamicList, 'macs', _('Device MAC addresses'));
	option.datatype = 'macaddr';
	option.rmempty = false;
	for (const [ mac, hint ] of hints)
		option.value(mac, hint ? '%s (%s)'.format(mac, hint) : mac);
	option.validate = function(id, value) {
		for (const mac of L.toArray(value).map(value => value.toLowerCase())) {
			if (!/^[0-9a-f][02468ace](:[0-9a-f]{2}){5}$/.test(mac) || mac === '00:00:00:00:00')
				return _('Use a valid unicast MAC address.');
			if (clientProfiles().some(profile => profile['.name'] !== id && aliases(profile).includes(mac)))
				return _('This MAC address is already linked to another device.');
		}
		return true;
	};
	option.write = function(id, value) {
		uci.set(config, id, this.option, Array.from(new Set(L.toArray(value).map(mac => mac.toLowerCase()))));
	};

	for (const [ key, label ] of [ [ 'upload', _('Upload limit (kbit/s)') ], [ 'download', _('Download limit (kbit/s)') ] ]) {
		option = profiles.option(form.Value, key, label, _('Leave blank or use 0 for unlimited.'));
		option.datatype = 'range(0,10000000)';
		option.validate = (id, value) => /^[0-9]+$/.test(value) || _('Enter a whole number.');
		option.placeholder = '0';
		option.write = function(id, value) {
			if (+value > 0)
				uci.set(config, id, this.option, String(+value));
			else
				uci.unset(config, id, this.option);
		};
	}

	profiles.editClient = async function(client, hostname, profile) {
		await map.parse();
		const id = profile?.['.name'] || uci.add(config, 'client');
		if (!profile) {
			map.addedSection = id;
			if (hostname)
				uci.set(config, id, 'hostname', hostname);
		}
		const defaults = { macs: Array.from(new Set([ ...aliases(profile), client.mac ])) };
		if (!profile && hostname)
			defaults.name = hostname;
		return this.renderMoreOptionsModal(id, { deviceDefaults: defaults });
	};

	profiles.addModalOptions = (section, id, event) => {
		if (event?.deviceDefaults)
			setModalDefaults(section, event.deviceDefaults);
	};

	profiles.linkClient = function(client, hostname) {
		const candidates = clientProfiles();
		const similar = candidates.filter(profile => hostname && profile.hostname?.toLowerCase() === hostname.toLowerCase());
		const select = E('select', { 'class': 'cbi-input-select' }, [
			E('option', { 'value': '' }, [ _('Choose an existing device') ]),
			...candidates.map(profile => E('option', { 'value': profile['.name'] }, [
				profile.name || aliases(profile)[0] || profile['.name']
			]))
		]);
		if (similar.length === 1)
			select.value = similar[0]['.name'];
		const confirm = E('button', {
			'type': 'button',
			'class': 'btn cbi-button cbi-button-positive',
			'disabled': !select.value || null,
			'click': ui.createHandlerFn(this, () => {
				const profile = candidates.find(candidate => candidate['.name'] === select.value);
				if (profile && !profileFor(client.mac)) {
					ui.hideModal();
					return this.editClient(client, hostname, profile);
				}
			})
		}, [ _('Continue') ]);
		select.addEventListener('change', () => { confirm.disabled = !select.value; });
		ui.showModal(_('Link to device'), [
			E('p', {}, [
				similar.length === 1 ? _('A matching hostname was found. Confirm only if both MAC addresses belong to the same device.') :
					_('Select the existing device if this is one of its MAC addresses.')
			]),
			select,
			E('div', { 'class': 'button-row' }, [
				E('button', { 'type': 'button', 'class': 'btn cbi-button', 'click': () => ui.hideModal() }, [ _('Cancel') ]),
				' ', confirm
			])
		], 'device-access-dialog');
	};
	return profiles;
}

const weekdays = [
	[ '1', _('Mon') ], [ '2', _('Tue') ], [ '3', _('Wed') ],
	[ '4', _('Thu') ], [ '5', _('Fri') ], [ '6', _('Sat') ], [ '0', _('Sun') ]
];

return view.extend({
	load() {
		return Promise.all([
			uci.load('device_access'),
			uci.load('firewall'),
			L.resolveDefault(network.getHostHints(), null),
			fetchClients()
		]);
	},

	render(data) {
		const map = new form.Map('device_access', _('Device Access'),
			_('Restrict internet access by device MAC address. Schedules use the router’s local time.'));
		const settings = map.section(form.NamedSection, 'main', 'defaults', _('Internet destination'));
		const zone = settings.option(form.ListValue, 'zone', _('Firewall zone'),
			_('Only routed traffic to this zone is restricted. Flow offloading and transparent proxies can bypass forwarding rules.'));
		zone.rmempty = false;
		zone.default = 'wan';
		for (const section of uci.sections('firewall', 'zone'))
			if (section.name)
				zone.value(section.name);

		const hints = data[2]?.getMACHints() || [];
		const connected = map.section(form.TypedSection, 'device');
		connected.cfgsections = () => [];
		const traffic = { clients: data[3], sample: data[3] || [], at: performance.now(), rates: new Map() };
		connected.render = () => renderClients(map, rules, profiles, data[2], traffic);

		const rules = map.section(form.GridSection, 'device', _('Access rules'));
		rules.anonymous = true;
		rules.addremove = true;

		rules.editClient = async function(client, name, mode) {
			await map.parse();
			const group = aliases(profileFor(client.mac));
			const matching = uci.sections(config, 'device').filter(rule => {
				const mac = rule.mac?.toLowerCase();
				return mac === client.mac || group.includes(mac);
			});
			const existing = matching.find(rule => (rule.mode || 'always') === 'always') ||
				matching.find(rule => rule.mode === mode) || matching[0];
			const sectionId = existing?.['.name'] || uci.add('device_access', 'device');
			if (!existing)
				map.addedSection = sectionId;

			const defaults = { mac: existing?.mac || group[0] || client.mac, enabled: '1', mode };
			if (name && !existing?.name)
				defaults.name = name;
			return this.renderMoreOptionsModal(sectionId, {
				deviceDefaults: defaults,
				otherRules: matching.length > 1
			});
		};

		rules.addModalOptions = function(section, sectionId, event) {
			const defaults = event?.deviceDefaults;
			if (!defaults)
				return;
			setModalDefaults(section, defaults);
			if (event.otherRules)
				section.description = _('Other rules for this device will still apply.');
		};

		let option = rules.option(form.Flag, 'enabled', _('Enable'));
		option.default = option.enabled;
		option.rmempty = false;
		rules.option(form.Value, 'name', _('Device name'));

		option = rules.option(form.Value, 'mac', _('Device MAC address'));
		option.datatype = 'macaddr';
		option.rmempty = false;
		for (const [ mac, hint ] of hints)
			option.value(mac, hint ? '%s (%s)'.format(mac, hint) : mac);

		option = rules.option(form.ListValue, 'mode', _('Policy'));
		option.value('always', _('Always block'));
		option.value('during', _('Block during schedule'));
		option.value('outside', _('Allow only during schedule'));
		option.default = 'always';
		option.rmempty = false;

		function scheduleField(field) {
			field.depends('mode', 'during');
			field.depends('mode', 'outside');
			field.rmempty = false;
			return field;
		}

		option = scheduleField(rules.option(form.MultiValue, 'days', _('Days')));
		for (const [ value, label ] of weekdays)
			option.value(value, label);
		option.default = weekdays.map(([ value ]) => value);

		const start = scheduleField(rules.option(form.Value, 'start', _('Start time')));
		start.placeholder = '08:00';
		const end = scheduleField(rules.option(form.Value, 'end', _('End time'),
			_('An end time before the start continues into the next day.')));
		end.placeholder = '22:00';

		start.validate = end.validate = function(sectionId, value) {
			if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value))
				return _('Use 24-hour HH:MM format.');
			const other = this.section.children.find(field => field.option === (this.option === 'start' ? 'end' : 'start'));
			if (value === other.formvalue(sectionId))
				return _('Start and end must differ.');
			return true;
		};

		const profiles = addProfiles(map, hints);
		poll.add(async () => {
			if (!map.root?.isConnected)
				return;
			const clients = await fetchClients();
			updateRates(traffic, clients || [], performance.now());
			traffic.paint?.();
		}, 3);
		if (!document.getElementById('device-access-styles'))
			document.head.appendChild(E('link', {
				'id': 'device-access-styles',
				'rel': 'stylesheet',
				'href': L.resource('view/device_access/device-access.css') + '?v=2'
			}));

		return map.render().then(node => {
			node.classList.add('device-access-page');
			return node;
		});
	}
});
