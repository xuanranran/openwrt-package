'use strict';
'require baseclass';
'require ui';

return baseclass.extend({
	__init__() {
		ui.menu.load().then((tree) => this.render(tree));
	},

	render(tree) {
		let node = tree;
		let url = '';

		this.renderModeMenu(tree);

		if (L.env.dispatchpath.length >= 3) {
			for (var i = 0; i < 3 && node; i++) {
				node = node.children[L.env.dispatchpath[i]];
				url = url + (url ? '/' : '') + L.env.dispatchpath[i];
			}

			if (node)
				this.renderTabMenu(node, url);
		}
	},

	renderTabMenu(tree, url, level) {
		const container = document.querySelector('#tabmenu');
		const ul = E('ul', { 'class': 'tabs' });
		const children = ui.menu.getChildren(tree);
		let activeNode = null;

		children.forEach(child => {
			const isActive = (L.env.dispatchpath[3 + (level || 0)] == child.name);
			const activeClass = isActive ? ' active' : '';
			const className = 'tabmenu-item-%s %s'.format(child.name, activeClass);

			ul.appendChild(E('li', { 'class': className }, [
				E('a', { 'href': L.url(url, child.name) }, [ _(child.title) ] )]));

			if (isActive)
				activeNode = child;
		});

		if (ul.children.length == 0)
			return E([]);

		container.appendChild(ul);
		container.style.display = '';

		if (activeNode)
			this.renderTabMenu(activeNode, url + '/' + activeNode.name, (level || 0) + 1);

		return ul;
	},

	renderSideMenu(tree, url) {
		const container = document.querySelector('#sidemenu');
		if (!container) return;

		container.innerHTML = '';
		const children = ui.menu.getChildren(tree);

		if (children.length == 0) {
			container.style.display = 'none';
			document.querySelector('.sidebar').style.display = 'none';
			return;
		}

		const ul = E('ul', { 'class': 'side-nav' });

		children.forEach(child => {
			const itemPath = (url + '/' + child.name).replace(/^\/+/, '');
			const currentPath = L.env.requestpath.join('/');
			const isActive = currentPath == itemPath || currentPath.indexOf(itemPath + '/') == 0;
			const children2 = ui.menu.getChildren(child);
			const hasChildren = children2.length > 0;
			const linkUrl = hasChildren ? L.url(url, child.name) : L.url(url, child.name);

			const li = E('li', { 'class': isActive ? 'active' : '' }, [
				E('a', { 'href': linkUrl }, [ _(child.title) ])
			]);

			if (hasChildren && isActive) {
				const subUl = E('ul', { 'class': 'side-sub' });
				children2.forEach(child2 => {
					const subPath = (url + '/' + child.name + '/' + child2.name).replace(/^\/+/, '');
					const isSubActive = currentPath == subPath;
					subUl.appendChild(E('li', { 'class': isSubActive ? 'active' : '' }, [
						E('a', { 'href': L.url(url, child.name, child2.name) }, [ _(child2.title) ])
					]));
				});
				li.appendChild(subUl);
			}

			ul.appendChild(li);
		});

		container.appendChild(ul);
		container.style.display = '';
		document.querySelector('.sidebar').style.display = '';
	},

	renderMainMenu(tree, url, level) {
		const ul = level ? E('ul', { 'class': 'dropdown-menu' }) : document.querySelector('#topmenu');
		const children = ui.menu.getChildren(tree);

		if (children.length == 0 || level > 1)
			return E([]);

		children.forEach(child => {
			const submenu = this.renderMainMenu(child, url + '/' + child.name, (level || 0) + 1);
			const subclass = (!level && submenu.firstElementChild) ? 'dropdown' : '';
			const linkclass = (!level && submenu.firstElementChild) ? 'menu' : '';
			const linkurl = submenu.firstElementChild ? '#' : L.url(url, child.name);

			const li = E('li', { 'class': subclass }, [
				E('a', { 'class': linkclass, 'href': linkurl }, [
					_(child.title),
				]),
				submenu
			]);

			ul.appendChild(li);
		});

		ul.style.display = '';

		return ul;
	},

	renderModeMenu(tree) {
		const ul = document.querySelector('#topmenu');
		const children = ui.menu.getChildren(tree);

		children.forEach((child, index) => {
			const isActive = L.env.requestpath.length
				? child.name === L.env.requestpath[0]
				: index === 0;

			const li = E('li', { 'class': isActive ? 'active' : '' }, [
				E('a', { 'href': L.url(child.name) }, [ _(child.title) ])
			]);

			li.addEventListener('click', (ev) => {
				if (!isActive)
					return;

				ev.preventDefault();
				this.renderSideMenu(child, child.name);
			});

			ul.appendChild(li);

			if (isActive)
				this.renderSideMenu(child, child.name);
		});

		if (ul.children.length > 0)
			ul.style.display = '';
	}
});
