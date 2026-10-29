'use strict';
'require view';
'require form';
'require uci';
'require rpc';
'require ui';
'require fs';

var SUBSTORE_ICON_URL_RUNNING = '/luci-static/resources/view/substore/icon-running.png';
var SUBSTORE_ICON_URL_STOPPED = '/luci-static/resources/view/substore/icon-stopped.png';

var callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: ['name'],
	expect: { '': {} }
});

var callInitAction = rpc.declare({
	object: 'rc',
	method: 'init',
	params: ['name', 'action']
});

var callRunCmd = rpc.declare({
	object: 'file',
	method: 'exec',
	params: ['command', 'params'],
	expect: { '': {} }
});

function getServiceStatus() {
	return callServiceList('substore').then(function(res) {
		try {
			return res['substore']['instances']['instance1']['running'];
		} catch(e) {
			return false;
		}
	});
}

function isServiceEnabled() {
	return uci.get('substore', 'config', 'enabled') === '1';
}

function readVersionFile(path) {
	return fs.read(path).then(function(v) {
		return (v || '').trim();
	}).catch(function() {
		return null;
	});
}

function loadVersionInfo() {
	return Promise.all([
		readVersionFile('/usr/libexec/substore/backend.version'),
		readVersionFile('/usr/libexec/substore/frontend.version')
	]).then(function(res) {
		return {
			backendVersion: res[0],
			frontendVersion: res[1]
		};
	});
}

function escapeHtml(s) {
	return String(s).replace(/[&<>"']/g, function(c) {
		return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
	});
}

function renderStatusPanel(isRunning, info) {
	var color = isRunning ? '#22c55e' : '#ef4444';
	var dotClass = isRunning ? 'substore_dot_on' : 'substore_dot_off';
	var statusText = isRunning ? '运行中' : '未运行';
	var backend = (info.backendVersion && info.backendVersion !== 'unknown') ? info.backendVersion : '未知';
	var frontend = (info.frontendVersion && info.frontendVersion !== 'unknown') ? info.frontendVersion : '未知';
	if (backend.length > 40) backend = backend.slice(0, 40) + '…';
	if (frontend.length > 40) frontend = frontend.slice(0, 40) + '…';

	var iconUrl = isRunning ? SUBSTORE_ICON_URL_RUNNING : SUBSTORE_ICON_URL_STOPPED;

	return '<div style="display:flex !important;flex-direction:column !important;align-items:center !important;' +
		'gap:6px;border-left:3px solid ' + color + ';border-right:3px solid ' + color + ';' +
		'padding:12px 14px;">' +
		'<img src="' + iconUrl + '" onerror="this.style.display=\'none\'" style="width:36px;height:36px;border-radius:8px;object-fit:cover;flex:none;margin-bottom:2px;">' +
		'<div style="display:flex;align-items:baseline;justify-content:center;gap:7px;">' +
		'<span class="' + dotClass + '" style="width:7px;height:7px;border-radius:50%;background:' + color + ';display:inline-block;"></span>' +
		'<strong style="font-style:italic;font-weight:800;font-size:17px;letter-spacing:-0.3px;color:' + color + ';">SubStore</strong>' +
		'<span style="font-style:italic;font-size:14px;font-weight:700;color:' + color + ';">' + statusText + '</span>' +
		'</div>' +
		'<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#5b6472;' +
		'letter-spacing:0.2px;text-align:center;">' +
		'后端: ' + escapeHtml(backend) + '<span style="margin:0 8px;opacity:0.4;">|</span>前端: ' + escapeHtml(frontend) +
		'</div>' +
		'</div>';
}

function actionButtonStyle() {
	return 'display:block !important;width:100% !important;box-sizing:border-box !important;' +
		'margin:0 !important;float:none !important;text-align:center;padding:8px 8px;' +
		'font-size:13px;font-weight:400;line-height:1.4 !important;overflow:visible !important;' +
		'white-space:normal !important;height:auto !important;';
}

