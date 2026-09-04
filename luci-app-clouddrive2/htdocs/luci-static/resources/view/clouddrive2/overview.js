'use strict';
'require form';
'require poll';
'require rpc';
'require uci';
'require view';

const callRuntimeStatus = rpc.declare({
	object: 'luci.clouddrive2',
	method: 'status',
	expect: { '': {} }
});

function getRuntimeStatus() {
	return L.resolveDefault(callRuntimeStatus(), {});
}

function getRuntimeValues(info) {
	return {
		runtime_web_port: String(Number(info.port) || 19798),
		runtime_username: info.logged_in === true && info.username ? info.username : _('Not logged in'),
		runtime_architecture: info.architecture || _('Unknown'),
		runtime_version: info.version || _('Unknown')
	};
}

function renderServiceStatus(info) {
	let isRunning = info.running === true;
	let port = Number(info.port) || 19798;
	let host = window.location.hostname;
	let status = E('em', {}, E('span', {
		'style': 'color:%s'.format(isRunning ? 'green' : 'red')
	}, E('strong', {}, 'CloudDrive2 %s'.format(isRunning ? _('RUNNING') : _('NOT RUNNING')))));

	if (host.indexOf(':') >= 0 && host.charAt(0) !== '[')
		host = '[%s]'.format(host);

	let webButton = isRunning ? E('a', {
		'class': 'btn cbi-button cbi-button-action',
		'style': 'margin-left:50px;margin-right:10px',
		'href': 'http://%s:%s'.format(host, port),
		'target': '_blank',
		'rel': 'noreferrer noopener'
	}, _('Open Web Interface')) : '';

	return E('span', {}, [status, webButton]);
}

function updateRuntimeStatus(info) {
	let statusView = document.getElementById('service_status');
	let values = getRuntimeValues(info);

	if (statusView)
		statusView.replaceChildren(renderServiceStatus(info));

	Object.keys(values).forEach(function(id) {
		let field = document.getElementById(id);
		if (field)
			field.textContent = values[id];
	});
}

return view.extend({
	load() {
		return Promise.all([
			uci.load('clouddrive2'),
			getRuntimeStatus()
		]);
	},

	render(data) {
		let m, s, o;
		let runtime = data[1] || {};
		let values = getRuntimeValues(runtime);

		m = new form.Map('clouddrive2', _('CloudDrive2'),
			E('ul', { 'style': 'margin-top:0.5em' }, [
				E('li', {}, _('CloudDrive2 runs as a native binary; this is not a Docker deployment.')),
				E('li', {}, _('Configure ports, account credentials, mount points and other options in the CloudDrive2 web interface.')),
				E('li', {}, _('The default HTTP port is 19798. The configured port is checked automatically before the service starts; a conflict prevents startup and is written to the system log.')),
				E('li', {}, _('We recommend mounting cloud drives under /mnt and using the Samba4 package for network sharing.'))
			]));

		s = m.section(form.TypedSection);
		s.anonymous = true;
		s.render = function() {
			poll.add(function() {
				return getRuntimeStatus().then(updateRuntimeStatus);
			});

			return E('div', { 'class': 'cbi-section' }, [
				E('p', { 'id': 'service_status' }, renderServiceStatus(runtime))
			]);
		};

		s = m.section(form.NamedSection, 'main', 'clouddrive2', _('Settings'));
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.rmempty = false;

		o = s.option(form.DummyValue, '_web_port', _('Web Port'));
		o.renderWidget = function() {
			return E('span', { 'id': 'runtime_web_port' }, values.runtime_web_port);
		};

		o = s.option(form.DummyValue, '_username', _('Logged-in Account'));
		o.renderWidget = function() {
			return E('span', { 'id': 'runtime_username' }, values.runtime_username);
		};

		o = s.option(form.DummyValue, '_architecture', _('CPU Architecture'));
		o.renderWidget = function() {
			return E('span', { 'id': 'runtime_architecture' }, values.runtime_architecture);
		};

		o = s.option(form.DummyValue, '_version', _('Binary Version'));
		o.renderWidget = function() {
			return E('span', { 'id': 'runtime_version' }, values.runtime_version);
		};

		return m.render();
	}
});
