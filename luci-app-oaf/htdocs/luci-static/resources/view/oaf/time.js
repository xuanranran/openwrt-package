'use strict';
'require rpc';
'require ui';
'require dom';

const callGetAppFilterTime = rpc.declare({
	object: 'appfilter',
	method: 'get_app_filter_time'
});

const callSetAppFilterTime = rpc.declare({
	object: 'appfilter',
	method: 'set_app_filter_time',
	params: ['mode', 'weekday_list', 'time_list', 'start_time', 'end_time', 'allow_time', 'deny_time']
});

return L.view.extend({
	timeData: {},

	load() {
		if (!document.getElementById('oaf-css')) {
			const link = document.createElement('link');
			link.id = 'oaf-css';
			link.rel = 'stylesheet';
			link.href = L.resource('view/oaf/css/common.css');
			document.head.appendChild(link);
		}

		return callGetAppFilterTime().then((res) => {
			return res ? (res.data || {}) : {};
		});
	},

	render(timeData) {
		const view = this;
		view.timeData = timeData;

		const container = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Time Configuration')),
			E('div', { 'class': 'cbi-map-descr' }, _('Configure effective time rules for application filtering.')),

			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-section-node' }, [

					// select time mode
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title', 'for': 'timeMode' }, _('Mode Selection') + ':'),
						E('div', { 'class': 'cbi-value-field' }, [
							E('select', {
								'id': 'timeMode',
								'class': 'cbi-input-select',
								'change': () => view.toggleModeContent()
							}, [
								E('option', { 'value': '0' }, _('Fixed Time')),
								E('option', { 'value': '1' }, _('Dynamic Time'))
							])
						])
					]),

					// static time mode
					E('div', { 'id': 'staticTimeSection' }, [
						E('div', { 'class': 'cbi-value' }, [
							E('label', { 'class': 'cbi-value-title' }, _('Weekday Selection') + ':'),
							E('div', { 'class': 'cbi-value-field' }, [
								E('div', { 'style': 'display: flex; flex-wrap: wrap; gap: 15px;' }, [
									{ val: '1', label: _('Mon') },
									{ val: '2', label: _('Tue') },
									{ val: '3', label: _('Wed') },
									{ val: '4', label: _('Thur') },
									{ val: '5', label: _('Fri') },
									{ val: '6', label: _('Sat') },
									{ val: '0', label: _('Sun') }
								].map(item => E('label', { 'style': 'margin-right: 15px; display: inline-flex; align-items: center; gap: 4px;' }, [
									E('input', { 'type': 'checkbox', 'name': 'weekday_static', 'value': item.val, 'class': 'cbi-input-checkbox' }),
									' ' + item.label
								])))
							])
						]),

						E('div', { 'class': 'cbi-value' }, [
							E('label', { 'class': 'cbi-value-title' }, _('Time Periods') + ':'),
							E('div', { 'class': 'cbi-value-field' }, [
								E('table', { 'class': 'cbi-section-table', 'id': 'timeTable' }, [
									E('tr', { 'class': 'tr table-titles' }, [
										E('th', { 'class': 'th', 'style': 'width: 40%;' }, _('Start Time')),
										E('th', { 'class': 'th', 'style': 'width: 40%;' }, _('End Time')),
										E('th', { 'class': 'th', 'style': 'width: 20%;' }, _('Actions'))
									])
								]),
								E('div', { 'id': 'errorContainer', 'style': 'color: red; font-size: 12px; margin-top: 10px;' }),
								E('div', { 'style': 'margin-top: 15px;' }, [
									E('button', {
										'type': 'button',
										'class': 'cbi-button cbi-button-action',
										'click': () => view.addTimeRow('00:00', '23:59')
									}, _('Add Time Period'))
								])
							])
						])
					]),

					// dynamic time mode
					E('div', { 'id': 'dynamicTimeSection', 'style': 'display: none;' }, [
						E('div', { 'class': 'cbi-value' }, [
							E('label', { 'class': 'cbi-value-title' }, _('Dynamic Time Rules') + ':'),
							E('div', { 'class': 'cbi-value-field' }, [
								E('div', { 'class': 'cbi-value-description', 'style': 'margin-bottom: 15px;' }, _('Dynamic time mode refers to dynamically adjusting app filter switches, such as allowing children to play games for 20 minutes after studying for 1 hour, automatically enabling filtering after exceeding entertainment time, and repeating the cycle.'))
							])
						]),
						
						E('div', { 'class': 'cbi-value' }, [
							E('label', { 'class': 'cbi-value-title', 'for': 'denyTime' }, _('Enable Duration Each Time (Study Time)') + ':'),
							E('div', { 'class': 'cbi-value-field' }, [
								E('input', { 'type': 'number', 'id': 'denyTime', 'min': '1', 'class': 'cbi-input-text', 'value': timeData.deny_time || '60', 'style': 'width: 100px;' }),
								E('span', {}, ' ' + _('minutes'))
							])
						]),

						E('div', { 'class': 'cbi-value' }, [
							E('label', { 'class': 'cbi-value-title', 'for': 'allowTime' }, _('Disable Duration Each Time (Break Time)') + ':'),
							E('div', { 'class': 'cbi-value-field' }, [
								E('input', { 'type': 'number', 'id': 'allowTime', 'min': '1', 'class': 'cbi-input-text', 'value': timeData.allow_time || '10', 'style': 'width: 100px;' }),
								E('span', {}, ' ' + _('minutes'))
							])
						]),

						// advanced settings (weekday and time range directly visible in dynamic mode)
						E('div', { 'class': 'cbi-value' }, [
							E('label', { 'class': 'cbi-value-title' }, _('Weekday Selection') + ':'),
							E('div', { 'class': 'cbi-value-field' }, [
								E('div', { 'style': 'display: flex; flex-wrap: wrap; gap: 15px;' }, [
									{ val: '1', label: _('Mon') },
									{ val: '2', label: _('Tue') },
									{ val: '3', label: _('Wed') },
									{ val: '4', label: _('Thur') },
									{ val: '5', label: _('Fri') },
									{ val: '6', label: _('Sat') },
									{ val: '0', label: _('Sun') }
								].map(item => E('label', { 'style': 'margin-right: 15px; display: inline-flex; align-items: center; gap: 4px;' }, [
									E('input', { 'type': 'checkbox', 'name': 'weekday_dynamic', 'value': item.val, 'class': 'cbi-input-checkbox' }),
									' ' + item.label
								]))),
								E('div', { 'id': 'dynamicWeekdayErrorContainer', 'style': 'color: red; font-size: 12px; margin-top: 5px; display: none;' })
							])
						]),

						E('div', { 'class': 'cbi-value' }, [
							E('label', { 'class': 'cbi-value-title' }, _('Daily Study Time Range') + ':'),
							E('div', { 'class': 'cbi-value-field' }, [
								E('input', { 'type': 'time', 'id': 'startTime', 'class': 'cbi-input-text', 'value': timeData.start_time || '08:00', 'style': 'width: auto; display: inline-block;' }),
								E('span', { 'style': 'margin: 0 10px;' }, '-'),
								E('input', { 'type': 'time', 'id': 'endTime', 'class': 'cbi-input-text', 'value': timeData.end_time || '20:00', 'style': 'width: auto; display: inline-block;' }),
								E('div', { 'class': 'cbi-value-description', 'style': 'margin-top: 5px;' }, _('This time range represents the daily school time period, which is a continuous time period. During this time period, filtering rules are dynamically enabled and disabled. Outside the time range, filtering is disabled by default.'))
							])
						]),

						E('div', { 'id': 'dynamicErrorContainer', 'style': 'color: red; font-size: 12px; margin-top: 10px;' })
					])
				])
			]),

			E('div', { 'class': 'cbi-page-actions' }, [
				E('button', {
					'type': 'button',
					'class': 'cbi-button cbi-button-save',
					'click': () => view.submitHandle()
				}, _('Save'))
			])
		]);

		// set the UI values
		view.populateTimeUI(container);

		return container;
	},

	populateTimeUI(container) {
		const view = this;
		const data = view.timeData;

		const timeModeSelect = container.querySelector('#timeMode');
		if (timeModeSelect && data.mode !== undefined) {
			timeModeSelect.value = String(data.mode);
		}

		// check weekday checkboxes
		const weekdays = data.weekday_list || [];
		weekdays.forEach(day => {
			const cbStatic = container.querySelector(`input[name="weekday_static"][value="${day}"]`);
			const cbDynamic = container.querySelector(`input[name="weekday_dynamic"][value="${day}"]`);
			if (cbStatic) cbStatic.checked = true;
			if (cbDynamic) cbDynamic.checked = true;
		});

		// add static rows
		const table = container.querySelector('#timeTable');
		if (Array.isArray(data.time_list)) {
			data.time_list.forEach(range => {
				view.addTimeRow(range.start, range.end, table);
			});
		}

		view.toggleModeContent(container);
	},

	toggleModeContent(container) {
		container = container || document.body;
		const mode = container.querySelector('#timeMode').value;
		const staticSection = container.querySelector('#staticTimeSection');
		const dynamicSection = container.querySelector('#dynamicTimeSection');

		if (mode === '1') {
			staticSection.style.display = 'none';
			dynamicSection.style.display = 'block';
		} else {
			staticSection.style.display = 'block';
			dynamicSection.style.display = 'none';
		}
	},

	addTimeRow(start, end, table) {
		table = table || document.getElementById('timeTable');
		if (!table) return;

		const tr = table.insertRow(-1);
		tr.className = 'tr';

		const cellStart = tr.insertCell(-1);
		cellStart.className = 'td';
		const inputStart = E('input', {
			'type': 'time',
			'class': 'start-time cbi-input-text',
			'value': start,
			'required': true
		});
		dom.append(cellStart, inputStart);

		const cellEnd = tr.insertCell(-1);
		cellEnd.className = 'td';
		const inputEnd = E('input', {
			'type': 'time',
			'class': 'end-time cbi-input-text',
			'value': end,
			'required': true
		});
		dom.append(cellEnd, inputEnd);

		const cellActions = tr.insertCell(-1);
		cellActions.className = 'td';
		const btnDel = E('button', {
			'type': 'button',
			'class': 'cbi-button cbi-button-reset',
			'click': () => tr.remove()
		}, _('Delete'));
		dom.append(cellActions, btnDel);
	},

	isValidTimeFormat(time) {
		const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
		return timePattern.test(time);
	},

	submitHandle() {
		const view = this;
		const mode = parseInt(document.getElementById('timeMode').value, 10);
		const weekdays = [];

		const weekdayCbs = document.querySelectorAll(mode === 0 ? 'input[name="weekday_static"]:checked' : 'input[name="weekday_dynamic"]:checked');
		weekdayCbs.forEach(cb => {
			weekdays.push(parseInt(cb.value, 10));
		});

		if (weekdays.length === 0) {
			ui.addNotification(null, E('p', {}, _('Please select at least one weekday.')), 'danger');
			return;
		}

		const timeList = [];
		let startTime = '';
		let endTime = '';
		let allowTime = 10;
		let denyTime = 60;

		if (mode === 0) {
			const rows = document.querySelectorAll('#timeTable tr.tr:not(.table-titles)');
			let validationError = false;

			rows.forEach(row => {
				const startVal = row.querySelector('.start-time').value;
				const endVal = row.querySelector('.end-time').value;

				if (!view.isValidTimeFormat(startVal) || !view.isValidTimeFormat(endVal)) {
					ui.addNotification(null, E('p', {}, _('Invalid time format, please enter HH:MM.')), 'danger');
					validationError = true;
					return;
				}

				if (startVal >= endVal) {
					ui.addNotification(null, E('p', {}, _('End time must be greater than start time.')), 'danger');
					validationError = true;
					return;
				}

				timeList.push({ start: startVal, end: endVal });
			});

			if (validationError) return;

			if (timeList.length === 0) {
				ui.addNotification(null, E('p', {}, _('Please add at least one time period.')), 'danger');
				return;
			}

			if (timeList.length > 64) {
				ui.addNotification(null, E('p', {}, _('Time periods cannot exceed 64 entries.')), 'danger');
				return;
			}
		} else {
			startTime = document.getElementById('startTime').value;
			endTime = document.getElementById('endTime').value;
			allowTime = parseInt(document.getElementById('allowTime').value, 10);
			denyTime = parseInt(document.getElementById('denyTime').value, 10);

			if (!view.isValidTimeFormat(startTime) || !view.isValidTimeFormat(endTime)) {
				ui.addNotification(null, E('p', {}, _('Invalid time format, please enter HH:MM.')), 'danger');
				return;
			}

			if (startTime >= endTime) {
				ui.addNotification(null, E('p', {}, _('End time must be greater than start time.')), 'danger');
				return;
			}

			if (isNaN(allowTime) || allowTime < 1 || isNaN(denyTime) || denyTime < 1) {
				ui.addNotification(null, E('p', {}, _('Please set valid duration minutes.')), 'danger');
				return;
			}
		}

		ui.showModal(null, E('p', { 'class': 'spinning' }, _('Saving configuration...')));

		callSetAppFilterTime(
			mode,
			weekdays,
			timeList,
			startTime,
			endTime,
			allowTime,
			denyTime
		).then(() => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Settings saved successfully.')), 'info');
		}).catch((err) => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Failed to save settings: ') + err.message), 'danger');
		});
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