function renderActionsPanel(url) {
	var style = actionButtonStyle();
	return '<div class="substore_btn_grid" style="display:grid !important;grid-template-columns:repeat(2,1fr) !important;gap:8px !important;width:100% !important;align-items:stretch;">' +
		'<button class="btn cbi-button cbi-button-action" id="btn_open_panel" style="' + style + '">打开面板</button>' +
		'<button class="btn cbi-button cbi-button-action" id="btn_restart" style="' + style + '">重启服务</button>' +
		'<button class="btn cbi-button cbi-button-action" id="btn_update_backend" style="' + style + '">更新后端</button>' +
		'<button class="btn cbi-button cbi-button-action" id="btn_update_frontend" style="' + style + '">更新前端</button>' +
		'<span id="update_status" style="grid-column:1 / -1;font-size:13px;color:#666;text-align:center;"></span>' +
		'</div>';
}

function injectDesktopCss() {
	if (document.getElementById('substore_desktop_css')) return;
	var style = document.createElement('style');
	style.id = 'substore_desktop_css';
	style.textContent =
		'@keyframes substore_pulse_green { 0%,100% { box-shadow:0 0 0 0 rgba(34,197,94,0.55); } 50% { box-shadow:0 0 0 5px rgba(34,197,94,0); } }' +
		'@keyframes substore_pulse_red { 0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,0.5); } 50% { box-shadow:0 0 0 5px rgba(239,68,68,0); } }' +
		'.substore_dot_on { animation: substore_pulse_green 2s ease-in-out infinite; }' +
		'.substore_dot_off { animation: substore_pulse_red 2s ease-in-out infinite; }';
	document.head.appendChild(style);
}

function runAttempt(scriptPath, attempt) {
	return callRunCmd(scriptPath, [attempt.source, attempt.method]).then(function(res) {
		var stdout = (res && res.stdout) ? res.stdout.trim() : '';
		var stderr = (res && res.stderr) ? res.stderr.trim() : '';
		var code = res ? res.code : -1;

		if (code === 0 && stdout === 'OK') {
			return { ok: true };
		}
		if (code === 0 && stdout.indexOf('ALREADY_LATEST:') === 0) {
			return { ok: true, alreadyLatest: true, version: stdout.slice('ALREADY_LATEST:'.length).trim() };
		}
		if (code === 0 && stdout.indexOf('DOWNLOAD_FAILED:') === 0) {
			return { ok: false, message: stdout.slice('DOWNLOAD_FAILED:'.length).trim() };
		}
		return { ok: false, message: stderr || stdout || ('脚本执行失败（退出码 ' + code + '）') };
	});
}

function buildSourceChain() {
	var proxy = uci.get('substore', 'config', 'download_proxy');
	if (proxy && proxy.trim() !== '') {
		return [
			{ source: 'proxy', name: '代理加速' },
			{ source: 'official', name: '直连' }
		];
	}
	return [
		{ source: 'official', name: '直连' }
	];
}

function buildMethodChain() {
	var method = uci.get('substore', 'config', 'download_method') || 'node';
	if (method === 'wget') return [{ method: 'wget', name: 'wget-ssl' }];
	return [{ method: 'node', name: 'node-fetch' }];
}

function buildAttemptChain() {
	var sources = buildSourceChain();
	var methods = buildMethodChain();
	var chain = [];

	sources.forEach(function(s) {
		methods.forEach(function(m) {
			chain.push({
				source: s.source,
				sourceName: s.name,
				method: m.method,
				methodName: m.name
			});
		});
	});

	return chain;
}

function updateWithFallback(scriptPath, label, statusEl) {
	var chain = buildAttemptChain();

	function describe(step) {
		return step.methodName + '·' + step.sourceName;
	}

	function tryStep(i) {
		var step = chain[i];
		statusEl.style.color = '#666';
		statusEl.textContent = step.methodName + ' 正在通过' + step.sourceName + '检测并更新' + label + '...';

		return runAttempt(scriptPath, step).then(function(r) {
			if (r.ok) return r;
			throw new Error(r.message);
		}).catch(function(err) {
			var msg = err && err.message ? err.message : '未知错误';
			var next = chain[i + 1];
			if (!next) throw new Error(describe(step) + '更新失败：' + msg);

			statusEl.style.color = '#e67e22';
			statusEl.textContent = describe(step) + '更新失败（' + msg + '），正在改用' + describe(next) + '...';

			return tryStep(i + 1);
		});
	}

	return tryStep(0);
}

