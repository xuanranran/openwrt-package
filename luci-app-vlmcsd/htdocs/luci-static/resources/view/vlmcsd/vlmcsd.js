'use strict';
'require form';
'require poll';
'require rpc';
'require uci';
'require view';

var callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: ['name'],
	expect: { '': {} }
});

function getServiceStatus() {
	return L.resolveDefault(callServiceList('vlmcsd'), {}).then(function (res) {
		var isRunning = false;
		try {
			isRunning = res['vlmcsd']['instances']['vlmcsd']['running'];
		} catch (e) { }
		return isRunning;
	});
}

function renderStatus(isRunning) {
	var spanTemp = '<em><span style="color:%s"><strong>%s %s</strong></span></em>';
	var renderHTML;
	if (isRunning) {
		renderHTML = spanTemp.format('green', 'VLMCSD', _('RUNNING'));
	} else {
		renderHTML = spanTemp.format('red', 'VLMCSD', _('NOT RUNNING'));
	}

	return renderHTML;
}

return view.extend({
	render: function() {
		var m, s, o;

		m = new form.Map('vlmcsd', _('KMS Server'),
			_('A KMS Server Emulator to active your Windows or Office.'));

		s = m.section(form.TypedSection);
		s.anonymous = true;
		s.render = function () {
			poll.add(function () {
				return L.resolveDefault(getServiceStatus()).then(function (res) {
					var view = document.getElementById('service_status');
					view.innerHTML = renderStatus(res);
				});
			});

			return E('div', { class: 'cbi-section', id: 'status_bar' }, [
					E('p', { id: 'service_status' }, _('Collecting data...'))
			]);
		}

		s = m.section(form.NamedSection, 'config', 'vlmcsd');

		o = s.option(form.Flag, 'enabled', _('Enabled'));
		o.default = o.disabled;
		o.rmempty = false;

		o = s.option(form.Flag, 'autoactivate', _('Auto activate'));
		o.default = o.disabled;
		o.rmempty = false;

		o = s.option(form.Flag, 'firewall', _('Open firewall port'));
		o.default = o.disabled;
		o.rmempty = false;

		return m.render();
	}
});
