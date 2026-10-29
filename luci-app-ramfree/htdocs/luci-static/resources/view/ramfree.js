'use strict';
'require fs';
'require ui';
'require view';

function execChecked(command, args) {
	return fs.exec(command, args).then(function(result) {
		if (result.code !== 0)
			throw new Error('%s (exit %s): %s'.format(command, result.code,
				(result.stderr || result.stdout || _('Unknown error')).trim()));
	});
}

return view.extend({
	handleSaveApply: null,
	handleSave: null,
	handleReset: null,

	load: function() {
		return execChecked('/bin/sync', []).then(function() {
			return execChecked('/sbin/sysctl', ['-w', 'vm.drop_caches=3']);
		}).then(function() {
			return true;
		}).catch(function(err) {
			ui.addNotification(null, E('p', {}, [
				_('Failed to release memory cache.'), ' ', err.message || String(err)
			]), 'error');
			return false;
		});
	},

	render: function(success) {
		if (success) {
			window.location.href = '/cgi-bin/luci/';
			return E('div');
		}

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Freeping Memory Cache')),
			E('p', {}, _('Memory cache was not released.')),
			E('button', {
				'class': 'btn cbi-button cbi-button-action',
				'click': function() { window.location.reload(); }
			}, _('Retry'))
		]);
	}
});