function buildPanelUrl(sectionId) {
	var port = uci.get('substore', sectionId || 'config', 'frontend_port') || '3001';
	var path = uci.get('substore', sectionId || 'config', 'frontend_backend_path') || '/sub-store-api';
	var host = window.location.hostname;
	if (host.indexOf(':') !== -1 && host.indexOf('[') === -1) {
		host = '[' + host + ']';
	}
	return 'http://' + host + ':' + port + '?api=http://' + host + ':' + port + path;
}

function waitForPanelReady(maxAttempts, intervalMs) {
	if (window.location.protocol === 'https:') {
		return new Promise(function(resolve) {
			setTimeout(resolve, 1500);
		});
	}

	var port = uci.get('substore', 'config', 'frontend_port') || '3001';
	var host = window.location.hostname;
	if (host.indexOf(':') !== -1 && host.indexOf('[') === -1) {
		host = '[' + host + ']';
	}
	var url = 'http://' + host + ':' + port + '/';

	function attempt(n) {
		return fetch(url, { mode: 'no-cors', cache: 'no-store' }).then(function() {
			return true;
		}).catch(function() {
			if (n <= 0) return false;
			return new Promise(function(resolve) {
				setTimeout(function() {
					resolve(attempt(n - 1));
				}, intervalMs);
			});
		});
	}

	return attempt(maxAttempts);
}

function waitForApplySettle(ms) {
	return new Promise(function(resolve) {
		setTimeout(resolve, ms || 2000);
	});
}

function verifyAfterTimeout(beforeVersion, kind) {
	var label = kind === 'backend' ? '后端' : '前端';

	return waitForApplySettle(1500).then(function() {
		return Promise.all([getServiceStatus(), loadVersionInfo()]);
	}).then(function(res) {
		var running = res[0];
		var info = res[1];
		var afterVersion = kind === 'backend' ? info.backendVersion : info.frontendVersion;

		if (!running) {
			return {
				ok: false,
				message: label + '更新失败：请求超时，且未检测到服务正常运行，请检查网络连接后重试。'
			};
		}

		if (afterVersion && beforeVersion && afterVersion !== beforeVersion) {
			return {
				ok: true,
				message: label + '已更新至 ' + afterVersion + '（请求超时，但更新已在后台完成）。'
			};
		}

		return {
			ok: null,
			message: '请求超时，未能确认本次是否更新成功。当前' + label + '版本：' +
				(afterVersion || '未知') + '，服务运行正常。如需确认请稍后重试或检查网络。'
		};
	});
}

function afterActionReload(action) {
	if (action === 'stop') {
		return waitForApplySettle(1500).then(function() {
			window.location.reload();
		});
	}
	return waitForPanelReady(10, 500).then(function() {
		window.location.reload();
	});
}

function runInitActionAndReload(action) {
	return callInitAction('substore', action).then(function() {
		return afterActionReload(action);
	});
}

var actionLock = { busy: false };

function spinNoop(btn) {
	btn.classList.add('spinning');
	setTimeout(function() {
		btn.classList.remove('spinning');
	}, 400);
}

function guardedClick(btn, action, exclusive) {
	if (!btn) return;
	btn.addEventListener('click', function() {
		if (!isServiceEnabled()) {
			spinNoop(btn);
			return;
		}

		if (exclusive) {
			if (actionLock.busy) {
				spinNoop(btn);
				return;
			}
			actionLock.busy = true;
			Promise.resolve().then(action).catch(function() {
			}).finally(function() {
				actionLock.busy = false;
			});
			return;
		}

		action();
	});
}

function bindActionButtons(node) {
	var btnOpenPanel = node.querySelector('#btn_open_panel');
	guardedClick(btnOpenPanel, function() {
		btnOpenPanel.classList.add('spinning');
		window.open(buildPanelUrl(), '_blank');
		setTimeout(function() {
			btnOpenPanel.classList.remove('spinning');
		}, 400);
	});

	var btnRestart = node.querySelector('#btn_restart');
	guardedClick(btnRestart, function() {
		btnRestart.disabled = true;
		btnRestart.classList.add('spinning');
		btnRestart.style.color = '#e67e22';
		btnRestart.textContent = '重启中...';
		return runInitActionAndReload('restart').catch(function() {
			ui.addNotification(null, E('p', '重启失败。'), 'danger');
			btnRestart.disabled = false;
			btnRestart.classList.remove('spinning');
			btnRestart.style.color = '';
			btnRestart.textContent = '重启服务';
		});
	}, true);
}

