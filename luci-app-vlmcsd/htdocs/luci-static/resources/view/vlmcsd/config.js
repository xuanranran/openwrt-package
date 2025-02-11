'use strict';
'require form';
'require fs';
'require ui';
'require view';

return view.extend({
	render: function () {
		var m, s, o;

		m = new form.Map("vlmcsd", _("Config File"));

		s = m.section(form.TypedSection);
		s.anonymous = true;
		s.sortable = true;

		o = s.option(form.TextValue, '_vlmcsd', null, _('This file is /etc/vlmcsd/vlmcsd.ini.'));
		o.rows = 25;
		o.cfgvalue = function (section_id) {
			return fs.trimmed('/etc/vlmcsd/vlmcsd.ini').catch(function (e) {
				return "";
			});
		};
		o.write = function (section_id, formvalue) {
			return this.cfgvalue(section_id).then(function (value) {
				if (value == formvalue) {
					return;
				}
				return fs.write('/etc/vlmcsd/vlmcsd.ini', formvalue.trim().replace(/\r\n/g, '\n') + '\n')
			});
		};

		return m.render();
	},

	handleSaveApply: function (ev) {
		onclick = L.bind(this.handleSave, this, ev);
		return fs.exec('/etc/init.d/vlmcsd', ['restart']);
	},
	handleReset: null
});
