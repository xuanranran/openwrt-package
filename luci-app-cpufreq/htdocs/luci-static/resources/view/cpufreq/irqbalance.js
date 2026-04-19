'use strict';
'require view';
'require form';
'require rpc';
'require poll';

var callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: [ 'name' ],
	expect: { '': {} }
});

var callIrqStatus = rpc.declare({
	object: 'luci.cpufreq',
	method: 'get_irq_status',
	expect: { '': {} }
});

return view.extend({
	load: function() {
		return Promise.all([
			callServiceList('irqbalance')
		]);
	},

	render: function(data) {
		var services = data[0];
		
		var is_running = false;
		if (services && services['irqbalance'] && services['irqbalance'].instances) {
			var instances = services['irqbalance'].instances;
			for (var key in instances) {
				if (instances[key].running) {
					is_running = true;
					break;
				}
			}
		}

		var status = is_running ?
			'<b><font color="green">' + _('RUNNING') + '</font></b>' :
			'<b><font color="red">' + _('NOT RUNNING') + '</font></b>';

		var desc = _('Irqbalance is a Linux daemon that distributes interrupts over multiple logical CPUs. This design intent being to improve overall performance which can result in a balanced load and power consumption.<br />For more information, visiting: https://openwrt.org/docs/guide-user/services/irqbalance') +
			'<br /><br />' + _('Running Status') + ' : ' + status + '<br />';

		var m, s, o;

		m = new form.Map('irqbalance', _('Irqbalance'), desc);

		s = m.section(form.TypedSection, 'irqbalance', _('Settings'));
		s.anonymous = true;

		o = s.option(form.Flag, 'enabled', _('Enabled'));
		o.rmempty = false;

		o = s.option(form.Value, 'deepestcache', _('Level at which irqbalance partitions cache domains'));
		o.placeholder = '2';
		o.rmempty = true;

		o = s.option(form.Value, 'interval', _('Interval (Seconds)'));
		o.placeholder = '10';
		o.rmempty = true;

		o = s.option(form.DynamicList, 'banirq', _('Ignore (ID of irq)'));
		o.rmempty = true;
		
		var s2 = m.section(form.NamedSection, 'irq_status', 'irq_status', _('IRQ Status'));
		s2.render = function() {
			var div = E('div', { class: 'cbi-map' }, [
				E('fieldset', { class: 'cbi-section' }, [
					E('fieldset', { class: 'cbi-section-node' }, [
						E('div', { id: 'log_text', style: 'max-height: 350px; overflow-y: auto; padding: 10px; background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;' }, [
							E('strong', {}, _('Loading...'))
						])
					])
				])
			]);

			poll.add(function() {
				return callIrqStatus().then(function(res) {
					var log_id = div.querySelector('#log_text');
					if (log_id && res) {
						log_id.innerHTML = String.format(
							'<pre>%h</pre>',
							res.syslog || _('No data.')
						);
					} else if (log_id) {
						log_id.innerHTML = '<strong>' + _('Read error, please refresh or wait.') + '</strong>';
					}
				});
			}, 2);

			return div;
		};

		return m.render();
	}
});
