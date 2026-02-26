'use strict';
'require form';
'require poll';
'require rpc';
'require uci';
'require view';

const callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: ['name'],
	expect: { '': {} }
});

function getServiceStatus() {
	return L.resolveDefault(callServiceList('clouddrive2'), {}).then(function(res) {
		let isRunning = false;
		try {
			let instances = res['clouddrive2']['instances'] || {};
			isRunning = Object.values(instances).some(function(inst) {
				return inst.running === true;
			});
		} catch(e) {}
		return isRunning;
	});
}

function renderStatus(isRunning, port) {
	let spanTemp = '<em><span style="color:%s"><strong>CloudDrive2 %s</strong></span></em>';
	let renderHTML;
	if (isRunning) {
		renderHTML = spanTemp.format('green', _('RUNNING'));
		renderHTML += String.format(
			'&#160;<a class="btn cbi-button" style="margin-left:50px;margin-right:10px;" href="http://%s:%s" target="_blank" rel="noreferrer noopener">%s</a>',
			window.location.hostname, port, _('Open Web Interface')
		);
	} else {
		renderHTML = spanTemp.format('red', _('NOT RUNNING'));
	}
	return renderHTML;
}

return view.extend({
	load() {
		return Promise.all([
			uci.load('clouddrive2')
		]);
	},

	render(data) {
		let m, s, o;
		let port = uci.get('clouddrive2', 'main', 'port') || '19798';

		m = new form.Map('clouddrive2', _('CloudDrive2'),
			_('Configure and manage CloudDrive2'));

		s = m.section(form.TypedSection);
		s.anonymous = true;
		s.render = function() {
			poll.add(function() {
				return L.resolveDefault(getServiceStatus()).then(function(res) {
					let view = document.getElementById('service_status');
					if (view)
						view.innerHTML = renderStatus(res, port);
				});
			});

			return E('div', { class: 'cbi-section' }, [
				E('p', { id: 'service_status' }, _('Collecting data...'))
			]);
		};

		s = m.section(form.NamedSection, 'main', 'clouddrive2', _('Settings'));
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.rmempty = false;

		o = s.option(form.Value, 'port', _('Port'));
		o.datatype = 'port';
		o.default = '19798';
		o.rmempty = false;

		o = s.option(form.Value, 'mount_point', _('Mount Point'));
		o.default = '/mnt/clouddrive';
		o.rmempty = false;

		return m.render();
	}
});
