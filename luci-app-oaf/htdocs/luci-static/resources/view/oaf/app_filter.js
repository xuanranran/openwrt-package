'use strict';
'require rpc';
'require ui';
'require dom';
'require poll';

const callGetClassList = rpc.declare({
	object: 'appfilter',
	method: 'class_list'
});

const callGetAppFilter = rpc.declare({
	object: 'appfilter',
	method: 'get_app_filter'
});

const callSetAppFilter = rpc.declare({
	object: 'appfilter',
	method: 'set_app_filter',
	params: ['app_list']
});

const callGetAppFilterBase = rpc.declare({
	object: 'appfilter',
	method: 'get_app_filter_base'
});

const callSetAppFilterBase = rpc.declare({
	object: 'appfilter',
	method: 'set_app_filter_base',
	params: ['enable', 'work_mode', 'record_enable']
});

const callGetOafStatus = rpc.declare({
	object: 'appfilter',
	method: 'get_oaf_status'
});

return L.view.extend({
	appFilterData: [],
	classListData: { class_list: [] },

	load() {
		if (!document.getElementById('oaf-css')) {
			const link = document.createElement('link');
			link.id = 'oaf-css';
			link.rel = 'stylesheet';
			link.href = L.resource('view/oaf/css/common.css');
			document.head.appendChild(link);
		}
		
		return Promise.all([
			callGetAppFilter(),
			callGetClassList(),
			callGetAppFilterBase()
		]);
	},

	render(responses) {
		const view = this;

		if (responses[0] && Array.isArray(responses[0].app_list)) {
			view.appFilterData = responses[0].app_list;
		}
		if (responses[1] && Array.isArray(responses[1].class_list)) {
			view.classListData = responses[1];
		}
		const baseConfig = responses[2] ? (responses[2].data || {}) : {};

		const container = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('App Filter')),
			E('div', { 'class': 'cbi-map-descr' }, _('Filter target internet applications, view running status, and customize blocking rules.')),
			
			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-section-node' }, [
					
					// run status
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, _('Running Status') + ':'),
						E('div', { 'class': 'cbi-value-field' }, [
							E('span', { 'id': 'run_status', 'style': 'font-weight: bold; color: red;' }, _('Not Running')),
							E('span', { 'id': 'run_desc', 'style': 'margin-left: 8px;' })
						])
					]),

					// global switch
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title', 'for': 'filterSwitch' }, _('App Filter') + ':'),
						E('div', { 'class': 'cbi-value-field' }, [
							E('input', {
								'type': 'checkbox',
								'id': 'filterSwitch',
								'name': 'filterSwitch',
								'class': 'cbi-input-checkbox',
								'change': () => view.quickSaveBase()
							})
						])
					]),

					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title', 'for': 'recordSwitch' }, _('App Record') + ':'),
						E('div', { 'class': 'cbi-value-field' }, [
							E('input', {
								'type': 'checkbox',
								'id': 'recordSwitch',
								'name': 'recordSwitch',
								'class': 'cbi-input-checkbox',
								'change': () => view.quickSaveBase()
							})
						])
					]),

					// select work mode
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title', 'for': 'workMode' }, _('Work Mode') + ':'),
						E('div', { 'class': 'cbi-value-field' }, [
							E('select', {
								'id': 'workMode',
								'name': 'workMode',
								'class': 'cbi-input-select',
								'change': () => view.quickSaveBase()
							}, [
								E('option', { 'value': '0' }, _('Gateway Mode')),
								E('option', { 'value': '1' }, _('Bypass Mode'))
							])
						])
					])
				])
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('App Selection')),
				E('div', { 'class': 'cbi-value-description', 'style': 'margin-bottom: 15px;' }, _('If the App you want is not in the list, you can upgrade the feature library of the official website or customize the App.')),
				E('div', { 'id': 'appContainer' })
			]),

			E('div', { 'class': 'cbi-page-actions' }, [
				E('button', {
					'type': 'button',
					'class': 'cbi-button cbi-button-save',
					'click': () => view.submitHandle()
				}, _('Save'))
			])
		]);

		// set checkbox checked value
		const filterSwitch = container.querySelector('#filterSwitch');
		if (filterSwitch) {
			filterSwitch.checked = (baseConfig.enable == 1);
		}

		const recordSwitch = container.querySelector('#recordSwitch');
		if (recordSwitch) {
			recordSwitch.checked = (baseConfig.record_enable == 1);
		}

		const workMode = container.querySelector('#workMode');
		if (workMode) {
			workMode.value = (baseConfig.work_mode !== undefined) ? baseConfig.work_mode : '0';
		}

		view.renderAppList(view.classListData, container.querySelector('#appContainer'));

		// poll status
		poll.add(() => {
			return view.updateRunStatus();
		}, 5);

		view.updateRunStatus();

		return container;
	},

	renderAppList(data, container) {
		const view = this;
		container.innerHTML = '';

		if (!data || !Array.isArray(data.class_list)) return;

		data.class_list.forEach((category, index) => {
			// count selected apps
			const selectedCount = category.app_list.filter(app => {
				const appId = parseInt(app.split(',')[0]);
				return view.appFilterData.includes(appId);
			}).length;

			const categoryTitle = E('div', { 'class': 'category-title' }, [
				E('span', { 'class': 'category-name' }, `${category.name} (${category.app_list.length} ${_('items')})`),
				E('div', { 'style': 'display: flex; align-items: center; gap: 8px;' }, [
					E('span', { 'class': 'app-count' }, `${_('Selected')} ${selectedCount} ${_('items')}`),
					E('span', { 'class': 'arrow' + (index === 0 ? ' expanded' : '') })
				])
			]);

			const selectAllCheckbox = E('input', {
				'type': 'checkbox',
				'title': selectedCount === category.app_list.length ? _('Deselect All') : _('Select All')
			});
			selectAllCheckbox.checked = (selectedCount === category.app_list.length);

			const selectAllContainer = E('div', { 'class': 'select-all-container' }, [
				selectAllCheckbox,
				E('span', { 'class': 'select-all-label' }, _('Select All'))
			]);

			const appItemsRow = E('div', { 'class': 'app-items-row' });

			const appList = E('div', {
				'class': 'app-list',
				'style': (index === 0 ? 'display: flex;' : 'display: none;')
			}, [
				selectAllContainer,
				appItemsRow
			]);

			// click to toggle
			categoryTitle.onclick = function() {
				const arrow = categoryTitle.querySelector('.arrow');
				if (appList.style.display === 'none') {
					appList.style.display = 'flex';
					arrow.classList.add('expanded');
				} else {
					appList.style.display = 'none';
					arrow.classList.remove('expanded');
				}
			};

			// select all toggle
			const changeSelectAll = function(e) {
				const checked = selectAllCheckbox.checked;
				const listCheckboxes = appItemsRow.querySelectorAll('input[type="checkbox"]');
				listCheckboxes.forEach(cb => {
					cb.checked = checked;
				});
				
				const countSpan = categoryTitle.querySelector('.app-count');
				const count = checked ? category.app_list.length : 0;
				countSpan.textContent = `${_('Selected')} ${count} ${_('items')}`;
			};

			selectAllCheckbox.onchange = changeSelectAll;
			selectAllContainer.querySelector('.select-all-label').onclick = function(e) {
				e.stopPropagation();
				selectAllCheckbox.checked = !selectAllCheckbox.checked;
				changeSelectAll(e);
			};

			// render apps
			category.app_list.forEach(app => {
				const appDetails = app.split(',');
				const appId = appDetails[0];
				const appName = appDetails[1];
				const withIcon = appDetails[2] === '1';

				const iconSrc = withIcon ? L.resource(`app_icons/${appId}.png`) : L.resource('app_icons/default.png');
				
				const checkbox = E('input', {
					'type': 'checkbox',
					'name': 'app',
					'value': appId,
					'change': function() {
						const checkedBoxes = appItemsRow.querySelectorAll('input[type="checkbox"]:checked');
						const countSpan = categoryTitle.querySelector('.app-count');
						countSpan.textContent = `${_('Selected')} ${checkedBoxes.length} ${_('items')}`;
						selectAllCheckbox.checked = (checkedBoxes.length === category.app_list.length);
					}
				});
				checkbox.checked = view.appFilterData.includes(parseInt(appId));

				const appItem = E('div', { 'class': 'app-item' }, [
					E('label', {}, [
						checkbox,
						E('img', {
							'src': iconSrc,
							'alt': appName,
							'style': 'width: 20px; height: 20px; border-radius: 4px; margin-left: 6px; margin-right: 6px; vertical-align: middle;'
						}),
						E('span', {}, appName)
					])
				]);

				dom.append(appItemsRow, appItem);
			});

			dom.append(container, [categoryTitle, appList]);
		});
	},

	submitAppSelection() {
		const view = this;
		const selectedApps = [];
		const checkboxes = document.querySelectorAll('input[name="app"]:checked');
		checkboxes.forEach(cb => {
			selectedApps.push(parseInt(cb.value));
		});

		return callSetAppFilter(selectedApps).then(() => {
			view.appFilterData = selectedApps;
		});
	},

	submitAppFilterBase() {
		const filterSwitch = document.getElementById('filterSwitch').checked ? 1 : 0;
		const recordSwitch = document.getElementById('recordSwitch').checked ? 1 : 0;
		const workMode = parseInt(document.getElementById('workMode').value, 10);

		return callSetAppFilterBase(filterSwitch, workMode, recordSwitch);
	},

	quickSaveBase() {
		const view = this;
		ui.showModal(null, E('p', { 'class': 'spinning' }, _('Applying changes...')));
		
		view.submitAppFilterBase().then(() => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Settings applied successfully.')), 'info');
			view.updateRunStatus();
		}).catch((err) => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Failed to apply settings: ') + err.message), 'danger');
		});
	},

	submitHandle() {
		const view = this;
		ui.showModal(null, E('p', { 'class': 'spinning' }, _('Saving configuration...')));

		Promise.all([
			view.submitAppSelection()
		]).then(() => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Settings saved successfully.')), 'info');
			view.updateRunStatus();
		}).catch((err) => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Failed to save settings: ') + err.message), 'danger');
		});
	},

	updateRunStatus() {
		return callGetOafStatus().then((data) => {
			const status = data.data || {};
			const runStatusElement = document.getElementById('run_status');
			const runDescElement = document.getElementById('run_desc');

			if (!runStatusElement || !runDescElement) return;

			if (status.engine_status === 1) {
				if (status.config_enable == 0) {
					runStatusElement.textContent = _('Not Configured');
					runStatusElement.style.color = 'red';
					runDescElement.textContent = '';
				} else {
					if (status.enable === 1) {
						runStatusElement.textContent = _('Running');
						runStatusElement.style.color = 'green';
						if (status.time_mode == 1 && status.filter == 1) {
							runDescElement.textContent = `(${_('Will close in')} ${status.remain_time} ${_('minutes')})`;
						} else {
							runDescElement.textContent = '';
						}
					} else {
						runStatusElement.textContent = _('Not Running');
						runStatusElement.style.color = 'red';
						if (status.time_mode == 1) {
							if (status.match_time == 0) {
								runDescElement.textContent = `(${_('Current time is not within the time range')})`;
							} else {
								runDescElement.textContent = `(${_('Will start in')} ${status.remain_time} ${_('minutes')})`;
							}
						} else {
							runDescElement.textContent = `(${_('Current time is not within the time range')})`;
						}
					}
				}
			} else {
				runStatusElement.textContent = _('Not Running');
				runStatusElement.style.color = 'red';
				runDescElement.textContent = `(${_('oaf driver not loaded, please download the oaf.ko driver file corresponding to the kernel version of this firmware for installation, and enable auto-loading. Current kernel version is')} ${status.kernel_version})`;
			}
		});
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
