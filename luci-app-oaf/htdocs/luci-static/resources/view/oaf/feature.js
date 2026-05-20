'use strict';
'require rpc';
'require ui';
'require fs';

const callUpgradeFeature = rpc.declare({
	object: 'luci.oaf',
	method: 'upgrade_feature',
	params: ['file']
});

return L.view.extend({
	featureInfo: {
		version: _('Unknown'),
		format: 'v3.0',
		rule_count: 0
	},

	load() {
		if (!document.getElementById('oaf-css')) {
			const link = document.createElement('link');
			link.id = 'oaf-css';
			link.rel = 'stylesheet';
			link.href = L.resource('view/oaf/css/common.css');
			document.head.appendChild(link);
		}

		const view = this;
		return fs.read('/etc/appfilter/feature.cfg').then((content) => {
			if (content) {
				const lines = content.split('\n');
				let count = 0;
				let version = _('Unknown');
				let format = 'v3.0';

				lines.forEach(line => {
					line = line.trim();
					if (line.indexOf('#version') === 0) {
						const parts = line.split(/\s+/);
						if (parts.length >= 2) {
							version = parts[1];
						}
					} else if (line.indexOf('#format') === 0) {
						const parts = line.split(/\s+/);
						if (parts.length >= 2) {
							format = parts[1];
						}
					} else if (line.length > 0 && line.indexOf('#') !== 0) {
						count++;
					}
				});

				view.featureInfo = {
					version: version,
					format: format,
					rule_count: count
				};
			}
			return view.featureInfo;
		}).catch((err) => {
			// file not exist yet
			return view.featureInfo;
		});
	},

	render(info) {
		const view = this;

		const fileInput = E('input', {
			'type': 'file',
			'id': 'ulfile',
			'name': 'ulfile',
			'class': 'cbi-input-file',
			'style': 'width: 350px;'
		});

		const container = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('App Feature')),
			E('div', { 'class': 'cbi-map-descr' }, _('The feature library is used to describe App features, App filtering effect and number-dependent feature library.')),
			
			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-section-node' }, [
					
					// current features
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, _('Current version') + ':'),
						E('div', { 'class': 'cbi-value-field', 'id': 'feature-version' }, info.version)
					]),
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, _('Feature format') + ':'),
						E('div', { 'class': 'cbi-value-field', 'id': 'feature-format' }, info.format)
					]),
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, _('App number') + ':'),
						E('div', { 'class': 'cbi-value-field', 'id': 'feature-count' }, info.rule_count)
					]),
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, _('Feature download') + ':'),
						E('div', { 'class': 'cbi-value-field' }, [
							E('a', { 'href': 'http://www.openappfilter.com', 'target': '_blank' }, 'www.openappfilter.com')
						])
					]),

					// update features
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title', 'for': 'ulfile' }, _('Feature Library Update') + ':'),
						E('div', { 'class': 'cbi-value-field' }, [
							fileInput,
							E('button', {
								'type': 'button',
								'class': 'cbi-button cbi-button-action',
								'style': 'margin-left: 10px;',
								'click': () => view.handleUpload(fileInput)
							}, _('Upload')),
							E('div', { 'class': 'cbi-value-description' }, _('Feature library files can be downloaded from the official website. After downloading, upload to upgrade. Note the feature code format version, which needs to be consistent with the current feature code format!'))
						])
					])
				])
			])
		]);

		return container;
	},

	handleUpload(fileInput) {
		const view = this;

		if (!fileInput.files || fileInput.files.length === 0) {
			ui.addNotification(null, E('p', {}, _('Please select a file to upload.')), 'danger');
			return;
		}

		const file = fileInput.files[0];
		if (file.name.indexOf('.bin') === -1) {
			ui.addNotification(null, E('p', {}, _('Invalid file format. Please upload a .bin feature package.')), 'danger');
			return;
		}

		ui.showModal(null, E('p', { 'class': 'spinning' }, _('Updating, please wait...')));

		const formData = new FormData();
		formData.append('sessionid', rpc.getSessionID());
		formData.append('filename', '/tmp/oaf_upgrade.tar.gz');
		formData.append('filedata', file);

		fetch('/cgi-bin/cgi-upload', {
			method: 'POST',
			body: formData
		}).then(response => {
			if (response.ok) {
				// call rpc upgrade method
				return callUpgradeFeature('/tmp/oaf_upgrade.tar.gz');
			} else {
				throw new Error(_('Upload failed.'));
			}
		}).then(res => {
			ui.hideModal();
			if (res && res.success) {
				ui.addNotification(null, E('p', {}, _(res.message || 'Update the feature file successfully.')), 'info');
				// reload version info
				view.load().then((info) => {
					document.getElementById('feature-version').textContent = info.version;
					document.getElementById('feature-format').textContent = info.format;
					document.getElementById('feature-count').textContent = info.rule_count;
				});
			} else {
				ui.addNotification(null, E('p', {}, _('Failed to upgrade feature file: ') + (res ? res.error : 'Unknown error')), 'danger');
			}
		}).catch((err) => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Failed to upload file: ') + err.message), 'danger');
		});
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
