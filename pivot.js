var P = (() => {
	const viewRegistrations = {};

	const diffVNodes = (old, neo) => {
		const renew = (old, neo) => {
			const dom = neo.render().dom;
			old.dom.insertAdjacentElement('afterend', dom);
			old.dom.remove();
		}

		if (old.tag !== neo.tag) {
			renew(old, neo);
		} if ((Array.isArray(old.children) && old.children.some(e => !(e instanceof VNode))) || (Array.isArray(neo.children) && neo.children.some(e => !(e instanceof VNode)))) {
			renew(old, neo);
		} else {
			let ref, combiled = { ...old.props, ...neo.props };
			({ ref, ...combiled } = combiled);
			if (combiled) {
				const addedProps = [];
				const removedProps = [];
				const changedProps = [];

				Object.entries(combiled).forEach(([k, v]) => {
					if (typeof old.props[k] === 'undefined' && typeof neo.props[k] !== 'undefined') {
						addedProps.push([k, v]);
					} else if (typeof old.props[k] !== 'undefined' && typeof neo.props[k] === 'undefined') {
						removedProps.push(k);
					} else if (old.props[k] !== neo.props[k]) {
						changedProps.push([k, v]);
					}
				});

				addedProps.forEach(([k, v]) => {
					if (!k.startsWith('@')) {
						old.dom.setAttribute(k, v);
					} else {
						old.dom.addEventListener(k.replace(/^@/, ''), v);
					}
				});
				changedProps.forEach(([k, v]) => {
					if (!k.startsWith('@')) {
						old.dom.setAttribute(k, v);
					} else {
						old.dom.removeEventListener(k.replace(/^@/, ''), old.props[k]);
						old.dom.addEventListener(k.replace(/^@/, ''), v);
					}
				});

				removedProps.forEach(k => {
					if (!k.startsWith('@')) {
						old.dom.removeAttribute(k);
					} else {
						old.dom.removeEventListener(k.replace(/^@/, ''), old.props[k]);
					}
				});
			}

			if (old.children !== neo.children) {
				if (!Array.isArray(neo.children)) {
					old.dom.textContent = neo.children;
				} else {
					if (!Array.isArray(old.children) || old.children.length !== neo.children.length) {
						old.dom.textContent = '';
						neo.children.forEach(vnode => {
							old.dom.append(vnode.render().dom);
						});
					} else {
						old.children.forEach((c, i) => {
							diffVNodes(c, neo.children[i]);
						})
					}
				}
			}

			neo.dom = old.dom;
		}
	}

	class View {
		constructor(name, gen) {
			this.name = name;
			this.gen = gen;
		}

		generateNode(props) {
			let node = new Node(this.name, this.gen, props)
			return node;
		}
	}

	class Node {
		constructor(name, gen, props = {}) {
			let _shouldUpdate = false;
			this.name = name;
			this.refs = {};
			this.props = props;
			window.props = props;
			const view = gen.call(this);
			this.view = view;
			const { render, loaded, ...rest } = view;
			Object.entries(rest).forEach(([key, value]) => {
				let val = value;
				Object.defineProperty(this, key, {
					enumerable: false,
					configurable: false,
					set(value) {
						if (Object.is(val, value) || val === value || (() => {
							try {
								return JSON.stringify(val) === JSON.stringify(value);
							} catch (ex) {
								return false;
							}
						})) {
							return;
						}
						val = value;
						if (!_shouldUpdate) {
							setTimeout(() => {
								this.render();
								_shouldUpdate = false;
							}, 0);
							_shouldUpdate = true;
						}
					},
					get() {
						return val;
					}
				})
			});
		}

		render() {
			let oldVNode = this.vnode;
			this.vnode = this.view.render.call(this);
			this.vnode.node = this;
			if (oldVNode) {
				diffVNodes(oldVNode, this.vnode)
			} else {
				if (this.view.loaded) {
					this.view.loaded.call(this);
				}
			}

			return this.vnode;
		}
	}

	class VNode {
		constructor({ tag, props = {}, children = [] }) {
			this.tag = tag;
			this.props = props;
			this.children = children;
		}

		render(parentVNode) {
			const dom = document.createElement(this.tag);
			if (this.node) {
				dom.setAttribute('data-pivot', this.node.name || '');
			}
			dom.vnode = this;
			this.dom = dom;

			if (parentVNode) {
				this.parent = parentVNode;
			}

			if (this.props) {
				Object.entries(this.props).forEach(([key, value]) => {
					if (key === 'ref') {
						let current = this;
						while (current && !current.node) {
							current = current.parent;
						}
						if (current) {
							current.node.refs[value] = dom;
						}
					} else if (key.startsWith('@')) {
						dom.addEventListener(key.replace(/^@/, ''), value);
					} else {
						dom.setAttribute(key, value);
					}
				});
			}
			if (typeof this.children !== 'undefined') {
				if (Array.isArray(this.children)) {
					this.children.forEach(child => {
						if (child instanceof VNode) {
							child.render(this);
						} else if (child instanceof HTMLElement) {
							if (child.getAttribute('ref')) {
								let current = this;
								while (current && !current.node) {
									current = current.parent;
								}
								if (current) {
									current.node.refs[child.getAttribute('ref')] = child;
								}
							}
							dom.append(child);
						}
					})
				} else {
					dom.innerText = this.children;
				}
			}

			if (parentVNode) {
				parentVNode.dom.append(dom);
			}
			return this;
		}
	}

	const renderElement = (tag, ...args) => {
		let props, children;
		args.forEach(arg => {
			if (typeof arg === 'string' || typeof arg === 'function' || Array.isArray(arg)) {
				children = arg;
			} else if (typeof arg === 'object') {
				props = arg;
			}
		})
		return new VNode({ tag, props, children });
	}

	const Pivot = (...args) => {
		const view = viewRegistrations[args[0]];
		if (view) {
			const node = view.generateNode(args[1]);
			const vnode = node.render().render();
			return vnode;
		} else {
			return renderElement(...args);
		}
	}

	Pivot.View = (name, gen) => {
		if (name && viewRegistrations[name]) {
			throw new Error(`View name ${name} has already been registered!`);
		}

		const view = new View(name, gen);

		if (name) {
			viewRegistrations[name] = view;
		}
	}

	return Pivot;
})();

if (typeof module !== 'undefined') {
	module.exports = P;
}