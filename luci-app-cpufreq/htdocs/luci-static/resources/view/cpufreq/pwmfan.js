'use strict';
'require view';
'require form';

return view.extend({
	render: function() {
		var m, s, o;

		m = new form.Map('cpufreq', _('PWM Fan Controller'),
			_('Smart control PWM fan start/stop and fan speed based on CPU temperature.'));

		s = m.section(form.NamedSection, 'cpufreq', 'settings');
		s.addremove = false;
		s.anonymous = true;

		o = s.option(form.Flag, 'pwm_fan', _('Enabled'));
		o.rmempty = false;

		o = s.option(form.Value, 'pwm_fan_threshold', _('Fan temperature activation (°C)'));
		o.datatype = 'and(uinteger,min(1),max(100))';
		o.default = '35';

		o = s.option(form.Flag, 'pwm_fan_strict', _('Fan always on'));
		o.default = o.enabled;

		o = s.option(form.ListValue, 'pwm_fan_enforce_level', _('Fan speed'));
		o.value('auto', _('Auto'));
		o.value('1', _('Level 1'));
		o.value('2', _('Level 2'));
		o.value('3', _('Level 3'));
		o.value('4', _('Level 4'));
		o.default = 'auto';
		o.depends('pwm_fan_strict', '1');

		return m.render();
	}
});
