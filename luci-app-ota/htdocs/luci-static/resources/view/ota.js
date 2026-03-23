'use strict';
'require view';
'require ui';
'require rpc';

var callOtaCheck = rpc.declare({
	object: 'luci.ota',
	method: 'check',
	expect: { '': {} }
});

var callOtaDownload = rpc.declare({
	object: 'luci.ota',
	method: 'download',
	expect: { '': {} }
});

var callOtaProgress = rpc.declare({
	object: 'luci.ota',
	method: 'progress',
	expect: { '': {} }
});

var callOtaCancel = rpc.declare({
	object: 'luci.ota',
	method: 'cancel',
	expect: { '': {} }
});

var callOtaApply = rpc.declare({
	object: 'luci.ota',
	method: 'apply',
	params: [ 'keep' ],
	expect: { '': {} }
});

return view.extend({
	checkBtn: null,
	checkResultLabel: null,
	upgradeLogContainer: null,
	stateContainer: null,
	progressLabel: null,
	cancelBtn: null,
	isPollingPaused: false,

	handleStateSwitch: function(to) {
		if (this.stateContainer) {
			this.stateContainer.classList.remove('state-ctl-checked', 'state-ctl-downloading', 'state-ctl-downloaded');
			if (to) {
				this.stateContainer.classList.add('state-ctl-' + to);
			}
		}
	},

	handleCheckUpdate: function(ev) {
		this.checkBtn.disabled = true;
		this.checkResultLabel.textContent = '';
		this.upgradeLogContainer.innerHTML = '<p class="spinning">' + _('Checking...') + '</p>';
		this.handleStateSwitch(null);

		return callOtaCheck().then(function(res) {
			this.checkBtn.disabled = false;

			if (!res || res.code !== 0) {
				this.checkResultLabel.textContent = _('Check failed');
				this.upgradeLogContainer.innerHTML = '';
				ui.addNotification(null, E('p', {}, _('Check failed: %s').format(res ? res.msg : 'Unknown error')));
				return;
			}

			var data = res.data || {};
			var html = '';

			if (data.latest === true) {
				this.checkResultLabel.textContent = '';
				html += '<p><b>' + _('Already the latest firmware') + '</b></p>';
				html += '<b>' + _('Model') + ':</b> ' + data.model + '<br/>';
				html += '<b>' + _('Current Version') + ':</b> ' + data.current_version + '<br/>';
				html += '<b>' + _('Build Date') + ':</b> <font color="green">' + data.current_build_date + '</font>';
			} else {
				this.checkResultLabel.textContent = _('Found new firmware');
				html += '<b>' + _('Model') + ':</b> ' + data.model + '<br/>';
				html += '<b>' + _('Current Version') + ':</b> ' + data.current_version + '<br/>';
				html += '<b>' + _('Build Date') + ':</b> <font color="Orange">' + data.current_build_date + '</font><br/><br/>';
				html += '<b>' + _('New Version') + ':</b> ' + data.new_version + '<br/>';
				html += '<b>' + _('Build Date') + ':</b> <font color="green">' + data.new_build_date + '</font>';
				this.handleStateSwitch('checked');
			}

			if (data.logs) {
				html += '<br/><br/><h4>' + _('Changelog') + '</h4><pre>' + data.logs + '</pre>';
			}

			this.upgradeLogContainer.innerHTML = html;

		}.bind(this)).catch(function(err) {
			this.checkBtn.disabled = false;
			this.checkResultLabel.textContent = _('Check failed');
			this.upgradeLogContainer.innerHTML = '';
			ui.addNotification(null, E('p', {}, _('Check failed: %s').format(err.message || 'Unknown error')));
		}.bind(this));
	},

	handleDownloadFirmware: function(ev) {
		ev.target.disabled = true;
		this.isPollingPaused = false;

		return callOtaDownload().then(function(res) {
			ev.target.disabled = false;
			if (res && res.code === 0) {
				this.handleStateSwitch('downloading');
				this.progressLabel.textContent = _('Downloading: ...');
				this.pollDownloadProgress();
			} else {
				ui.addNotification(null, E('p', {}, _('Download failed: %s').format(res ? res.msg : 'Unknown error')));
			}
		}.bind(this)).catch(function(err) {
			ev.target.disabled = false;
			ui.addNotification(null, E('p', {}, _('Download failed: %s').format(err.message || 'Unknown error')));
		}.bind(this));
	},

	pollDownloadProgress: function() {
		if (this.isPollingPaused) return;

		callOtaProgress().then(function(res) {
			if (this.isPollingPaused) return;
			if (!res) return;

			if (res.code === 0) {
				this.handleStateSwitch('downloaded');
			} else if (res.code === 1) {
				this.progressLabel.textContent = _('Downloading: %s').format(res.msg || '...');
				window.setTimeout(this.pollDownloadProgress.bind(this), 1000);
			} else if (res.code === 2) {
				ui.addNotification(null, E('p', {}, _('Download canceled.')));
				this.handleStateSwitch('checked');
			} else {
				ui.addNotification(null, E('p', {}, _('Download failed: %s').format(res.msg || 'Unknown error')));
				this.handleStateSwitch('checked');
			}
		}.bind(this));
	},

	handleCancelDownload: function(ev) {
		this.isPollingPaused = true;
		this.cancelBtn.disabled = true;
		this.progressLabel.textContent = _('Canceling...');

		callOtaCancel().then(function(res) {
			this.handleStateSwitch('checked');
			ui.addNotification(null, E('p', {}, _('Download canceled successfully.')));
		}.bind(this)).catch(function(err) {
			ui.addNotification(null, E('p', {}, _('Cancel failed: %s').format(err.message || 'Unknown error')));
		}.bind(this)).finally(function() {
			this.cancelBtn.disabled = false;
		}.bind(this));
	},

	handleFlashImage: function(ev) {
		ev.preventDefault();
		var keepCheckbox = ev.target.form.querySelector('input[name="keep"]');
		var keep = keepCheckbox.checked ? 1 : 0;
		ev.target.disabled = true;

		return callOtaApply(keep).then(function(res) {
			if (res && res.code === 0) {
				ui.showModal(_('Flashing…'), [
					E('p', { 'class': 'spinning' }, _('The system is flashing now.<br /> DO NOT POWER OFF THE DEVICE!<br /> Wait a few minutes before you try to reconnect. It might be necessary to renew the address of your computer to reach the device again, depending on your settings.'))
				]);

				if (keepCheckbox.checked) {
					ui.awaitReconnect(window.location.host);
				} else {
					ui.awaitReconnect('10.0.0.1', 'openwrt.lan');
				}

			} else {
				ev.target.disabled = false;
				ui.addNotification(null, E('p', {}, _('Flash failed: %s').format(res ? res.msg : 'Unknown error')));
			}
		}).catch(function(err) {
			ev.target.disabled = false;
			ui.addNotification(null, E('p', {}, _('Flash failed: %s').format(err.message || 'Unknown error')));
		});
	},

	render: function() {
		this.checkResultLabel = E('label', { 'class': 'cbi-value-title' });
		this.upgradeLogContainer = E('div', { 'id': 'upgrade_log' });
		this.progressLabel = E('label', { 'class': 'cbi-value-title' });

		this.checkBtn = E('button', {
			'class': 'cbi-button cbi-button-reload',
			'click': this.handleCheckUpdate.bind(this)
		}, _('Check update'));

		this.cancelBtn = E('button', {
			'class': 'cbi-button cbi-button-reset',
			'click': this.handleCancelDownload.bind(this)
		}, _('Cancel download'));

		this.stateContainer = E('div', { 'class': 'cbi-section state-ctl' },[
			E('div', { 'class': 'cbi-section-node' },[
				E('div', { 'class': 'state state-checked' },
					E('div', { 'class': 'cbi-value' },[
						this.checkResultLabel,
						E('div', { 'class': 'cbi-value-field' },
							E('button', {
								'class': 'cbi-button cbi-button-apply',
								'click': this.handleDownloadFirmware.bind(this)
							}, _('Download firmware'))
						)
					])
				),

				E('div', { 'class': 'state state-downloading' },
					E('div', { 'class': 'cbi-value' },[
						this.progressLabel,
						E('div', { 'class': 'cbi-value-field' }, this.cancelBtn)
					])
				),

				E('div', { 'class': 'state state-downloaded' },
					E('form', { 'class': 'inline' },[
						E('div', { 'class': 'cbi-value' },[
							E('label', { 'class': 'cbi-value-title', 'for': 'keep' }, _('Keep settings and retain the current configuration')),
							E('div', { 'class': 'cbi-value-field' },
								E('input', { 'type': 'checkbox', 'name': 'keep', 'id': 'keep', 'checked': 'checked' })
							)
						]),

						E('div', { 'class': 'cbi-value cbi-value-last' },[
							E('label', { 'class': 'cbi-value-title' }, _('Firmware downloaded')),
							E('div', { 'class': 'cbi-value-field' },
								E('button', {
									'class': 'cbi-button cbi-input-apply',
									'click': this.handleFlashImage.bind(this)
								}, _('Flash image...'))
							)
						])
					])
				)
			]),

			this.upgradeLogContainer
		]);

		return E('div', {},[
			E('style', { 'type': 'text/css' },
				'.state-ctl .state { display: none; }' +
				'.state-ctl.state-ctl-checked .state.state-checked,' +
				'.state-ctl.state-ctl-downloading .state.state-downloading,' +
				'.state-ctl.state-ctl-downloaded .state.state-downloaded {' +
				'	display: block;' +
				'}'
			),

			E('h2', {}, _('OTA')),
			E('p', {}, _('Check and upgrade firmware from the Internet')),
			E('div', { 'class': 'cbi-value' },[
				E('label', { 'class': 'cbi-value-title' }),
				E('div', { 'class': 'cbi-value-field' }, this.checkBtn)
			]),

			this.stateContainer
		]);
	},

	addFooter: function() {
		return E('div', {});
	}

});
