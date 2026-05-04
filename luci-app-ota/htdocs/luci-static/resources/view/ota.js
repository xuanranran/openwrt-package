'use strict';
'require view';
'require ui';
'require rpc';

const callOtaCheck = rpc.declare({
	object: 'luci.ota',
	method: 'check',
	expect: { '': {} }
});

const callOtaDownload = rpc.declare({
	object: 'luci.ota',
	method: 'download',
	expect: { '': {} }
});

const callOtaProgress = rpc.declare({
	object: 'luci.ota',
	method: 'progress',
	expect: { '': {} }
});

const callOtaCancel = rpc.declare({
	object: 'luci.ota',
	method: 'cancel',
	expect: { '': {} }
});

const callOtaApply = rpc.declare({
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

	renderMarkdown(text) {
		if (!text) return '';
		let html = '';
		let inList = false;
		let inOrderedList = false;
		let inCodeBlock = false;
		let lastType = 'block';

		const renderInline = (s) => {
			return s.replace(/\*\*\*(.*?)\*\*\*/g, '<b><i>$1</i></b>')
				.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
				.replace(/\*(.*?)\*/g, '<i>$1</i>')
				.replace(/__(.*?)__/g, '<b>$1</b>')
				.replace(/_(.*?)_/g, '<i>$1</i>')
				.replace(/~~(.*?)~~/g, '<del>$1</del>')
				.replace(/`(.*?)`/g, '<code>$1</code>')
				.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
		};

		text.split('\n').forEach(line => {
			const trimmed = line.trim();

			if (trimmed.startsWith('```')) {
				if (inCodeBlock) {
					html += '</pre>';
					inCodeBlock = false;
					lastType = 'block';
				} else {
					if (inList) { html += '</ul>'; inList = false; }
					if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
					html += '<pre>';
					inCodeBlock = true;
				}
				return;
			}

			if (inCodeBlock) {
				html += line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\n';
				return;
			}

			if (trimmed === '') {
				if (inList) { html += '</ul>'; inList = false; }
				if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
				if (lastType === 'inline') {
					html += '<br/>';
					lastType = 'block';
				}
				return;
			}

			line = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

			let m;
			if (m = line.match(/^(#+)\s+(.*)$/)) {
				if (inList) { html += '</ul>'; inList = false; }
				if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
				const tag = 'h' + Math.min(m[1].length + 2, 6);
				html += '<' + tag + '>' + renderInline(m[2]) + '</' + tag + '>';
				lastType = 'block';
			} else if (m = line.match(/^>\s*(.*)$/)) {
				if (inList) { html += '</ul>'; inList = false; }
				if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
				html += '<blockquote>' + renderInline(m[1]) + '</blockquote>';
				lastType = 'block';
			} else if (m = line.match(/^[\-\*]\s+(.*)$/)) {
				if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
				if (!inList) { html += '<ul>'; inList = true; }
				html += '<li>' + renderInline(m[1]) + '</li>';
				lastType = 'block';
			} else if (m = line.match(/^\d+\.\s+(.*)$/)) {
				if (inList) { html += '</ul>'; inList = false; }
				if (!inOrderedList) { html += '<ol>'; inOrderedList = true; }
				html += '<li>' + renderInline(m[1]) + '</li>';
				lastType = 'block';
			} else {
				if (inList) { html += '</ul>'; inList = false; }
				if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
				html += renderInline(line) + '<br/>';
				lastType = 'inline';
			}
		});

		if (inList) html += '</ul>';
		if (inOrderedList) html += '</ol>';
		if (inCodeBlock) html += '</pre>';

		return html;
	},

	handleStateSwitch(to) {
		if (this.stateContainer) {
			this.stateContainer.classList.remove('state-ctl-checked', 'state-ctl-downloading', 'state-ctl-downloaded');
			if (to) {
				this.stateContainer.classList.add('state-ctl-' + to);
			}
		}
	},

	handleCheckUpdate(ev) {
		this.checkBtn.disabled = true;
		this.checkResultLabel.textContent = '';
		this.upgradeLogContainer.innerHTML = '<p class="spinning">' + _('Checking...') + '</p>';
		this.handleStateSwitch(null);

		return callOtaCheck().then(res => {
			this.checkBtn.disabled = false;

			if (!res || res.code !== 0) {
				this.checkResultLabel.textContent = _('Check failed');
				this.upgradeLogContainer.innerHTML = '';
				ui.addNotification(null, E('p', {}, _('Check failed: %s').format(res ? res.msg : 'Unknown error')));
				return;
			}

			const data = res.data || {};
			let html = '';

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
				html += '<br/><br/><h4>' + _('Changelog') + '</h4><div class="changelog-content">' + this.renderMarkdown(data.logs) + '</div>';
			}

			this.upgradeLogContainer.innerHTML = html;

		}).catch(err => {
			this.checkBtn.disabled = false;
			this.checkResultLabel.textContent = _('Check failed');
			this.upgradeLogContainer.innerHTML = '';
			ui.addNotification(null, E('p', {}, _('Check failed: %s').format(err.message || 'Unknown error')));
		});
	},

	handleDownloadFirmware(ev) {
		ev.target.disabled = true;
		this.isPollingPaused = false;

		return callOtaDownload().then(res => {
			ev.target.disabled = false;
			if (res && res.code === 0) {
				this.handleStateSwitch('downloading');
				this.progressLabel.textContent = _('Downloading: ...');
				this.pollDownloadProgress();
			} else {
				ui.addNotification(null, E('p', {}, _('Download failed: %s').format(res ? res.msg : 'Unknown error')));
			}
		}).catch(err => {
			ev.target.disabled = false;
			ui.addNotification(null, E('p', {}, _('Download failed: %s').format(err.message || 'Unknown error')));
		});
	},

	pollDownloadProgress() {
		if (this.isPollingPaused) return;

		callOtaProgress().then(res => {
			if (this.isPollingPaused) return;
			if (!res) return;

			if (res.code === 0) {
				this.handleStateSwitch('downloaded');
			} else if (res.code === 1) {
				this.progressLabel.textContent = _('Downloading: %s').format(res.msg || '...');
				window.setTimeout(() => this.pollDownloadProgress(), 1000);
			} else if (res.code === 2) {
				ui.addNotification(null, E('p', {}, _('Download canceled.')));
				this.handleStateSwitch('checked');
			} else {
				ui.addNotification(null, E('p', {}, _('Download failed: %s').format(res.msg || 'Unknown error')));
				this.handleStateSwitch('checked');
			}
		});
	},

	handleCancelDownload(ev) {
		this.isPollingPaused = true;
		this.cancelBtn.disabled = true;
		this.progressLabel.textContent = _('Canceling...');

		callOtaCancel().then(res => {
			this.handleStateSwitch('checked');
			ui.addNotification(null, E('p', {}, _('Download canceled successfully.')));
		}).catch(err => {
			ui.addNotification(null, E('p', {}, _('Cancel failed: %s').format(err.message || 'Unknown error')));
		}).finally(() => {
			this.cancelBtn.disabled = false;
		});
	},

	handleFlashImage(ev) {
		ev.preventDefault();
		const keepCheckbox = ev.target.form.querySelector('input[name="keep"]');
		const keep = keepCheckbox.checked ? 1 : 0;
		ev.target.disabled = true;

		return callOtaApply(keep).then(res => {
			if (res && res.code === 0) {
				ui.showModal(_('Flashing…'), [
					E('p', { 'class': 'spinning' }, _('The system is flashing now.<br /> DO NOT POWER OFF THE DEVICE!<br /> Wait a few minutes before you try to reconnect. It might be necessary to renew the address of your computer to reach the device again, depending on your settings.'))
				]);

				const interval = window.setInterval(() => {
					const img = new Image();
					const target = window.location.protocol + '//' + window.location.host;

					img.onload = () => {
						window.clearInterval(interval);
						window.location.replace(target);
					};

					img.src = target + L.resource('icons/loading.svg') + '?' + Math.random();
				}, 10000);

			} else {
				ev.target.disabled = false;
				ui.addNotification(null, E('p', {}, _('Flash failed: %s').format(res ? res.msg : 'Unknown error')));
			}
		}).catch(err => {
			ev.target.disabled = false;
			ui.addNotification(null, E('p', {}, _('Flash failed: %s').format(err.message || 'Unknown error')));
		});
	},

	render() {
		this.checkResultLabel = E('label', { 'class': 'cbi-value-title' });
		this.upgradeLogContainer = E('div', { 'id': 'upgrade_log' });
		this.progressLabel = E('label', { 'class': 'cbi-value-title' });

		this.checkBtn = E('button', {
			'class': 'cbi-button cbi-button-reload',
			'click': ui.createHandlerFn(this, 'handleCheckUpdate')
		}, _('Check update'));

		this.cancelBtn = E('button', {
			'class': 'cbi-button cbi-button-reset',
			'click': ui.createHandlerFn(this, 'handleCancelDownload')
		}, _('Cancel download'));

		this.stateContainer = E('div', { 'class': 'cbi-section state-ctl' }, [
			E('div', { 'class': 'cbi-section-node' }, [
				E('div', { 'class': 'state state-checked' },
					E('div', { 'class': 'cbi-value' }, [
						this.checkResultLabel,
						E('div', { 'class': 'cbi-value-field' },
							E('button', {
								'class': 'cbi-button cbi-button-apply',
								'click': ui.createHandlerFn(this, 'handleDownloadFirmware')
							}, _('Download firmware'))
						)
					])
				),

				E('div', { 'class': 'state state-downloading' },
					E('div', { 'class': 'cbi-value' }, [
						this.progressLabel,
						E('div', { 'class': 'cbi-value-field' }, this.cancelBtn)
					])
				),

				E('div', { 'class': 'state state-downloaded' },
					E('form', { 'class': 'inline' }, [
						E('div', { 'class': 'cbi-value' }, [
							E('label', { 'class': 'cbi-value-title', 'for': 'keep' }, _('Keep settings and retain the current configuration')),
							E('div', { 'class': 'cbi-value-field' },
								E('input', { 'type': 'checkbox', 'name': 'keep', 'id': 'keep', 'checked': 'checked' })
							)
						]),

						E('div', { 'class': 'cbi-value cbi-value-last' }, [
							E('label', { 'class': 'cbi-value-title' }, _('Firmware downloaded')),
							E('div', { 'class': 'cbi-value-field' },
								E('button', {
									'class': 'cbi-button cbi-input-apply',
									'click': ui.createHandlerFn(this, 'handleFlashImage')
								}, _('Flash image...'))
							)
						])
					])
				)
			]),

			this.upgradeLogContainer
		]);

		return E('div', {}, [
			E('style', { 'type': 'text/css' },
				'.state-ctl .state { display: none; }' +
				'.state-ctl.state-ctl-checked .state.state-checked,' +
				'.state-ctl.state-ctl-downloading .state.state-downloading,' +
				'.state-ctl.state-ctl-downloaded .state.state-downloaded {' +
				'	display: block;' +
				'}' +
				'.changelog-content { border: 1px solid #ddd; padding: 10px; border-radius: 8px; max-height: 450px; overflow-y: auto; }' +
				'.changelog-content h3, .changelog-content h4, .changelog-content h5, .changelog-content h6 { margin: 10px 0 5px 0; }' +
				'.changelog-content ul, .changelog-content ol { padding-left: 20px; margin: 5px 0; }' +
				'.changelog-content blockquote { border-left: 4px solid #ddd; padding-left: 10px; color: #666; margin: 10px 0; }' +
				'.changelog-content code { background: #eee; padding: 2px 4px; border-radius: 8px; font-family: monospace; }' +
				'.changelog-content pre { background: #eee; padding: 10px; border-radius: 8px; overflow-x: auto; margin: 10px 0; font-family: monospace; }'
			),

			E('h2', {}, _('OTA')),
			E('p', {}, _('Check and upgrade firmware from the Internet')),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }),
				E('div', { 'class': 'cbi-value-field' }, this.checkBtn)
			]),

			this.stateContainer
		]);
	},

	addFooter() {
		return E('div', {});
	}
});
