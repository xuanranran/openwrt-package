'use strict';
'require view';
'require form';
'require uci';

return view.extend({
	load: function() {
		return uci.load('substore');
	},

	render: function() {
		var m, s, o;

		m = new form.Map('substore', _('Sub-Store'), null);

		s = m.section(form.NamedSection, 'config', 'substore', _('高级设置'));
		s.anonymous = true;

		o = s.option(form.Value, 'x_powered_by', _('X-Powered-By 响应头'), _('自定义 HTTP 响应头中的 X-Powered-By 字段'));
		o.placeholder = 'Express';

		o = s.option(form.Value, 'cors_allowed_origins', _('CORS 允许来源'), _('允许访问后端 API 的浏览器来源，多个用逗号分隔，* 表示允许所有'));
		o.default = '*';
		o.placeholder = '*';

		o = s.option(form.Value, 'max_header_size', _('最大 Header 大小（字节）'), _('遇到 Headers Overflow Error 时可适当调大'));
		o.default = '32768';
		o.datatype = 'uinteger';

		o = s.option(form.Value, 'body_json_limit', _('JSON Body 大小限制'), _('例如 1mb、10mb'));
		o.default = '1mb';
		o.placeholder = '1mb';

		s = m.section(form.NamedSection, 'config', 'substore', _('推送通知'));
		s.anonymous = true;

		o = s.option(form.Value, 'push_service', _('推送服务URL'), _('支持 Bark、Telegram、PushPlus 等，用 [推送标题] 和 [推送内容] 作为占位符'));
		o.placeholder = 'https://api.day.app/YOUR_KEY/[推送标题]/[推送内容]';

		return m.render();
	}
});