function forceStackedRow(node, innerId, align) {
	var el = node.querySelector('#' + innerId);
	if (!el) return;

	var row = el.closest('.cbi-value') || el.parentElement;
	if (row) {
		row.style.setProperty('display', 'block', 'important');
		row.style.overflow = 'visible';
	}

	var title = row ? row.querySelector('.cbi-value-title') : null;
	if (title) {
		title.style.setProperty('display', 'block', 'important');
		title.style.setProperty('width', 'auto', 'important');
		title.style.setProperty('float', 'none', 'important');
		title.style.marginBottom = '8px';
		if (align) {
			title.style.setProperty('text-align', align, 'important');
		}
	}

	var field = row ? row.querySelector('.cbi-value-field') : null;
	if (field) {
		field.style.setProperty('display', 'block', 'important');
		field.style.setProperty('width', '100%', 'important');
		field.style.setProperty('max-width', 'none', 'important');
		field.style.setProperty('margin-left', '0', 'important');
		field.style.setProperty('float', 'none', 'important');
	}
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('substore'),
			getServiceStatus(),
			loadVersionInfo()
		]);
	},

	render: function(data) {
		var isRunning = data[1];
		var versionInfo = data[2];
		var m, s, o;

		m = new form.Map('substore', _('Sub-Store'),
			_('高级订阅管理器'));

		s = m.section(form.NamedSection, 'config', 'substore', _('服务状态'));
		s.anonymous = true;

		o = s.option(form.DummyValue, '_status', '');
		o.rawhtml = true;
		o.cfgvalue = function() {
			return '<div id="substore_status_wrap">' + renderStatusPanel(isRunning, versionInfo) + '</div>';
		};

		o = s.option(form.DummyValue, '_actions', _('操作'));
		o.rawhtml = true;
		o.cfgvalue = function(section_id) {
			return '<div id="substore_actions_panel">' + renderActionsPanel(buildPanelUrl(section_id)) + '</div>';
		};
		o.write = function() {};

		o = s.option(form.Flag, 'enabled', _('启用服务'));
		o.rmempty = false;

		s = m.section(form.NamedSection, 'config', 'substore', null);
		s.anonymous = true;
		s.addremove = false;

		s.tab('basic', _('基础配置'));
		s.tab('recovery', _('数据恢复'));
		s.tab('display', _('自定义显示'));

		o = s.taboption('basic', form.Value, 'data_dir', _('数据目录'), _('Sub-Store 数据文件存放路径'));
		o.default = '/etc/sub-store';
		o.placeholder = '/etc/sub-store';

		o = s.taboption('basic', form.Value, 'frontend_backend_path', _('后端路径前缀'), _('作为 API 路径使用，避免使用特殊符号'));
		o.default = '/sub-store-api';
		o.placeholder = 'sub-store-api';

		o.cfgvalue = function(section_id) {
			var v = uci.get('substore', section_id, 'frontend_backend_path') || this.default;
			return v.replace(/^\/+/, '');
		};

		o.write = function(section_id, value) {
			value = (value || '').replace(/^\/+/, '');
			if (value === '') {
				uci.set('substore', section_id, 'frontend_backend_path', this.default);
			} else {
				uci.set('substore', section_id, 'frontend_backend_path', '/' + value);
			}
		};

		o = s.taboption('display', form.Value, 'backend_custom_name', _('自定义实例名称'), _('显示在前端界面上的后端名称'));
		o.placeholder = 'OpenWrt';

		o = s.taboption('display', form.Value, 'backend_custom_icon', _('自定义图标URL'), _('显示在前端界面上的后端图标'));
		o.placeholder = 'https://example.com/icon.png';

		o = s.taboption('recovery', form.Value, 'data_url', _('远程数据URL'), _('启动时从此地址拉取并恢复数据，支持 Gist Raw 链接'));
		o.placeholder = 'https://gist.githubusercontent.com/user/id/raw/Sub-Store#noCache';

		o = s.taboption('recovery', form.Value, 'data_url_post', _('拉取后执行'), _('拉取数据后执行的 JS 表达式，例如设置 Gist Token'));
		o.placeholder = "content.settings.gistToken='your_token_here'";

		return m.render().then(function(node) {

			actionLock.busy = false;
			injectDesktopCss();

			forceStackedRow(node, 'substore_status_wrap');
			forceStackedRow(node, 'substore_actions_panel', 'left');

			bindActionButtons(node);

			var btnUpdateBackend = node.querySelector('#btn_update_backend');
			var updateStatus = node.querySelector('#update_status');

			function refreshStatusPanel() {
				return new Promise(function(resolve) {
					setTimeout(resolve, 500);
				}).then(function() {
					return Promise.all([getServiceStatus(), loadVersionInfo()]);
				}).then(function(res) {
					var running = res[0];
					var info = res[1];
					if (!info) return;
					var el = node.querySelector('#substore_status_wrap');
					if (el) el.innerHTML = renderStatusPanel(running, info);
				});
			}

			guardedClick(btnUpdateBackend, function() {
				btnUpdateBackend.disabled = true;
				btnUpdateBackend.classList.add('spinning');

				return loadVersionInfo().then(function(baseline) {
					var beforeVersion = baseline.backendVersion;

					return updateWithFallback('/usr/libexec/substore/update-backend.sh', '后端', updateStatus).then(function(r) {
						updateStatus.style.color = '#2ecc71';
						updateStatus.textContent = (r && r.alreadyLatest) ?
							('当前已是最新版本' + r.version + '，无需更新') :
							'后端已更新并重启成功。';
						return refreshStatusPanel();
					}).catch(function(err) {
						var msg = err && err.message ? err.message : '未知错误';

						if (msg.indexOf('XHR request timed out') !== -1) {
							updateStatus.style.color = '#666';
							updateStatus.textContent = '请求超时，正在校验实际更新结果...';
							return verifyAfterTimeout(beforeVersion, 'backend').then(function(v) {
								updateStatus.style.color = v.ok === true ? '#2ecc71' : (v.ok === false ? '#e74c3c' : '#e67e22');
								updateStatus.textContent = v.message;
								return refreshStatusPanel();
							});
						}

						updateStatus.style.color = '#e74c3c';
						updateStatus.textContent = '后端更新失败：' + msg;
					});
				}).finally(function() {
					btnUpdateBackend.disabled = false;
					btnUpdateBackend.classList.remove('spinning');
				});
			}, true);

			var btnUpdateFrontend = node.querySelector('#btn_update_frontend');
			guardedClick(btnUpdateFrontend, function() {
				btnUpdateFrontend.disabled = true;
				btnUpdateFrontend.classList.add('spinning');

				return loadVersionInfo().then(function(baseline) {
					var beforeVersion = baseline.frontendVersion;

					return updateWithFallback('/usr/libexec/substore/update-frontend.sh', '前端', updateStatus).then(function(r) {
						updateStatus.style.color = '#2ecc71';
						updateStatus.textContent = (r && r.alreadyLatest) ?
							('当前已是最新版本' + r.version + '，无需更新') :
							'前端已更新。';
						return refreshStatusPanel();
					}).catch(function(err) {
						var msg = err && err.message ? err.message : '未知错误';

						if (msg.indexOf('XHR request timed out') !== -1) {
							updateStatus.style.color = '#666';
							updateStatus.textContent = '请求超时，正在校验实际更新结果...';
							return verifyAfterTimeout(beforeVersion, 'frontend').then(function(v) {
								updateStatus.style.color = v.ok === true ? '#2ecc71' : (v.ok === false ? '#e74c3c' : '#e67e22');
								updateStatus.textContent = v.message;
								return refreshStatusPanel();
							});
						}

						updateStatus.style.color = '#e74c3c';
						updateStatus.textContent = '前端更新失败：' + msg;
					});
				}).finally(function() {
					btnUpdateFrontend.disabled = false;
					btnUpdateFrontend.classList.remove('spinning');
				});
			}, true);

			return node;
		});
	},
});
