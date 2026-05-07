'use strict';
'require baseclass';
'require ui';

/**
 * Native JavaScript slide animation utilities
 * Replaces jQuery slideUp/slideDown functionality with better performance
 */
const SlideAnimations = {
	/**
	 * Animation durations in milliseconds
	 */
	durations: {
		fast: 200,
		normal: 400,
		slow: 600
	},

	/**
	 * Map to track running animations and their cleanup functions
	 */
	runningAnimations: new WeakMap(),

	/**
	 * Slide element down (show) with animation
	 * @param {Element} element - DOM element to animate
	 * @param {string|number} duration - Animation duration ('fast', 'normal', 'slow' or milliseconds)
	 * @param {function} callback - Optional callback function when animation completes
	 */
	slideDown: function(element, duration, callback) {
		if (!element) {
			console.warn('SlideAnimations.slideDown: No element provided');
			return;
		}
		
		// Stop any existing animation on this element
		this.stop(element);
		
		// Convert duration string to milliseconds
		const animDuration = typeof duration === 'string' ? 
			this.durations[duration] || this.durations.normal : 
			(duration || this.durations.normal);
		
		// Store original styles
		const originalStyles = {
			display: element.style.display,
			overflow: element.style.overflow,
			height: element.style.height,
			transition: element.style.transition
		};
		
		// Set initial state for animation
		element.style.display = 'block';
		element.style.overflow = 'hidden';
		element.style.height = '0px';
		element.style.transition = `height ${animDuration}ms ease-out`;
		
		// Force reflow to ensure initial state is applied
		element.offsetHeight;
		
		// Get the target height
		const targetHeight = element.scrollHeight;
		
		// Animate to full height
		element.style.height = targetHeight + 'px';
		
		// Set up cleanup function
		const cleanup = () => {
			element.style.height = originalStyles.height || '';
			element.style.overflow = originalStyles.overflow || '';
			element.style.transition = originalStyles.transition || '';
			
			// Remove from running animations map
			this.runningAnimations.delete(element);
			
			if (callback && typeof callback === 'function') {
				try {
					callback.call(element);
				} catch (e) {
					console.error('SlideAnimations callback error:', e);
				}
			}
		};
		
		// Store cleanup function for potential cancellation
		const timeoutId = setTimeout(cleanup, animDuration);
		this.runningAnimations.set(element, { timeoutId, cleanup });
	},

	/**
	 * Slide element up (hide) with animation
	 * @param {Element} element - DOM element to animate
	 * @param {string|number} duration - Animation duration ('fast', 'normal', 'slow' or milliseconds)
	 * @param {function} callback - Optional callback function when animation completes
	 */
	slideUp: function(element, duration, callback) {
		if (!element) {
			console.warn('SlideAnimations.slideUp: No element provided');
			return;
		}
		
		// Stop any existing animation on this element
		this.stop(element);
		
		// Convert duration string to milliseconds
		const animDuration = typeof duration === 'string' ? 
			this.durations[duration] || this.durations.normal : 
			(duration || this.durations.normal);
		
		// Store original styles
		const originalStyles = {
			display: element.style.display,
			overflow: element.style.overflow,
			height: element.style.height,
			transition: element.style.transition
		};
		
		// Get current height before hiding
		const currentHeight = element.scrollHeight;
		
		// Set initial state for animation
		element.style.overflow = 'hidden';
		element.style.height = currentHeight + 'px';
		element.style.transition = `height ${animDuration}ms ease-out`;
		
		// Force reflow to ensure initial state is applied
		element.offsetHeight;
		
		// Animate to zero height
		element.style.height = '0px';
		
		// Set up cleanup function
		const cleanup = () => {
			element.style.display = 'none';
			element.style.height = originalStyles.height || '';
			element.style.overflow = originalStyles.overflow || '';
			element.style.transition = originalStyles.transition || '';
			
			// Remove from running animations map
			this.runningAnimations.delete(element);
			
			if (callback && typeof callback === 'function') {
				try {
					callback.call(element);
				} catch (e) {
					console.error('SlideAnimations callback error:', e);
				}
			}
		};
		
		// Store cleanup function for potential cancellation
		const timeoutId = setTimeout(cleanup, animDuration);
		this.runningAnimations.set(element, { timeoutId, cleanup });
	},

	/**
	 * Stop all running animations on an element
	 * @param {Element} element - DOM element to stop animations on
	 */
	stop: function(element) {
		if (!element) return;
		
		const animationData = this.runningAnimations.get(element);
		if (animationData) {
			// Clear the timeout
			clearTimeout(animationData.timeoutId);
			
			// Run cleanup immediately
			animationData.cleanup();
		}
		
		// Clear transition to immediately stop any CSS animation
		element.style.transition = '';
		
		// Force reflow to apply changes immediately
		element.offsetHeight;
	},

	/**
	 * Check if element has running animation
	 * @param {Element} element - DOM element to check
	 * @returns {boolean} - True if element has running animation
	 */
	isAnimating: function(element) {
		return this.runningAnimations.has(element);
	}
};

