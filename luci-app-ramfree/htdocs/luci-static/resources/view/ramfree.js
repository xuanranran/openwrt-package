'use strict';
'require fs';
'require view';

return view.extend({
	handleSaveApply: null,
	handleSave: null,
	handleReset: null,

	load: function() {
		return Promise.all([
			L.resolveDefault(fs.exec('/bin/sync', null), null),
			L.resolveDefault(fs.exec('/sbin/sysctl', ['-w', 'vm.drop_caches=3']), null),
		]);
	},

	render: function () {
		window.location.href = '/cgi-bin/luci/';
	}
});
