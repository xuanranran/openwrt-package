'use strict';
'require view';
'require form';
'require rpc';

var callCpuInfo = rpc.declare({
	object: 'luci.cpufreq',
	method: 'get_cpu_info',
	expect: { '': {} }
});

return view.extend({
	load: function() {
		return Promise.all([
			callCpuInfo()
		]);
	},

	render: function(data) {
		var cpu_info = data[0];
		
		var m, s, o;

		m = new form.Map('cpufreq', _('CPU Freq Settings'),
			_('Set CPU Scaling Governor to Max Performance or Balance Mode'));

		s = m.section(form.NamedSection, 'cpufreq', 'settings');
		s.anonymous = true;
		
		var policies = Object.keys(cpu_info).sort(function(a, b) { return a - b; });

		if (policies.length === 0) {
			s.render = function() {
				return E('div', { class: 'alert-message warning' },
					_('No CPU scaling policies found.'));
			};
			return m.render();
		}

		s.tabbed = true;

		for (var i = 0; i < policies.length; i++) {
			var policy_num = policies[i];
			var info = cpu_info[policy_num];
			
			s.tab(policy_num, _('Policy %s').format(policy_num));

			o = s.taboption(policy_num, form.ListValue, 'governor' + policy_num, _('CPU Scaling Governor'));
			for (var j = 0; j < info.governors.length; j++) {
				if (info.governors[j]) {
					o.value(info.governors[j], info.governors[j]);
				}
			}

			o = s.taboption(policy_num, form.ListValue, 'minfreq' + policy_num, _('Min Idle CPU Freq'));
			for (var j = 0; j < info.freqs.length; j++) {
				if (info.freqs[j]) o.value(info.freqs[j]);
			}

			o = s.taboption(policy_num, form.ListValue, 'maxfreq' + policy_num, _('Max Turbo Boost CPU Freq'));
			for (var j = 0; j < info.freqs.length; j++) {
				if (info.freqs[j]) o.value(info.freqs[j]);
			}

			o = s.taboption(policy_num, form.Value, 'sdfactor' + policy_num, _('CPU Switching Sampling rate'),
				_('The sampling rate determines how frequently the governor checks to tune the CPU (ms)'));
			o.datatype = 'range(1,100000)';
			o.placeholder = '10';
			o.default = '10';
			o.depends('governor' + policy_num, 'ondemand');

			o = s.taboption(policy_num, form.Value, 'upthreshold' + policy_num, _('CPU Switching Threshold'),
				_('Kernel make a decision on whether it should increase the frequency (%)'));
			o.datatype = 'range(1,99)';
			o.placeholder = '50';
			o.default = '50';
			o.depends('governor' + policy_num, 'ondemand');
		}

		return m.render();
	}
});
