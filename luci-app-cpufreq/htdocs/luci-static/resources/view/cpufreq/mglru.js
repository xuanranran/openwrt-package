'use strict';
'require view';
'require form';

return view.extend({
	render: function() {
		var m, s, o;

		m = new form.Map('cpufreq', _('Multi-Gen LRU'),
			_("The multi-gen LRU is an alternative LRU implementation that optimizes page reclaim and improves performance under memory pressure. Page reclaim decides the kernel's caching policy and ability to overcommit memory. It directly impacts the kswapd CPU usage and RAM efficiency."));

		s = m.section(form.NamedSection, 'cpufreq', 'settings');
		s.anonymous = true;

		o = s.option(form.Flag, 'mglru_enabled', _('Enabled'));
		o.default = o.enabled;
		o.rmempty = false;

		o = s.option(form.Value, 'mglru_min_ttl_ms', _('Thrashing prevention (ms)'), 
			_('Set the thrashing prevention vaule to prevent the working set of N milliseconds from getting evicted. The OOM killer is triggered if this working set cannot be kept in memory. (0 means disabled, Default value 1000)'));
		o.datatype = 'and(uinteger,min(0))';
		o.default = '1000';
		o.rmempty = false;

		return m.render();
	}
});