/**
 * Argon Theme Menu Module
 * Handles rendering and interaction of the main navigation menu and sidebar
 */
return baseclass.extend({
	/**
	 * Initialize the menu module
	 * Load menu data and trigger rendering
	 */
	__init__: function () {
		ui.menu.load().then(L.bind(this.render, this));
	},

	/**
	 * Main render function for the menu system
	 * @param {Object} tree - Menu tree structure from LuCI
	 */
	render: function (tree) {
		var node = tree;
		var url = '';

		this.renderModeMenu(node);

		// Render tab menu if we're deep enough in the navigation hierarchy
		if (L.env.dispatchpath.length >= 3) {
			for (var i = 0; i < 3 && node; i++) {
				node = node.children[L.env.dispatchpath[i]];
				url = url + (url ? '/' : '') + L.env.dispatchpath[i];
			}

			if (node) {
				this.renderTabMenu(node, url);
			}
		}

		// Attach event listeners for sidebar toggle functionality
		var sidebarToggle = document.querySelector('a.showSide');
		var darkMask = document.querySelector('.darkMask');
		
		if (sidebarToggle) {
			sidebarToggle.addEventListener('click', ui.createHandlerFn(this, 'handleSidebarToggle'));
		}
		if (darkMask) {
			darkMask.addEventListener('click', ui.createHandlerFn(this, 'handleSidebarToggle'));
		}

		// Initialize circular progress bars
		this.initCircularProgressBars();
	},

	/**
	 * Updates a single progress bar's appearance based on its data.
	 */
	updateProgressBarAppearance: function(bar) {
		const innerDiv = bar.querySelector('div');
		if (!innerDiv) return;

		const progressPercentage = innerDiv.style.width;
		const title = bar.getAttribute('title') || '';
		const percentageMatch = title.match(/\((\d+\.?\d*|\d+)%\)/);
		
		let percentageText = progressPercentage;
		if (percentageMatch && percentageMatch[0]) {
			percentageText = percentageMatch[0].replace(/[()]/g, '');
		}

		// Update the data element text
		const item = bar.closest('.cbi-progressbar-item');
		if (item) {
			const dataEl = item.querySelector('.cbi-progressbar-data');
			if (dataEl) {
				let titleText = title.replace(/\s*\([^)]*\)$/, '');
				if (dataEl.textContent !== titleText) {
					dataEl.textContent = titleText;
				}
			}
		}

		if (bar.style.getPropertyValue('--progress') !== progressPercentage) {
			bar.style.setProperty('--progress', progressPercentage);
		}
		
		if (innerDiv.textContent !== percentageText) {
			innerDiv.textContent = percentageText;
		}
	},

	/**
	 * Sets up observers for a specific progress bar to handle dynamic updates.
	 */
	setupProgressBar: function(bar) {
		if (bar.dataset.progressObserverAttached) return;

		const observer = new MutationObserver(L.bind(this.updateProgressBarAppearance, this, bar));

		const innerDiv = bar.querySelector('div');
		if (innerDiv) {
			observer.observe(bar, { attributes: true, attributeFilter: ['title'] });
			observer.observe(innerDiv, { attributes: true, attributeFilter: ['style'] });
			bar.dataset.progressObserverAttached = 'true';
		}
		
		// Initial update
		this.updateProgressBarAppearance(bar);
	},

	/**
	 * Initializes circular progress bars and sets up a MutationObserver to detect new ones.
	 */
	initCircularProgressBars: function() {
		if (document.body.dataset.page !== 'admin-status-overview') {
			return;
		}
		const setup = L.bind(this.setupProgressBar, this);
		const transform = L.bind(this.transformProgressbarTable, this);

		// Initial run for existing elements
		document.querySelectorAll('table.table').forEach(transform);
		document.querySelectorAll('.cbi-progressbar').forEach(setup);

		const observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				mutation.addedNodes.forEach(function(node) {
					if (node.nodeType !== Node.ELEMENT_NODE) return;

					// If a table is added, try to transform it
					if (node.tagName === 'TABLE' && node.classList.contains('table')) {
						transform(node);
					} else if (node.querySelectorAll) {
						node.querySelectorAll('table.table').forEach(transform);
					}

					// If a progressbar is added, set it up
					if (node.classList.contains('cbi-progressbar')) {
						setup(node);
					} else if (node.querySelectorAll) {
						node.querySelectorAll('.cbi-progressbar').forEach(setup);
					}
				});
			});
		});
		observer.observe(document.body, { childList: true, subtree: true });
	},

	transformProgressbarTable: function(table) {
		// Check if the first row looks like a progress bar row
		const firstRow = table.querySelector('tr');
		if (!firstRow || !firstRow.querySelector('.cbi-progressbar')) {
			return; // Not a progress bar table
		}

		// Check if we haven't transformed this table already
		if (table.dataset.transformed === 'true') {
			return;
		}

		const parent = table.parentNode;
		const container = document.createElement('div');
		container.className = 'cbi-progressbar-grid';

		const rows = table.querySelectorAll('tr');
		rows.forEach(row => {
			const labelTd = row.cells[0];
			const progressTd = row.cells[1];

			if (labelTd && progressTd && progressTd.querySelector('.cbi-progressbar')) {
				const item = document.createElement('div');
				item.className = 'cbi-progressbar-item';

				const label = document.createElement('div');
				label.className = 'cbi-progressbar-label';
				label.textContent = labelTd.textContent.trim();

				const progressbar = progressTd.querySelector('.cbi-progressbar');

				const data = document.createElement('div');
				data.className = 'cbi-progressbar-data';
				let titleText = progressbar.getAttribute('title') || '';
				data.textContent = titleText.replace(/\s*\([^)]*\)$/, '');

				item.appendChild(progressbar); // Move the progressbar
				item.appendChild(label);
				item.appendChild(data);
				container.appendChild(item);
			}
		});

		if (container.children.length > 0) {
			parent.insertBefore(container, table);
			table.style.display = 'none'; // Hide the original table
			table.dataset.transformed = 'true';
		}
	},

	/**
	 * Handle menu expand/collapse functionality
	 * Manages the sliding animation and active states of menu items
	 * @param {Event} ev - Click event from menu item
	 */
	handleMenuExpand: function (ev) {
		var target = ev.target;
		var slide = target.parentNode;
		var slideMenu = target.nextElementSibling;
		var shouldCollapse = false;

		// Close all currently active submenus
		var activeMenus = document.querySelectorAll('.main .main-left .nav > li > ul.active');
		activeMenus.forEach(function (ul) {
			// Stop any running animations and slide up
			SlideAnimations.stop(ul);
			// Remove active classes immediately when starting slideUp animation
			ul.classList.remove('active');
			ul.previousElementSibling.classList.remove('active');
			SlideAnimations.slideUp(ul, 'fast');
			
			// Check if we're clicking on an already open menu (should collapse it)
			if (!shouldCollapse && ul === slideMenu) {
				shouldCollapse = true;
			}
		});

		// Exit if there's no submenu to show
		if (!slideMenu) {
			return;
		}

		// Open the submenu if it's not already open
		if (!shouldCollapse) {
			// Find the slide menu within the slide element
			var slideMenuElement = slide.querySelector(".slide-menu");
			if (slideMenuElement) {
				// Add active classes immediately when starting slideDown animation
				slideMenu.classList.add('active');
				target.classList.add('active');
				SlideAnimations.slideDown(slideMenuElement, 'fast');
			}
			target.blur(); // Remove focus from the clicked element
		}
		
		// Prevent default link behavior and event bubbling
		ev.preventDefault();
		ev.stopPropagation();
	},

	/**
	 * Render the main navigation menu
	 * Creates hierarchical menu structure with active states and click handlers
	 * @param {Object} tree - Menu tree node to render
	 * @param {string} url - Base URL for menu items
	 * @param {number} level - Current nesting level (0-based)
	 * @returns {Element} - Generated menu element
	 */
	renderMainMenu: function (tree, url, level) {
		var currentLevel = (level || 0) + 1;
		var menuContainer = E('ul', { 'class': level ? 'slide-menu' : 'nav' });
		var children = ui.menu.getChildren(tree);

		// Don't render empty menus or menus deeper than 2 levels
		if (children.length === 0 || currentLevel > 2) {
			return E([]);
		}

		// Generate menu items for each child
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			var isActive = (
				(L.env.dispatchpath[currentLevel] === child.name) && 
				(L.env.dispatchpath[currentLevel - 1] === tree.name)
			);
			
			// Recursively render submenu
			var submenu = this.renderMainMenu(child, url + '/' + child.name, currentLevel);
			var hasChildren = submenu.children.length > 0;
			
			// Determine CSS classes based on state
			var slideClass = hasChildren ? 'slide' : null;
			var menuClass = hasChildren ? 'menu' : 'food';
			
			if (isActive) {
				menuContainer.classList.add('active');
				slideClass += " active";
				menuClass += " active";
			}

			// Create menu item with link and submenu
			var menuItem = E('li', { 'class': slideClass }, [
				E('a', {
					'href': L.url(url, child.name),
					'click': (currentLevel === 1) ? ui.createHandlerFn(this, 'handleMenuExpand') : null,
					'class': menuClass,
					'data-title': child.title.replace(/ /g, "_"), // More robust space replacement
				}, [_(child.title)]),
				submenu
			]);
			
			menuContainer.appendChild(menuItem);
		}

		// Append to main menu container if this is the top level
		if (currentLevel === 1) {
			var mainMenuElement = document.querySelector('#mainmenu');
			if (mainMenuElement) {
				mainMenuElement.appendChild(menuContainer);
				mainMenuElement.style.display = '';
			}
		}
		
		return menuContainer;
	},

	renderModeMenu: function (tree) {
		var menu = document.querySelector('#modemenu');
		var children = ui.menu.getChildren(tree);

		for (var i = 0; i < children.length; i++) {
			var isActive = (L.env.requestpath.length ? children[i].name == L.env.requestpath[0] : i == 0);
			if (i > 0)
				menu.appendChild(E([], ['\u00a0|\u00a0']));
			menu.appendChild(E('li', {}, [
				E('a', {
					'href': L.url(children[i].name),
					'class': isActive ? 'active' : null
				}, [_(children[i].title)])
			]));
			if (isActive)
				this.renderMainMenu(children[i], children[i].name);
		}
		if (menu.children.length > 1)
			menu.style.display = '';
	},

	/**
	 * Render tab navigation menu
	 * Creates horizontal tab menu for deeper navigation levels
	 * @param {Object} tree - Menu tree node to render
	 * @param {string} url - Base URL for tab items
	 * @param {number} level - Current nesting level (0-based)
	 * @returns {Element} - Generated tab menu element
	 */
	renderTabMenu: function (tree, url, level) {
		var container = document.querySelector('#tabmenu');
		var currentLevel = (level || 0) + 1;
		var tabContainer = E('ul', { 'class': 'tabs' });
		var children = ui.menu.getChildren(tree);
		var activeNode = null;

		// Don't render empty tab menus
		if (children.length === 0) {
			return E([]);
		}

		// Generate tab items for each child
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			var isActive = (L.env.dispatchpath[currentLevel + 2] === child.name);
			var activeClass = isActive ? ' active' : '';
			var className = 'tabmenu-item-%s %s'.format(child.name, activeClass);

			var tabItem = E('li', { 'class': className }, [
				E('a', { 'href': L.url(url, child.name) }, [_(child.title)])
			]);
			
			tabContainer.appendChild(tabItem);

			// Store reference to active node for recursive rendering
			if (isActive) {
				activeNode = child;
			}
		}

		// Append tab container to main tab menu element
		if (container) {
			container.appendChild(tabContainer);
			container.style.display = '';

			// Recursively render nested tab menus if there's an active node
			if (activeNode) {
				var nestedTabs = this.renderTabMenu(activeNode, url + '/' + activeNode.name, currentLevel);
				if (nestedTabs.children.length > 0) {
					container.appendChild(nestedTabs);
				}
			}
		}

		return tabContainer;
	},

	/**
	 * Handle sidebar toggle functionality
	 * Toggles the mobile/responsive sidebar menu visibility
	 * @param {Event} ev - Click event from sidebar toggle button or dark mask
	 */
	handleSidebarToggle: function (ev) {
		var showSideButton = document.querySelector('a.showSide');
		var sidebar = document.querySelector('#mainmenu');
		var darkMask = document.querySelector('.darkMask');
		var scrollbarArea = document.querySelector('.main-right');

		// Check if any required elements are missing
		if (!showSideButton || !sidebar || !darkMask || !scrollbarArea) {
			console.warn('Sidebar toggle elements not found');
			return;
		}

		// Toggle sidebar visibility and related states
		if (showSideButton.classList.contains('active')) {
			// Close sidebar
			showSideButton.classList.remove('active');
			sidebar.classList.remove('active');
			scrollbarArea.classList.remove('active');
			darkMask.classList.remove('active');
		} else {
			// Open sidebar
			showSideButton.classList.add('active');
			sidebar.classList.add('active');
			scrollbarArea.classList.add('active');
			darkMask.classList.add('active');
		}
	}
});
