var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const fromRecord = (record) => Object.entries(record)
    	.filter(([key, value]) => value !== undefined)
    	.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    	.join("&");

    /* web/star.svelte generated by Svelte v3.23.0 */

    const file = "web/star.svelte";

    function create_fragment(ctx) {
    	let svg;
    	let defs;
    	let linearGradient;
    	let stop0;
    	let stop1;
    	let stop2;
    	let stop3;
    	let polygon;
    	let polygon_fill_value;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			defs = svg_element("defs");
    			linearGradient = svg_element("linearGradient");
    			stop0 = svg_element("stop");
    			stop1 = svg_element("stop");
    			stop2 = svg_element("stop");
    			stop3 = svg_element("stop");
    			polygon = svg_element("polygon");
    			attr_dev(stop0, "stop-color", "#FCCD12");
    			attr_dev(stop0, "stop-opacity", "1");
    			attr_dev(stop0, "offset", "0");
    			add_location(stop0, file, 11, 3, 316);
    			attr_dev(stop1, "stop-color", "#FCCD12");
    			attr_dev(stop1, "stop-opacity", "1");
    			attr_dev(stop1, "offset", /*rounded*/ ctx[1]);
    			add_location(stop1, file, 12, 3, 376);
    			attr_dev(stop2, "stop-color", "#FCCD12");
    			attr_dev(stop2, "stop-opacity", "0");
    			attr_dev(stop2, "offset", /*rounded*/ ctx[1]);
    			add_location(stop2, file, 13, 3, 442);
    			attr_dev(stop3, "stop-color", "#FCCD12");
    			attr_dev(stop3, "stop-opacity", "0");
    			attr_dev(stop3, "offset", "1");
    			add_location(stop3, file, 14, 3, 508);
    			attr_dev(linearGradient, "id", /*id*/ ctx[2]);
    			attr_dev(linearGradient, "x1", "0%");
    			attr_dev(linearGradient, "y1", "0");
    			attr_dev(linearGradient, "y2", "0");
    			attr_dev(linearGradient, "x2", "100%");
    			attr_dev(linearGradient, "gradientUnits", "objectBoundingBox");
    			add_location(linearGradient, file, 10, 2, 224);
    			add_location(defs, file, 9, 1, 215);
    			attr_dev(polygon, "data-highlighted", /*highlighted*/ ctx[0]);
    			attr_dev(polygon, "fill", polygon_fill_value = `url(#${/*id*/ ctx[2]})`);
    			attr_dev(polygon, "points", "2.9511,2.3090 3.1756,3.6180 2.0000,3.0000 0.8244,3.6180 1.0489,2.3090 0.0979,1.3820 1.4122,1.1910 2.0000,0.0000 2.5878,1.1910 3.9021,1.3820");
    			attr_dev(polygon, "class", "svelte-oo7uau");
    			add_location(polygon, file, 17, 1, 595);
    			attr_dev(svg, "viewBox", "0 0 4 4");
    			attr_dev(svg, "width", "100%");
    			attr_dev(svg, "height", "100%");
    			add_location(svg, file, 8, 0, 163);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, defs);
    			append_dev(defs, linearGradient);
    			append_dev(linearGradient, stop0);
    			append_dev(linearGradient, stop1);
    			append_dev(linearGradient, stop2);
    			append_dev(linearGradient, stop3);
    			append_dev(svg, polygon);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*rounded*/ 2) {
    				attr_dev(stop1, "offset", /*rounded*/ ctx[1]);
    			}

    			if (dirty & /*rounded*/ 2) {
    				attr_dev(stop2, "offset", /*rounded*/ ctx[1]);
    			}

    			if (dirty & /*id*/ 4) {
    				attr_dev(linearGradient, "id", /*id*/ ctx[2]);
    			}

    			if (dirty & /*highlighted*/ 1) {
    				attr_dev(polygon, "data-highlighted", /*highlighted*/ ctx[0]);
    			}

    			if (dirty & /*id*/ 4 && polygon_fill_value !== (polygon_fill_value = `url(#${/*id*/ ctx[2]})`)) {
    				attr_dev(polygon, "fill", polygon_fill_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { value } = $$props;
    	let { highlighted = false } = $$props;
    	const writable_props = ["value", "highlighted"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Star> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Star", $$slots, []);

    	$$self.$set = $$props => {
    		if ("value" in $$props) $$invalidate(3, value = $$props.value);
    		if ("highlighted" in $$props) $$invalidate(0, highlighted = $$props.highlighted);
    	};

    	$$self.$capture_state = () => ({ value, highlighted, rounded, id });

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(3, value = $$props.value);
    		if ("highlighted" in $$props) $$invalidate(0, highlighted = $$props.highlighted);
    		if ("rounded" in $$props) $$invalidate(1, rounded = $$props.rounded);
    		if ("id" in $$props) $$invalidate(2, id = $$props.id);
    	};

    	let rounded;
    	let id;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 8) {
    			 $$invalidate(1, rounded = value.toFixed(1));
    		}
    	};

    	 $$invalidate(2, id = `star:${Math.random().toString(36).slice(2, 10)}`);
    	return [highlighted, rounded, id, value];
    }

    class Star extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { value: 3, highlighted: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Star",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*value*/ ctx[3] === undefined && !("value" in props)) {
    			console.warn("<Star> was created without expected prop 'value'");
    		}
    	}

    	get value() {
    		throw new Error("<Star>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Star>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get highlighted() {
    		throw new Error("<Star>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set highlighted(value) {
    		throw new Error("<Star>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* web/rating.svelte generated by Svelte v3.23.0 */
    const file$1 = "web/rating.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let current;

    	const star0 = new Star({
    			props: {
    				highlighted: /*highlighted*/ ctx[1],
    				value: Math.min(1, /*value*/ ctx[0] - 0)
    			},
    			$$inline: true
    		});

    	const star1 = new Star({
    			props: {
    				highlighted: /*highlighted*/ ctx[1],
    				value: Math.min(1, /*value*/ ctx[0] - 1)
    			},
    			$$inline: true
    		});

    	const star2 = new Star({
    			props: {
    				highlighted: /*highlighted*/ ctx[1],
    				value: Math.min(1, /*value*/ ctx[0] - 2)
    			},
    			$$inline: true
    		});

    	const star3 = new Star({
    			props: {
    				highlighted: /*highlighted*/ ctx[1],
    				value: Math.min(1, /*value*/ ctx[0] - 3)
    			},
    			$$inline: true
    		});

    	const star4 = new Star({
    			props: {
    				highlighted: /*highlighted*/ ctx[1],
    				value: Math.min(1, /*value*/ ctx[0] - 4)
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(star0.$$.fragment);
    			t0 = space();
    			create_component(star1.$$.fragment);
    			t1 = space();
    			create_component(star2.$$.fragment);
    			t2 = space();
    			create_component(star3.$$.fragment);
    			t3 = space();
    			create_component(star4.$$.fragment);
    			attr_dev(div, "class", "svelte-5zni05");
    			add_location(div, file$1, 7, 0, 107);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(star0, div, null);
    			append_dev(div, t0);
    			mount_component(star1, div, null);
    			append_dev(div, t1);
    			mount_component(star2, div, null);
    			append_dev(div, t2);
    			mount_component(star3, div, null);
    			append_dev(div, t3);
    			mount_component(star4, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const star0_changes = {};
    			if (dirty & /*highlighted*/ 2) star0_changes.highlighted = /*highlighted*/ ctx[1];
    			if (dirty & /*value*/ 1) star0_changes.value = Math.min(1, /*value*/ ctx[0] - 0);
    			star0.$set(star0_changes);
    			const star1_changes = {};
    			if (dirty & /*highlighted*/ 2) star1_changes.highlighted = /*highlighted*/ ctx[1];
    			if (dirty & /*value*/ 1) star1_changes.value = Math.min(1, /*value*/ ctx[0] - 1);
    			star1.$set(star1_changes);
    			const star2_changes = {};
    			if (dirty & /*highlighted*/ 2) star2_changes.highlighted = /*highlighted*/ ctx[1];
    			if (dirty & /*value*/ 1) star2_changes.value = Math.min(1, /*value*/ ctx[0] - 2);
    			star2.$set(star2_changes);
    			const star3_changes = {};
    			if (dirty & /*highlighted*/ 2) star3_changes.highlighted = /*highlighted*/ ctx[1];
    			if (dirty & /*value*/ 1) star3_changes.value = Math.min(1, /*value*/ ctx[0] - 3);
    			star3.$set(star3_changes);
    			const star4_changes = {};
    			if (dirty & /*highlighted*/ 2) star4_changes.highlighted = /*highlighted*/ ctx[1];
    			if (dirty & /*value*/ 1) star4_changes.value = Math.min(1, /*value*/ ctx[0] - 4);
    			star4.$set(star4_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(star0.$$.fragment, local);
    			transition_in(star1.$$.fragment, local);
    			transition_in(star2.$$.fragment, local);
    			transition_in(star3.$$.fragment, local);
    			transition_in(star4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(star0.$$.fragment, local);
    			transition_out(star1.$$.fragment, local);
    			transition_out(star2.$$.fragment, local);
    			transition_out(star3.$$.fragment, local);
    			transition_out(star4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(star0);
    			destroy_component(star1);
    			destroy_component(star2);
    			destroy_component(star3);
    			destroy_component(star4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { value } = $$props;
    	let { highlighted = false } = $$props;
    	const writable_props = ["value", "highlighted"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Rating> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Rating", $$slots, []);

    	$$self.$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("highlighted" in $$props) $$invalidate(1, highlighted = $$props.highlighted);
    	};

    	$$self.$capture_state = () => ({ Star, value, highlighted });

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("highlighted" in $$props) $$invalidate(1, highlighted = $$props.highlighted);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [value, highlighted];
    }

    class Rating extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { value: 0, highlighted: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Rating",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*value*/ ctx[0] === undefined && !("value" in props)) {
    			console.warn("<Rating> was created without expected prop 'value'");
    		}
    	}

    	get value() {
    		throw new Error("<Rating>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Rating>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get highlighted() {
    		throw new Error("<Rating>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set highlighted(value) {
    		throw new Error("<Rating>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var id = writable(new URLSearchParams(window.location.search).get("id"));

    /* web/product-card.svelte generated by Svelte v3.23.0 */
    const file$2 = "web/product-card.svelte";

    function create_fragment$2(ctx) {
    	let div11;
    	let div0;
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let t3;
    	let div2;
    	let t4;
    	let t5;
    	let div3;
    	let t6;
    	let div4;
    	let t7;
    	let t8;
    	let t9;
    	let div10;
    	let div5;
    	let t10;
    	let div5_aria_hidden_value;
    	let t11;
    	let div6;
    	let t12;
    	let div6_aria_hidden_value;
    	let t13;
    	let div7;
    	let t14;
    	let div7_aria_hidden_value;
    	let t15;
    	let div8;
    	let t16;
    	let div8_aria_hidden_value;
    	let t17;
    	let div9;
    	let t18;
    	let div9_aria_hidden_value;
    	let current;
    	let mounted;
    	let dispose;

    	const rating_1 = new Rating({
    			props: { value: /*rating*/ ctx[9] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			div0 = element("div");
    			t0 = text(/*brand*/ ctx[0]);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(/*category*/ ctx[1]);
    			t3 = space();
    			div2 = element("div");
    			t4 = text(/*name*/ ctx[2]);
    			t5 = space();
    			div3 = element("div");
    			create_component(rating_1.$$.fragment);
    			t6 = space();
    			div4 = element("div");
    			t7 = text(/*price*/ ctx[3]);
    			t8 = text("$");
    			t9 = space();
    			div10 = element("div");
    			div5 = element("div");
    			t10 = text("Normal");
    			t11 = space();
    			div6 = element("div");
    			t12 = text("Dry");
    			t13 = space();
    			div7 = element("div");
    			t14 = text("Oily");
    			t15 = space();
    			div8 = element("div");
    			t16 = text("Sensitive");
    			t17 = space();
    			div9 = element("div");
    			t18 = text("Combination");
    			attr_dev(div0, "class", "brand svelte-1toclj5");
    			add_location(div0, file$2, 26, 1, 452);
    			attr_dev(div1, "class", "category svelte-1toclj5");
    			add_location(div1, file$2, 27, 1, 486);
    			attr_dev(div2, "class", "name svelte-1toclj5");
    			add_location(div2, file$2, 28, 1, 526);
    			attr_dev(div3, "class", "rating svelte-1toclj5");
    			add_location(div3, file$2, 29, 1, 558);
    			attr_dev(div4, "class", "price svelte-1toclj5");
    			add_location(div4, file$2, 30, 1, 610);
    			attr_dev(div5, "aria-hidden", div5_aria_hidden_value = !/*normal*/ ctx[6]);
    			attr_dev(div5, "class", "chip svelte-1toclj5");
    			add_location(div5, file$2, 32, 2, 672);
    			attr_dev(div6, "aria-hidden", div6_aria_hidden_value = !/*dry*/ ctx[5]);
    			attr_dev(div6, "class", "chip svelte-1toclj5");
    			add_location(div6, file$2, 33, 2, 727);
    			attr_dev(div7, "aria-hidden", div7_aria_hidden_value = !/*oily*/ ctx[7]);
    			attr_dev(div7, "class", "chip svelte-1toclj5");
    			add_location(div7, file$2, 34, 2, 776);
    			attr_dev(div8, "aria-hidden", div8_aria_hidden_value = !/*sensitive*/ ctx[8]);
    			attr_dev(div8, "class", "chip svelte-1toclj5");
    			add_location(div8, file$2, 35, 2, 827);
    			attr_dev(div9, "aria-hidden", div9_aria_hidden_value = !/*combination*/ ctx[4]);
    			attr_dev(div9, "class", "chip svelte-1toclj5");
    			add_location(div9, file$2, 36, 2, 888);
    			attr_dev(div10, "class", "skin-types svelte-1toclj5");
    			add_location(div10, file$2, 31, 1, 645);
    			attr_dev(div11, "class", "product svelte-1toclj5");
    			set_style(div11, "--margin", /*margin*/ ctx[11]);
    			attr_dev(div11, "tabindex", "-1");
    			attr_dev(div11, "role", "button");
    			add_location(div11, file$2, 19, 0, 335);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div0);
    			append_dev(div0, t0);
    			append_dev(div11, t1);
    			append_dev(div11, div1);
    			append_dev(div1, t2);
    			append_dev(div11, t3);
    			append_dev(div11, div2);
    			append_dev(div2, t4);
    			append_dev(div11, t5);
    			append_dev(div11, div3);
    			mount_component(rating_1, div3, null);
    			append_dev(div11, t6);
    			append_dev(div11, div4);
    			append_dev(div4, t7);
    			append_dev(div4, t8);
    			append_dev(div11, t9);
    			append_dev(div11, div10);
    			append_dev(div10, div5);
    			append_dev(div5, t10);
    			append_dev(div10, t11);
    			append_dev(div10, div6);
    			append_dev(div6, t12);
    			append_dev(div10, t13);
    			append_dev(div10, div7);
    			append_dev(div7, t14);
    			append_dev(div10, t15);
    			append_dev(div10, div8);
    			append_dev(div8, t16);
    			append_dev(div10, t17);
    			append_dev(div10, div9);
    			append_dev(div9, t18);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div11, "click", /*click_handler*/ ctx[13], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*brand*/ 1) set_data_dev(t0, /*brand*/ ctx[0]);
    			if (!current || dirty & /*category*/ 2) set_data_dev(t2, /*category*/ ctx[1]);
    			if (!current || dirty & /*name*/ 4) set_data_dev(t4, /*name*/ ctx[2]);
    			const rating_1_changes = {};
    			if (dirty & /*rating*/ 512) rating_1_changes.value = /*rating*/ ctx[9];
    			rating_1.$set(rating_1_changes);
    			if (!current || dirty & /*price*/ 8) set_data_dev(t7, /*price*/ ctx[3]);

    			if (!current || dirty & /*normal*/ 64 && div5_aria_hidden_value !== (div5_aria_hidden_value = !/*normal*/ ctx[6])) {
    				attr_dev(div5, "aria-hidden", div5_aria_hidden_value);
    			}

    			if (!current || dirty & /*dry*/ 32 && div6_aria_hidden_value !== (div6_aria_hidden_value = !/*dry*/ ctx[5])) {
    				attr_dev(div6, "aria-hidden", div6_aria_hidden_value);
    			}

    			if (!current || dirty & /*oily*/ 128 && div7_aria_hidden_value !== (div7_aria_hidden_value = !/*oily*/ ctx[7])) {
    				attr_dev(div7, "aria-hidden", div7_aria_hidden_value);
    			}

    			if (!current || dirty & /*sensitive*/ 256 && div8_aria_hidden_value !== (div8_aria_hidden_value = !/*sensitive*/ ctx[8])) {
    				attr_dev(div8, "aria-hidden", div8_aria_hidden_value);
    			}

    			if (!current || dirty & /*combination*/ 16 && div9_aria_hidden_value !== (div9_aria_hidden_value = !/*combination*/ ctx[4])) {
    				attr_dev(div9, "aria-hidden", div9_aria_hidden_value);
    			}

    			if (!current || dirty & /*margin*/ 2048) {
    				set_style(div11, "--margin", /*margin*/ ctx[11]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rating_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rating_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div11);
    			destroy_component(rating_1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $routeId;
    	validate_store(id, "routeId");
    	component_subscribe($$self, id, $$value => $$invalidate(12, $routeId = $$value));
    	let { brand } = $$props;
    	let { category } = $$props;
    	let { name } = $$props;
    	let { price } = $$props;
    	let { combination } = $$props;
    	let { dry } = $$props;
    	let { normal } = $$props;
    	let { oily } = $$props;
    	let { sensitive } = $$props;
    	let { rating } = $$props;
    	let { id: id$1 } = $$props;
    	let { margin = 0 } = $$props;

    	const writable_props = [
    		"brand",
    		"category",
    		"name",
    		"price",
    		"combination",
    		"dry",
    		"normal",
    		"oily",
    		"sensitive",
    		"rating",
    		"id",
    		"margin"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Product_card> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Product_card", $$slots, []);
    	const click_handler = () => set_store_value(id, $routeId = id$1);

    	$$self.$set = $$props => {
    		if ("brand" in $$props) $$invalidate(0, brand = $$props.brand);
    		if ("category" in $$props) $$invalidate(1, category = $$props.category);
    		if ("name" in $$props) $$invalidate(2, name = $$props.name);
    		if ("price" in $$props) $$invalidate(3, price = $$props.price);
    		if ("combination" in $$props) $$invalidate(4, combination = $$props.combination);
    		if ("dry" in $$props) $$invalidate(5, dry = $$props.dry);
    		if ("normal" in $$props) $$invalidate(6, normal = $$props.normal);
    		if ("oily" in $$props) $$invalidate(7, oily = $$props.oily);
    		if ("sensitive" in $$props) $$invalidate(8, sensitive = $$props.sensitive);
    		if ("rating" in $$props) $$invalidate(9, rating = $$props.rating);
    		if ("id" in $$props) $$invalidate(10, id$1 = $$props.id);
    		if ("margin" in $$props) $$invalidate(11, margin = $$props.margin);
    	};

    	$$self.$capture_state = () => ({
    		Rating,
    		routeId: id,
    		brand,
    		category,
    		name,
    		price,
    		combination,
    		dry,
    		normal,
    		oily,
    		sensitive,
    		rating,
    		id: id$1,
    		margin,
    		$routeId
    	});

    	$$self.$inject_state = $$props => {
    		if ("brand" in $$props) $$invalidate(0, brand = $$props.brand);
    		if ("category" in $$props) $$invalidate(1, category = $$props.category);
    		if ("name" in $$props) $$invalidate(2, name = $$props.name);
    		if ("price" in $$props) $$invalidate(3, price = $$props.price);
    		if ("combination" in $$props) $$invalidate(4, combination = $$props.combination);
    		if ("dry" in $$props) $$invalidate(5, dry = $$props.dry);
    		if ("normal" in $$props) $$invalidate(6, normal = $$props.normal);
    		if ("oily" in $$props) $$invalidate(7, oily = $$props.oily);
    		if ("sensitive" in $$props) $$invalidate(8, sensitive = $$props.sensitive);
    		if ("rating" in $$props) $$invalidate(9, rating = $$props.rating);
    		if ("id" in $$props) $$invalidate(10, id$1 = $$props.id);
    		if ("margin" in $$props) $$invalidate(11, margin = $$props.margin);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		brand,
    		category,
    		name,
    		price,
    		combination,
    		dry,
    		normal,
    		oily,
    		sensitive,
    		rating,
    		id$1,
    		margin,
    		$routeId,
    		click_handler
    	];
    }

    class Product_card extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			brand: 0,
    			category: 1,
    			name: 2,
    			price: 3,
    			combination: 4,
    			dry: 5,
    			normal: 6,
    			oily: 7,
    			sensitive: 8,
    			rating: 9,
    			id: 10,
    			margin: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Product_card",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*brand*/ ctx[0] === undefined && !("brand" in props)) {
    			console.warn("<Product_card> was created without expected prop 'brand'");
    		}

    		if (/*category*/ ctx[1] === undefined && !("category" in props)) {
    			console.warn("<Product_card> was created without expected prop 'category'");
    		}

    		if (/*name*/ ctx[2] === undefined && !("name" in props)) {
    			console.warn("<Product_card> was created without expected prop 'name'");
    		}

    		if (/*price*/ ctx[3] === undefined && !("price" in props)) {
    			console.warn("<Product_card> was created without expected prop 'price'");
    		}

    		if (/*combination*/ ctx[4] === undefined && !("combination" in props)) {
    			console.warn("<Product_card> was created without expected prop 'combination'");
    		}

    		if (/*dry*/ ctx[5] === undefined && !("dry" in props)) {
    			console.warn("<Product_card> was created without expected prop 'dry'");
    		}

    		if (/*normal*/ ctx[6] === undefined && !("normal" in props)) {
    			console.warn("<Product_card> was created without expected prop 'normal'");
    		}

    		if (/*oily*/ ctx[7] === undefined && !("oily" in props)) {
    			console.warn("<Product_card> was created without expected prop 'oily'");
    		}

    		if (/*sensitive*/ ctx[8] === undefined && !("sensitive" in props)) {
    			console.warn("<Product_card> was created without expected prop 'sensitive'");
    		}

    		if (/*rating*/ ctx[9] === undefined && !("rating" in props)) {
    			console.warn("<Product_card> was created without expected prop 'rating'");
    		}

    		if (/*id*/ ctx[10] === undefined && !("id" in props)) {
    			console.warn("<Product_card> was created without expected prop 'id'");
    		}
    	}

    	get brand() {
    		throw new Error("<Product_card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set brand(value) {
    		throw new Error("<Product_card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get category() {
    		throw new Error("<Product_card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set category(value) {
    		throw new Error("<Product_card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Product_card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Product_card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get price() {
    		throw new Error("<Product_card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set price(value) {
    		throw new Error("<Product_card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get combination() {
    		throw new Error("<Product_card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set combination(value) {
    		throw new Error("<Product_card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dry() {
    		throw new Error("<Product_card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dry(value) {
    		throw new Error("<Product_card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get normal() {
    		throw new Error("<Product_card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set normal(value) {
    		throw new Error("<Product_card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get oily() {
    		throw new Error("<Product_card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set oily(value) {
    		throw new Error("<Product_card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sensitive() {
    		throw new Error("<Product_card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sensitive(value) {
    		throw new Error("<Product_card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rating() {
    		throw new Error("<Product_card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rating(value) {
    		throw new Error("<Product_card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Product_card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Product_card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get margin() {
    		throw new Error("<Product_card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set margin(value) {
    		throw new Error("<Product_card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* web/sorting.svelte generated by Svelte v3.23.0 */

    const file$3 = "web/sorting.svelte";

    function create_fragment$3(ctx) {
    	let div9;
    	let h2;
    	let t1;
    	let button0;
    	let div0;
    	let t3;
    	let div1;
    	let t5;
    	let div2;
    	let button0_data_ascending_value;
    	let swipe_action;
    	let t7;
    	let button1;
    	let div3;
    	let t9;
    	let div4;
    	let t11;
    	let div5;
    	let button1_data_ascending_value;
    	let swipe_action_1;
    	let t13;
    	let button2;
    	let div6;
    	let t15;
    	let div7;
    	let t17;
    	let div8;
    	let button2_data_ascending_value;
    	let swipe_action_2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Sort by:";
    			t1 = space();
    			button0 = element("button");
    			div0 = element("div");
    			div0.textContent = "↑";
    			t3 = space();
    			div1 = element("div");
    			div1.textContent = "Name";
    			t5 = space();
    			div2 = element("div");
    			div2.textContent = "↓";
    			t7 = space();
    			button1 = element("button");
    			div3 = element("div");
    			div3.textContent = "↑";
    			t9 = space();
    			div4 = element("div");
    			div4.textContent = "Rating";
    			t11 = space();
    			div5 = element("div");
    			div5.textContent = "↓";
    			t13 = space();
    			button2 = element("button");
    			div6 = element("div");
    			div6.textContent = "↑";
    			t15 = space();
    			div7 = element("div");
    			div7.textContent = "Price";
    			t17 = space();
    			div8 = element("div");
    			div8.textContent = "↓";
    			attr_dev(h2, "class", "svelte-f2o26");
    			add_location(h2, file$3, 81, 1, 1977);
    			attr_dev(div0, "class", "ascending svelte-f2o26");
    			add_location(div0, file$3, 83, 2, 2096);
    			attr_dev(div1, "class", "slider svelte-f2o26");
    			add_location(div1, file$3, 84, 2, 2163);
    			attr_dev(div2, "class", "descending svelte-f2o26");
    			add_location(div2, file$3, 85, 2, 2226);
    			attr_dev(button0, "class", "sort-button svelte-f2o26");
    			attr_dev(button0, "data-ascending", button0_data_ascending_value = /*isAscending*/ ctx[6]("name", .../*$sorting*/ ctx[1]));
    			add_location(button0, file$3, 82, 1, 1996);
    			attr_dev(div3, "class", "ascending svelte-f2o26");
    			add_location(div3, file$3, 88, 2, 2407);
    			attr_dev(div4, "class", "slider svelte-f2o26");
    			add_location(div4, file$3, 89, 2, 2476);
    			attr_dev(div5, "class", "descending svelte-f2o26");
    			add_location(div5, file$3, 90, 2, 2544);
    			attr_dev(button1, "class", "sort-button svelte-f2o26");
    			attr_dev(button1, "data-ascending", button1_data_ascending_value = /*isAscending*/ ctx[6]("rating", .../*$sorting*/ ctx[1]));
    			add_location(button1, file$3, 87, 1, 2303);
    			attr_dev(div6, "class", "ascending svelte-f2o26");
    			add_location(div6, file$3, 93, 2, 2725);
    			attr_dev(div7, "class", "slider svelte-f2o26");
    			add_location(div7, file$3, 94, 2, 2793);
    			attr_dev(div8, "class", "descending svelte-f2o26");
    			add_location(div8, file$3, 95, 2, 2858);
    			attr_dev(button2, "class", "sort-button svelte-f2o26");
    			attr_dev(button2, "data-ascending", button2_data_ascending_value = /*isAscending*/ ctx[6]("price", .../*$sorting*/ ctx[1]));
    			add_location(button2, file$3, 92, 1, 2623);
    			attr_dev(div9, "class", "container svelte-f2o26");
    			add_location(div9, file$3, 80, 0, 1952);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, h2);
    			append_dev(div9, t1);
    			append_dev(div9, button0);
    			append_dev(button0, div0);
    			append_dev(button0, t3);
    			append_dev(button0, div1);
    			append_dev(button0, t5);
    			append_dev(button0, div2);
    			append_dev(div9, t7);
    			append_dev(div9, button1);
    			append_dev(button1, div3);
    			append_dev(button1, t9);
    			append_dev(button1, div4);
    			append_dev(button1, t11);
    			append_dev(button1, div5);
    			append_dev(div9, t13);
    			append_dev(div9, button2);
    			append_dev(button2, div6);
    			append_dev(button2, t15);
    			append_dev(button2, div7);
    			append_dev(button2, t17);
    			append_dev(button2, div8);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*clickRightSort*/ ctx[4]("name"), false, false, false),
    					listen_dev(div1, "click", /*toggleSort*/ ctx[2]("name"), false, false, false),
    					listen_dev(div2, "click", /*clickLeftSort*/ ctx[3]("name"), false, false, false),
    					action_destroyer(swipe_action = /*swipe*/ ctx[5].call(null, button0, "name")),
    					listen_dev(div3, "click", /*clickRightSort*/ ctx[4]("rating"), false, false, false),
    					listen_dev(div4, "click", /*toggleSort*/ ctx[2]("rating"), false, false, false),
    					listen_dev(div5, "click", /*clickLeftSort*/ ctx[3]("rating"), false, false, false),
    					action_destroyer(swipe_action_1 = /*swipe*/ ctx[5].call(null, button1, "rating")),
    					listen_dev(div6, "click", /*clickRightSort*/ ctx[4]("price"), false, false, false),
    					listen_dev(div7, "click", /*toggleSort*/ ctx[2]("price"), false, false, false),
    					listen_dev(div8, "click", /*clickLeftSort*/ ctx[3]("price"), false, false, false),
    					action_destroyer(swipe_action_2 = /*swipe*/ ctx[5].call(null, button2, "price"))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$sorting*/ 2 && button0_data_ascending_value !== (button0_data_ascending_value = /*isAscending*/ ctx[6]("name", .../*$sorting*/ ctx[1]))) {
    				attr_dev(button0, "data-ascending", button0_data_ascending_value);
    			}

    			if (dirty & /*$sorting*/ 2 && button1_data_ascending_value !== (button1_data_ascending_value = /*isAscending*/ ctx[6]("rating", .../*$sorting*/ ctx[1]))) {
    				attr_dev(button1, "data-ascending", button1_data_ascending_value);
    			}

    			if (dirty & /*$sorting*/ 2 && button2_data_ascending_value !== (button2_data_ascending_value = /*isAscending*/ ctx[6]("price", .../*$sorting*/ ctx[1]))) {
    				attr_dev(button2, "data-ascending", button2_data_ascending_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $sorting,
    		$$unsubscribe_sorting = noop,
    		$$subscribe_sorting = () => ($$unsubscribe_sorting(), $$unsubscribe_sorting = subscribe(sorting, $$value => $$invalidate(1, $sorting = $$value)), sorting);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_sorting());
    	let { sorting } = $$props;
    	validate_store(sorting, "sorting");
    	$$subscribe_sorting();

    	const toggleSort = field => () => {
    		const [active, ascending] = $sorting;
    		if (active !== field) set_store_value(sorting, $sorting = [field, true]); else if (ascending === true) set_store_value(sorting, $sorting = [field, false]); else set_store_value(sorting, $sorting = []);
    	};

    	const swipeRightSort = field => () => {
    		const [active, ascending] = $sorting;
    		if (active !== field) set_store_value(sorting, $sorting = [field, false]); else if (ascending === true) set_store_value(sorting, $sorting = []);
    	};

    	const swipeLeftSort = field => () => {
    		const [active, ascending] = $sorting;
    		if (active !== field) set_store_value(sorting, $sorting = [field, true]); else if (ascending === false) set_store_value(sorting, $sorting = []);
    	};

    	const clickLeftSort = field => () => {
    		set_store_value(sorting, $sorting = [field, true]);
    	};

    	const clickRightSort = field => () => {
    		set_store_value(sorting, $sorting = [field, false]);
    	};

    	const swipe = (node, field) => {
    		const left = swipeLeftSort(field);
    		const right = swipeRightSort(field);
    		const sensitivity = 10;
    		const horizontality = 50;
    		let X;
    		let Y;

    		const reset = () => {
    			X = undefined;
    			Y = undefined;
    		};

    		const touchStart = ({ touches: [{ clientX, clientY }] }) => {
    			X = clientX;
    			Y = clientY;
    		};

    		const touchMove = event => {
    			if (!Number.isFinite(X) || !Number.isFinite(Y)) return;
    			event.preventDefault();
    			const { touches: [{ clientX, clientY }] } = event;
    			if (Math.abs(clientY - Y) > horizontality) return reset();

    			if (clientX - X > sensitivity) {
    				reset();
    				right();
    			}

    			if (X - clientX > sensitivity) {
    				reset();
    				left();
    			}
    		};

    		node.addEventListener("touchstart", touchStart);
    		node.addEventListener("touchmove", touchMove);
    		node.addEventListener("touchend", reset);

    		return {
    			destroy: () => {
    				node.removeEventListener("touchstart", touchStart);
    				node.removeEventListener("touchmove", touchMove);
    				node.removeEventListener("touchend", reset);
    			}
    		};
    	};

    	const isAscending = (field, active, ascending) => {
    		if (active !== field) return undefined;
    		return ascending;
    	};

    	const writable_props = ["sorting"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Sorting> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Sorting", $$slots, []);

    	$$self.$set = $$props => {
    		if ("sorting" in $$props) $$subscribe_sorting($$invalidate(0, sorting = $$props.sorting));
    	};

    	$$self.$capture_state = () => ({
    		sorting,
    		toggleSort,
    		swipeRightSort,
    		swipeLeftSort,
    		clickLeftSort,
    		clickRightSort,
    		swipe,
    		isAscending,
    		$sorting
    	});

    	$$self.$inject_state = $$props => {
    		if ("sorting" in $$props) $$subscribe_sorting($$invalidate(0, sorting = $$props.sorting));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		sorting,
    		$sorting,
    		toggleSort,
    		clickLeftSort,
    		clickRightSort,
    		swipe,
    		isAscending
    	];
    }

    class Sorting extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { sorting: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sorting",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*sorting*/ ctx[0] === undefined && !("sorting" in props)) {
    			console.warn("<Sorting> was created without expected prop 'sorting'");
    		}
    	}

    	get sorting() {
    		throw new Error("<Sorting>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sorting(value) {
    		throw new Error("<Sorting>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* web/close-button.svelte generated by Svelte v3.23.0 */

    const file$4 = "web/close-button.svelte";

    function create_fragment$4(ctx) {
    	let button;
    	let svg;
    	let line0;
    	let line1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			svg = svg_element("svg");
    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			attr_dev(line0, "x1", "0");
    			attr_dev(line0, "y1", "0");
    			attr_dev(line0, "x2", "16");
    			attr_dev(line0, "y2", "16");
    			attr_dev(line0, "class", "svelte-3xdpp2");
    			add_location(line0, file$4, 2, 2, 70);
    			attr_dev(line1, "x1", "0");
    			attr_dev(line1, "y1", "16");
    			attr_dev(line1, "x2", "16");
    			attr_dev(line1, "y2", "0");
    			attr_dev(line1, "class", "svelte-3xdpp2");
    			add_location(line1, file$4, 3, 2, 111);
    			attr_dev(svg, "height", "12");
    			attr_dev(svg, "width", "12");
    			attr_dev(svg, "viewBox", "0 0 16 16");
    			add_location(svg, file$4, 1, 1, 19);
    			attr_dev(button, "class", "svelte-3xdpp2");
    			add_location(button, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, svg);
    			append_dev(svg, line0);
    			append_dev(svg, line1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Close_button> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Close_button", $$slots, []);

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	return [click_handler];
    }

    class Close_button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Close_button",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* web/filter-options/brand.svelte generated by Svelte v3.23.0 */
    const file$5 = "web/filter-options/brand.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (22:1) {#each brands as brand }
    function create_each_block(ctx) {
    	let div;
    	let t_value = /*brand*/ ctx[5] + "";
    	let t;
    	let div_data_selected_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "data-selected", div_data_selected_value = /*$filters*/ ctx[2].brand === /*brand*/ ctx[5]);
    			attr_dev(div, "class", "option svelte-8pu1e2");
    			add_location(div, file$5, 22, 2, 461);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);

    			if (!mounted) {
    				dispose = listen_dev(
    					div,
    					"click",
    					function () {
    						if (is_function(/*handleSelection*/ ctx[3](/*brand*/ ctx[5]))) /*handleSelection*/ ctx[3](/*brand*/ ctx[5]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*brands*/ 2 && t_value !== (t_value = /*brand*/ ctx[5] + "")) set_data_dev(t, t_value);

    			if (dirty & /*$filters, brands*/ 6 && div_data_selected_value !== (div_data_selected_value = /*$filters*/ ctx[2].brand === /*brand*/ ctx[5])) {
    				attr_dev(div, "data-selected", div_data_selected_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(22:1) {#each brands as brand }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let each_value = /*brands*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "drawer-content svelte-8pu1e2");
    			add_location(div, file$5, 20, 0, 403);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$filters, brands, handleSelection*/ 14) {
    				each_value = /*brands*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $filters,
    		$$unsubscribe_filters = noop,
    		$$subscribe_filters = () => ($$unsubscribe_filters(), $$unsubscribe_filters = subscribe(filters, $$value => $$invalidate(2, $filters = $$value)), filters);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_filters());
    	let { filters } = $$props;
    	validate_store(filters, "filters");
    	$$subscribe_filters();
    	let brands = [];

    	onMount(async () => {
    		const response = await fetch("/api/brands");
    		$$invalidate(1, brands = await response.json());
    	});

    	const dispatch = createEventDispatcher();

    	const handleSelection = brand => () => {
    		set_store_value(filters, $filters = { ...$filters, brand });
    		dispatch("filter");
    	};

    	const writable_props = ["filters"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Brand> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Brand", $$slots, []);

    	$$self.$set = $$props => {
    		if ("filters" in $$props) $$subscribe_filters($$invalidate(0, filters = $$props.filters));
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		createEventDispatcher,
    		filters,
    		brands,
    		dispatch,
    		handleSelection,
    		$filters
    	});

    	$$self.$inject_state = $$props => {
    		if ("filters" in $$props) $$subscribe_filters($$invalidate(0, filters = $$props.filters));
    		if ("brands" in $$props) $$invalidate(1, brands = $$props.brands);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [filters, brands, $filters, handleSelection];
    }

    class Brand extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { filters: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Brand",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*filters*/ ctx[0] === undefined && !("filters" in props)) {
    			console.warn("<Brand> was created without expected prop 'filters'");
    		}
    	}

    	get filters() {
    		throw new Error("<Brand>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filters(value) {
    		throw new Error("<Brand>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* web/filter-options/category.svelte generated by Svelte v3.23.0 */
    const file$6 = "web/filter-options/category.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (22:1) {#each categories as category }
    function create_each_block$1(ctx) {
    	let div;
    	let t_value = /*category*/ ctx[5] + "";
    	let t;
    	let div_data_selected_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "data-selected", div_data_selected_value = /*$filters*/ ctx[2].category === /*category*/ ctx[5]);
    			attr_dev(div, "class", "option svelte-15u0f2w");
    			add_location(div, file$6, 22, 2, 486);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);

    			if (!mounted) {
    				dispose = listen_dev(
    					div,
    					"click",
    					function () {
    						if (is_function(/*handleSelection*/ ctx[3](/*category*/ ctx[5]))) /*handleSelection*/ ctx[3](/*category*/ ctx[5]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*categories*/ 2 && t_value !== (t_value = /*category*/ ctx[5] + "")) set_data_dev(t, t_value);

    			if (dirty & /*$filters, categories*/ 6 && div_data_selected_value !== (div_data_selected_value = /*$filters*/ ctx[2].category === /*category*/ ctx[5])) {
    				attr_dev(div, "data-selected", div_data_selected_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(22:1) {#each categories as category }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div;
    	let each_value = /*categories*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "drawer-content svelte-15u0f2w");
    			add_location(div, file$6, 20, 0, 421);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$filters, categories, handleSelection*/ 14) {
    				each_value = /*categories*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $filters,
    		$$unsubscribe_filters = noop,
    		$$subscribe_filters = () => ($$unsubscribe_filters(), $$unsubscribe_filters = subscribe(filters, $$value => $$invalidate(2, $filters = $$value)), filters);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_filters());
    	let { filters } = $$props;
    	validate_store(filters, "filters");
    	$$subscribe_filters();
    	let categories = [];

    	onMount(async () => {
    		const response = await fetch("/api/categories");
    		$$invalidate(1, categories = await response.json());
    	});

    	const dispatch = createEventDispatcher();

    	const handleSelection = category => () => {
    		set_store_value(filters, $filters = { ...$filters, category });
    		dispatch("filter");
    	};

    	const writable_props = ["filters"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Category> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Category", $$slots, []);

    	$$self.$set = $$props => {
    		if ("filters" in $$props) $$subscribe_filters($$invalidate(0, filters = $$props.filters));
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		createEventDispatcher,
    		filters,
    		categories,
    		dispatch,
    		handleSelection,
    		$filters
    	});

    	$$self.$inject_state = $$props => {
    		if ("filters" in $$props) $$subscribe_filters($$invalidate(0, filters = $$props.filters));
    		if ("categories" in $$props) $$invalidate(1, categories = $$props.categories);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [filters, categories, $filters, handleSelection];
    }

    class Category extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { filters: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Category",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*filters*/ ctx[0] === undefined && !("filters" in props)) {
    			console.warn("<Category> was created without expected prop 'filters'");
    		}
    	}

    	get filters() {
    		throw new Error("<Category>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filters(value) {
    		throw new Error("<Category>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* web/filter-options/rating.svelte generated by Svelte v3.23.0 */
    const file$7 = "web/filter-options/rating.svelte";

    function create_fragment$7(ctx) {
    	let div5;
    	let div0;
    	let t0;
    	let div0_data_selected_value;
    	let t1;
    	let div1;
    	let t2;
    	let div1_data_selected_value;
    	let t3;
    	let div2;
    	let t4;
    	let div2_data_selected_value;
    	let t5;
    	let div3;
    	let t6;
    	let div3_data_selected_value;
    	let t7;
    	let div4;
    	let t8;
    	let div4_data_selected_value;
    	let current;
    	let mounted;
    	let dispose;

    	const rating0 = new Rating({
    			props: {
    				highlighted: /*$filters*/ ctx[1].rating === 1,
    				value: 1
    			},
    			$$inline: true
    		});

    	const rating1 = new Rating({
    			props: {
    				highlighted: /*$filters*/ ctx[1].rating === 2,
    				value: 2
    			},
    			$$inline: true
    		});

    	const rating2 = new Rating({
    			props: {
    				highlighted: /*$filters*/ ctx[1].rating === 3,
    				value: 3
    			},
    			$$inline: true
    		});

    	const rating3 = new Rating({
    			props: {
    				highlighted: /*$filters*/ ctx[1].rating === 4,
    				value: 4
    			},
    			$$inline: true
    		});

    	const rating4 = new Rating({
    			props: {
    				highlighted: /*$filters*/ ctx[1].rating === 5,
    				value: 5
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			create_component(rating0.$$.fragment);
    			t0 = text("+1");
    			t1 = space();
    			div1 = element("div");
    			create_component(rating1.$$.fragment);
    			t2 = text("+2");
    			t3 = space();
    			div2 = element("div");
    			create_component(rating2.$$.fragment);
    			t4 = text("+3");
    			t5 = space();
    			div3 = element("div");
    			create_component(rating3.$$.fragment);
    			t6 = text("+4");
    			t7 = space();
    			div4 = element("div");
    			create_component(rating4.$$.fragment);
    			t8 = text(" 5");
    			attr_dev(div0, "class", "option svelte-3tjvj9");
    			attr_dev(div0, "data-selected", div0_data_selected_value = /*$filters*/ ctx[1].rating === 1);
    			add_location(div0, file$7, 14, 1, 323);
    			attr_dev(div1, "class", "option svelte-3tjvj9");
    			attr_dev(div1, "data-selected", div1_data_selected_value = /*$filters*/ ctx[1].rating === 2);
    			add_location(div1, file$7, 17, 1, 482);
    			attr_dev(div2, "class", "option svelte-3tjvj9");
    			attr_dev(div2, "data-selected", div2_data_selected_value = /*$filters*/ ctx[1].rating === 3);
    			add_location(div2, file$7, 20, 1, 641);
    			attr_dev(div3, "class", "option svelte-3tjvj9");
    			attr_dev(div3, "data-selected", div3_data_selected_value = /*$filters*/ ctx[1].rating === 4);
    			add_location(div3, file$7, 23, 1, 800);
    			attr_dev(div4, "class", "option svelte-3tjvj9");
    			attr_dev(div4, "data-selected", div4_data_selected_value = /*$filters*/ ctx[1].rating === 5);
    			add_location(div4, file$7, 26, 1, 959);
    			attr_dev(div5, "class", "drawer-content svelte-3tjvj9");
    			add_location(div5, file$7, 13, 0, 292);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			mount_component(rating0, div0, null);
    			append_dev(div0, t0);
    			append_dev(div5, t1);
    			append_dev(div5, div1);
    			mount_component(rating1, div1, null);
    			append_dev(div1, t2);
    			append_dev(div5, t3);
    			append_dev(div5, div2);
    			mount_component(rating2, div2, null);
    			append_dev(div2, t4);
    			append_dev(div5, t5);
    			append_dev(div5, div3);
    			mount_component(rating3, div3, null);
    			append_dev(div3, t6);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			mount_component(rating4, div4, null);
    			append_dev(div4, t8);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*handleSelection*/ ctx[2](1), false, false, false),
    					listen_dev(div1, "click", /*handleSelection*/ ctx[2](2), false, false, false),
    					listen_dev(div2, "click", /*handleSelection*/ ctx[2](3), false, false, false),
    					listen_dev(div3, "click", /*handleSelection*/ ctx[2](4), false, false, false),
    					listen_dev(div4, "click", /*handleSelection*/ ctx[2](5), false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const rating0_changes = {};
    			if (dirty & /*$filters*/ 2) rating0_changes.highlighted = /*$filters*/ ctx[1].rating === 1;
    			rating0.$set(rating0_changes);

    			if (!current || dirty & /*$filters*/ 2 && div0_data_selected_value !== (div0_data_selected_value = /*$filters*/ ctx[1].rating === 1)) {
    				attr_dev(div0, "data-selected", div0_data_selected_value);
    			}

    			const rating1_changes = {};
    			if (dirty & /*$filters*/ 2) rating1_changes.highlighted = /*$filters*/ ctx[1].rating === 2;
    			rating1.$set(rating1_changes);

    			if (!current || dirty & /*$filters*/ 2 && div1_data_selected_value !== (div1_data_selected_value = /*$filters*/ ctx[1].rating === 2)) {
    				attr_dev(div1, "data-selected", div1_data_selected_value);
    			}

    			const rating2_changes = {};
    			if (dirty & /*$filters*/ 2) rating2_changes.highlighted = /*$filters*/ ctx[1].rating === 3;
    			rating2.$set(rating2_changes);

    			if (!current || dirty & /*$filters*/ 2 && div2_data_selected_value !== (div2_data_selected_value = /*$filters*/ ctx[1].rating === 3)) {
    				attr_dev(div2, "data-selected", div2_data_selected_value);
    			}

    			const rating3_changes = {};
    			if (dirty & /*$filters*/ 2) rating3_changes.highlighted = /*$filters*/ ctx[1].rating === 4;
    			rating3.$set(rating3_changes);

    			if (!current || dirty & /*$filters*/ 2 && div3_data_selected_value !== (div3_data_selected_value = /*$filters*/ ctx[1].rating === 4)) {
    				attr_dev(div3, "data-selected", div3_data_selected_value);
    			}

    			const rating4_changes = {};
    			if (dirty & /*$filters*/ 2) rating4_changes.highlighted = /*$filters*/ ctx[1].rating === 5;
    			rating4.$set(rating4_changes);

    			if (!current || dirty & /*$filters*/ 2 && div4_data_selected_value !== (div4_data_selected_value = /*$filters*/ ctx[1].rating === 5)) {
    				attr_dev(div4, "data-selected", div4_data_selected_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rating0.$$.fragment, local);
    			transition_in(rating1.$$.fragment, local);
    			transition_in(rating2.$$.fragment, local);
    			transition_in(rating3.$$.fragment, local);
    			transition_in(rating4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rating0.$$.fragment, local);
    			transition_out(rating1.$$.fragment, local);
    			transition_out(rating2.$$.fragment, local);
    			transition_out(rating3.$$.fragment, local);
    			transition_out(rating4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_component(rating0);
    			destroy_component(rating1);
    			destroy_component(rating2);
    			destroy_component(rating3);
    			destroy_component(rating4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $filters,
    		$$unsubscribe_filters = noop,
    		$$subscribe_filters = () => ($$unsubscribe_filters(), $$unsubscribe_filters = subscribe(filters, $$value => $$invalidate(1, $filters = $$value)), filters);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_filters());
    	let { filters } = $$props;
    	validate_store(filters, "filters");
    	$$subscribe_filters();
    	const dispatch = createEventDispatcher();

    	const handleSelection = rating => () => {
    		set_store_value(filters, $filters = { ...$filters, rating });
    		dispatch("filter", rating);
    	};

    	const writable_props = ["filters"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Rating> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Rating", $$slots, []);

    	$$self.$set = $$props => {
    		if ("filters" in $$props) $$subscribe_filters($$invalidate(0, filters = $$props.filters));
    	};

    	$$self.$capture_state = () => ({
    		Rating,
    		createEventDispatcher,
    		filters,
    		dispatch,
    		handleSelection,
    		$filters
    	});

    	$$self.$inject_state = $$props => {
    		if ("filters" in $$props) $$subscribe_filters($$invalidate(0, filters = $$props.filters));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [filters, $filters, handleSelection];
    }

    class Rating_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { filters: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Rating_1",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*filters*/ ctx[0] === undefined && !("filters" in props)) {
    			console.warn("<Rating> was created without expected prop 'filters'");
    		}
    	}

    	get filters() {
    		throw new Error("<Rating>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filters(value) {
    		throw new Error("<Rating>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* web/filter-options/pricing.svelte generated by Svelte v3.23.0 */
    const file$8 = "web/filter-options/pricing.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let input0;
    	let t;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input0 = element("input");
    			t = space();
    			input1 = element("input");
    			attr_dev(input0, "placeholder", "min");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "inputmode", "decimal");
    			attr_dev(input0, "class", "svelte-1ic3i5m");
    			add_location(input0, file$8, 29, 1, 609);
    			attr_dev(input1, "placeholder", "max");
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "inputmode", "decimal");
    			attr_dev(input1, "class", "svelte-1ic3i5m");
    			add_location(input1, file$8, 30, 1, 690);
    			attr_dev(div, "class", "drawer-content svelte-1ic3i5m");
    			add_location(div, file$8, 24, 0, 472);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input0);
    			set_input_value(input0, /*minPrice*/ ctx[1]);
    			append_dev(div, t);
    			append_dev(div, input1);
    			set_input_value(input1, /*maxPrice*/ ctx[2]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[8]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[9]),
    					listen_dev(div, "input", /*debouncedChange*/ ctx[4], true, false, false),
    					listen_dev(div, "keyup", /*keyup_handler*/ ctx[10], true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*minPrice*/ 2 && input0.value !== /*minPrice*/ ctx[1]) {
    				set_input_value(input0, /*minPrice*/ ctx[1]);
    			}

    			if (dirty & /*maxPrice*/ 4 && input1.value !== /*maxPrice*/ ctx[2]) {
    				set_input_value(input1, /*maxPrice*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $filters,
    		$$unsubscribe_filters = noop,
    		$$subscribe_filters = () => ($$unsubscribe_filters(), $$unsubscribe_filters = subscribe(filters, $$value => $$invalidate(6, $filters = $$value)), filters);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_filters());
    	let { filters } = $$props;
    	validate_store(filters, "filters");
    	$$subscribe_filters();
    	const dispatch = createEventDispatcher();
    	let { minPrice = "", maxPrice = "" } = $filters;

    	const handleSubmit = () => {
    		set_store_value(filters, $filters.maxPrice = maxPrice || undefined, $filters);
    		set_store_value(filters, $filters.minPrice = minPrice || undefined, $filters);
    		dispatch("filter");
    	};

    	const timer = {};

    	const debouncedChange = () => {
    		clearTimeout(timer.current);
    		timer.current = setTimeout(handleSubmit, 1000);
    	};

    	const writable_props = ["filters"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Pricing> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Pricing", $$slots, []);

    	function input0_input_handler() {
    		minPrice = this.value;
    		$$invalidate(1, minPrice);
    	}

    	function input1_input_handler() {
    		maxPrice = this.value;
    		$$invalidate(2, maxPrice);
    	}

    	const keyup_handler = ({ key }) => key === "Enter" && handleSubmit();

    	$$self.$set = $$props => {
    		if ("filters" in $$props) $$subscribe_filters($$invalidate(0, filters = $$props.filters));
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		filters,
    		dispatch,
    		minPrice,
    		maxPrice,
    		handleSubmit,
    		timer,
    		debouncedChange,
    		$filters
    	});

    	$$self.$inject_state = $$props => {
    		if ("filters" in $$props) $$subscribe_filters($$invalidate(0, filters = $$props.filters));
    		if ("minPrice" in $$props) $$invalidate(1, minPrice = $$props.minPrice);
    		if ("maxPrice" in $$props) $$invalidate(2, maxPrice = $$props.maxPrice);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		filters,
    		minPrice,
    		maxPrice,
    		handleSubmit,
    		debouncedChange,
    		timer,
    		$filters,
    		dispatch,
    		input0_input_handler,
    		input1_input_handler,
    		keyup_handler
    	];
    }

    class Pricing extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { filters: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Pricing",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*filters*/ ctx[0] === undefined && !("filters" in props)) {
    			console.warn("<Pricing> was created without expected prop 'filters'");
    		}
    	}

    	get filters() {
    		throw new Error("<Pricing>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filters(value) {
    		throw new Error("<Pricing>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* web/filter-options/skin.svelte generated by Svelte v3.23.0 */
    const file$9 = "web/filter-options/skin.svelte";

    function create_fragment$9(ctx) {
    	let div;
    	let label0;
    	let input0;
    	let t0;
    	let t1;
    	let label1;
    	let input1;
    	let t2;
    	let t3;
    	let label2;
    	let input2;
    	let t4;
    	let t5;
    	let label3;
    	let input3;
    	let t6;
    	let t7;
    	let label4;
    	let input4;
    	let t8;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t0 = text("Dry");
    			t1 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t2 = text("Oily");
    			t3 = space();
    			label2 = element("label");
    			input2 = element("input");
    			t4 = text("Normal");
    			t5 = space();
    			label3 = element("label");
    			input3 = element("input");
    			t6 = text("Sensitive");
    			t7 = space();
    			label4 = element("label");
    			input4 = element("input");
    			t8 = text("Combination");
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "name", "dry");
    			attr_dev(input0, "class", "svelte-qppy5s");
    			add_location(input0, file$9, 34, 2, 856);
    			attr_dev(label0, "class", "option svelte-qppy5s");
    			add_location(label0, file$9, 33, 1, 830);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "name", "oily");
    			attr_dev(input1, "class", "svelte-qppy5s");
    			add_location(input1, file$9, 37, 2, 950);
    			attr_dev(label1, "class", "option svelte-qppy5s");
    			add_location(label1, file$9, 36, 1, 924);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "name", "normal");
    			attr_dev(input2, "class", "svelte-qppy5s");
    			add_location(input2, file$9, 40, 2, 1047);
    			attr_dev(label2, "class", "option svelte-qppy5s");
    			add_location(label2, file$9, 39, 1, 1021);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "name", "sensitive");
    			attr_dev(input3, "class", "svelte-qppy5s");
    			add_location(input3, file$9, 43, 2, 1149);
    			attr_dev(label3, "class", "option svelte-qppy5s");
    			add_location(label3, file$9, 42, 1, 1124);
    			attr_dev(input4, "type", "checkbox");
    			attr_dev(input4, "name", "combination");
    			attr_dev(input4, "class", "svelte-qppy5s");
    			add_location(input4, file$9, 46, 2, 1261);
    			attr_dev(label4, "class", "option svelte-qppy5s");
    			add_location(label4, file$9, 45, 1, 1235);
    			attr_dev(div, "class", "drawer-content svelte-qppy5s");
    			add_location(div, file$9, 32, 0, 764);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label0);
    			append_dev(label0, input0);
    			input0.checked = /*dry*/ ctx[1];
    			append_dev(label0, t0);
    			append_dev(div, t1);
    			append_dev(div, label1);
    			append_dev(label1, input1);
    			input1.checked = /*oily*/ ctx[2];
    			append_dev(label1, t2);
    			append_dev(div, t3);
    			append_dev(div, label2);
    			append_dev(label2, input2);
    			input2.checked = /*normal*/ ctx[3];
    			append_dev(label2, t4);
    			append_dev(div, t5);
    			append_dev(div, label3);
    			append_dev(label3, input3);
    			input3.checked = /*sensitive*/ ctx[4];
    			append_dev(label3, t6);
    			append_dev(div, t7);
    			append_dev(div, label4);
    			append_dev(label4, input4);
    			input4.checked = /*combination*/ ctx[5];
    			append_dev(label4, t8);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[13]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[14]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[15]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[16]),
    					listen_dev(input4, "change", /*input4_change_handler*/ ctx[17]),
    					listen_dev(div, "change", /*debouncedChange*/ ctx[6], true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*dry*/ 2) {
    				input0.checked = /*dry*/ ctx[1];
    			}

    			if (dirty & /*oily*/ 4) {
    				input1.checked = /*oily*/ ctx[2];
    			}

    			if (dirty & /*normal*/ 8) {
    				input2.checked = /*normal*/ ctx[3];
    			}

    			if (dirty & /*sensitive*/ 16) {
    				input3.checked = /*sensitive*/ ctx[4];
    			}

    			if (dirty & /*combination*/ 32) {
    				input4.checked = /*combination*/ ctx[5];
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $filters,
    		$$unsubscribe_filters = noop,
    		$$subscribe_filters = () => ($$unsubscribe_filters(), $$unsubscribe_filters = subscribe(filters, $$value => $$invalidate(8, $filters = $$value)), filters);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_filters());
    	const dispatch = createEventDispatcher();
    	let { filters } = $$props;
    	validate_store(filters, "filters");
    	$$subscribe_filters();
    	let { dry = false, oily = false, normal = false, sensitive = false, combination = false } = $filters;
    	const valid = ([,value]) => value;
    	const aggregate = (acc, [key, value]) => ({ ...acc, [key]: value });

    	const handleSelection = () => {
    		set_store_value(filters, $filters.dry = dry || undefined, $filters);
    		set_store_value(filters, $filters.oily = oily || undefined, $filters);
    		set_store_value(filters, $filters.normal = normal || undefined, $filters);
    		set_store_value(filters, $filters.sensitive = sensitive || undefined, $filters);
    		set_store_value(filters, $filters.combination = combination || undefined, $filters);
    		dispatch("filter");
    	};

    	const timer = {};

    	const debouncedChange = () => {
    		clearTimeout(timer.current);
    		timer.current = setTimeout(handleSelection, 1000);
    	};

    	const writable_props = ["filters"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Skin> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Skin", $$slots, []);

    	function input0_change_handler() {
    		dry = this.checked;
    		$$invalidate(1, dry);
    	}

    	function input1_change_handler() {
    		oily = this.checked;
    		$$invalidate(2, oily);
    	}

    	function input2_change_handler() {
    		normal = this.checked;
    		$$invalidate(3, normal);
    	}

    	function input3_change_handler() {
    		sensitive = this.checked;
    		$$invalidate(4, sensitive);
    	}

    	function input4_change_handler() {
    		combination = this.checked;
    		$$invalidate(5, combination);
    	}

    	$$self.$set = $$props => {
    		if ("filters" in $$props) $$subscribe_filters($$invalidate(0, filters = $$props.filters));
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		filters,
    		dry,
    		oily,
    		normal,
    		sensitive,
    		combination,
    		valid,
    		aggregate,
    		handleSelection,
    		timer,
    		debouncedChange,
    		$filters
    	});

    	$$self.$inject_state = $$props => {
    		if ("filters" in $$props) $$subscribe_filters($$invalidate(0, filters = $$props.filters));
    		if ("dry" in $$props) $$invalidate(1, dry = $$props.dry);
    		if ("oily" in $$props) $$invalidate(2, oily = $$props.oily);
    		if ("normal" in $$props) $$invalidate(3, normal = $$props.normal);
    		if ("sensitive" in $$props) $$invalidate(4, sensitive = $$props.sensitive);
    		if ("combination" in $$props) $$invalidate(5, combination = $$props.combination);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		filters,
    		dry,
    		oily,
    		normal,
    		sensitive,
    		combination,
    		debouncedChange,
    		timer,
    		$filters,
    		dispatch,
    		valid,
    		aggregate,
    		handleSelection,
    		input0_change_handler,
    		input1_change_handler,
    		input2_change_handler,
    		input3_change_handler,
    		input4_change_handler
    	];
    }

    class Skin extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { filters: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Skin",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*filters*/ ctx[0] === undefined && !("filters" in props)) {
    			console.warn("<Skin> was created without expected prop 'filters'");
    		}
    	}

    	get filters() {
    		throw new Error("<Skin>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filters(value) {
    		throw new Error("<Skin>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* web/filters.svelte generated by Svelte v3.23.0 */
    const file$a = "web/filters.svelte";

    // (94:2) {#if $filters.brand}
    function create_if_block_8(ctx) {
    	let div;
    	let t_value = /*$filters*/ ctx[2].brand + "";
    	let t;
    	let current;
    	const close = new Close_button({ $$inline: true });
    	close.$on("click", /*click_handler*/ ctx[13]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			create_component(close.$$.fragment);
    			attr_dev(div, "class", "selected svelte-ng6vec");
    			add_location(div, file$a, 94, 3, 2517);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			mount_component(close, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*$filters*/ 4) && t_value !== (t_value = /*$filters*/ ctx[2].brand + "")) set_data_dev(t, t_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(close.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(close.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(close);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(94:2) {#if $filters.brand}",
    		ctx
    	});

    	return block;
    }

    // (109:2) {#if $filters.category}
    function create_if_block_7(ctx) {
    	let div;
    	let t_value = /*$filters*/ ctx[2].category + "";
    	let t;
    	let current;
    	const close = new Close_button({ $$inline: true });
    	close.$on("click", /*click_handler_1*/ ctx[14]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			create_component(close.$$.fragment);
    			attr_dev(div, "class", "selected svelte-ng6vec");
    			add_location(div, file$a, 109, 3, 2848);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			mount_component(close, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*$filters*/ 4) && t_value !== (t_value = /*$filters*/ ctx[2].category + "")) set_data_dev(t, t_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(close.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(close.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(close);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(109:2) {#if $filters.category}",
    		ctx
    	});

    	return block;
    }

    // (124:2) {#if $filters.rating}
    function create_if_block_6(ctx) {
    	let div;
    	let t;
    	let current;

    	const rating = new Rating({
    			props: { value: /*$filters*/ ctx[2].rating },
    			$$inline: true
    		});

    	const close = new Close_button({ $$inline: true });
    	close.$on("click", /*click_handler_2*/ ctx[15]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(rating.$$.fragment);
    			t = space();
    			create_component(close.$$.fragment);
    			attr_dev(div, "class", "selected rating svelte-ng6vec");
    			add_location(div, file$a, 124, 3, 3175);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(rating, div, null);
    			append_dev(div, t);
    			mount_component(close, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const rating_changes = {};
    			if (dirty & /*$filters*/ 4) rating_changes.value = /*$filters*/ ctx[2].rating;
    			rating.$set(rating_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rating.$$.fragment, local);
    			transition_in(close.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rating.$$.fragment, local);
    			transition_out(close.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(rating);
    			destroy_component(close);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(124:2) {#if $filters.rating}",
    		ctx
    	});

    	return block;
    }

    // (140:2) {#if $filters.maxPrice || $filters.minPrice }
    function create_if_block_5(ctx) {
    	let div;
    	let t0_value = /*formatPriceRange*/ ctx[3](/*$filters*/ ctx[2].minPrice, /*$filters*/ ctx[2].maxPrice) + "";
    	let t0;
    	let t1;
    	let current;
    	const close = new Close_button({ $$inline: true });
    	close.$on("click", /*click_handler_3*/ ctx[16]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			create_component(close.$$.fragment);
    			attr_dev(div, "class", "selected svelte-ng6vec");
    			add_location(div, file$a, 140, 3, 3548);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			mount_component(close, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*$filters*/ 4) && t0_value !== (t0_value = /*formatPriceRange*/ ctx[3](/*$filters*/ ctx[2].minPrice, /*$filters*/ ctx[2].maxPrice) + "")) set_data_dev(t0, t0_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(close.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(close.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(close);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(140:2) {#if $filters.maxPrice || $filters.minPrice }",
    		ctx
    	});

    	return block;
    }

    // (155:2) {#if $filters.dry }
    function create_if_block_4(ctx) {
    	let div;
    	let t;
    	let current;
    	const close = new Close_button({ $$inline: true });
    	close.$on("click", /*click_handler_4*/ ctx[17]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text("Dry\n\t\t\t\t");
    			create_component(close.$$.fragment);
    			attr_dev(div, "class", "selected svelte-ng6vec");
    			add_location(div, file$a, 155, 3, 3941);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			mount_component(close, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(close.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(close.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(close);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(155:2) {#if $filters.dry }",
    		ctx
    	});

    	return block;
    }

    // (161:2) {#if $filters.oily }
    function create_if_block_3(ctx) {
    	let div;
    	let t;
    	let current;
    	const close = new Close_button({ $$inline: true });
    	close.$on("click", /*click_handler_5*/ ctx[18]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text("Oily\n\t\t\t\t");
    			create_component(close.$$.fragment);
    			attr_dev(div, "class", "selected svelte-ng6vec");
    			add_location(div, file$a, 161, 3, 4077);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			mount_component(close, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(close.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(close.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(close);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(161:2) {#if $filters.oily }",
    		ctx
    	});

    	return block;
    }

    // (167:2) {#if $filters.normal }
    function create_if_block_2(ctx) {
    	let div;
    	let t;
    	let current;
    	const close = new Close_button({ $$inline: true });
    	close.$on("click", /*click_handler_6*/ ctx[19]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text("Normal\n\t\t\t\t");
    			create_component(close.$$.fragment);
    			attr_dev(div, "class", "selected svelte-ng6vec");
    			add_location(div, file$a, 167, 3, 4217);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			mount_component(close, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(close.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(close.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(close);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(167:2) {#if $filters.normal }",
    		ctx
    	});

    	return block;
    }

    // (173:2) {#if $filters.sensitive }
    function create_if_block_1(ctx) {
    	let div;
    	let t;
    	let current;
    	const close = new Close_button({ $$inline: true });
    	close.$on("click", /*click_handler_7*/ ctx[20]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text("Sensitive\n\t\t\t\t");
    			create_component(close.$$.fragment);
    			attr_dev(div, "class", "selected svelte-ng6vec");
    			add_location(div, file$a, 173, 3, 4364);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			mount_component(close, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(close.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(close.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(close);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(173:2) {#if $filters.sensitive }",
    		ctx
    	});

    	return block;
    }

    // (179:2) {#if $filters.combinaion }
    function create_if_block(ctx) {
    	let div;
    	let t;
    	let current;
    	const close = new Close_button({ $$inline: true });
    	close.$on("click", /*click_handler_8*/ ctx[21]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text("Combinaion\n\t\t\t\t");
    			create_component(close.$$.fragment);
    			attr_dev(div, "class", "selected svelte-ng6vec");
    			add_location(div, file$a, 179, 3, 4518);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			mount_component(close, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(close.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(close.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(close);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(179:2) {#if $filters.combinaion }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let div10;
    	let h2;
    	let t1;
    	let div1;
    	let button0;
    	let div0;
    	let button0_active_value;
    	let t3;
    	let t4;
    	let div3;
    	let button1;
    	let div2;
    	let button1_active_value;
    	let t6;
    	let t7;
    	let div5;
    	let button2;
    	let div4;
    	let button2_active_value;
    	let t9;
    	let t10;
    	let div7;
    	let button3;
    	let div6;
    	let button3_active_value;
    	let t12;
    	let t13;
    	let div9;
    	let button4;
    	let div8;
    	let button4_active_value;
    	let t15;
    	let t16;
    	let t17;
    	let t18;
    	let t19;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*$filters*/ ctx[2].brand && create_if_block_8(ctx);
    	let if_block1 = /*$filters*/ ctx[2].category && create_if_block_7(ctx);
    	let if_block2 = /*$filters*/ ctx[2].rating && create_if_block_6(ctx);
    	let if_block3 = (/*$filters*/ ctx[2].maxPrice || /*$filters*/ ctx[2].minPrice) && create_if_block_5(ctx);
    	let if_block4 = /*$filters*/ ctx[2].dry && create_if_block_4(ctx);
    	let if_block5 = /*$filters*/ ctx[2].oily && create_if_block_3(ctx);
    	let if_block6 = /*$filters*/ ctx[2].normal && create_if_block_2(ctx);
    	let if_block7 = /*$filters*/ ctx[2].sensitive && create_if_block_1(ctx);
    	let if_block8 = /*$filters*/ ctx[2].combinaion && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div10 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Filter by:";
    			t1 = space();
    			div1 = element("div");
    			button0 = element("button");
    			div0 = element("div");
    			div0.textContent = "Brand";
    			t3 = space();
    			if (if_block0) if_block0.c();
    			t4 = space();
    			div3 = element("div");
    			button1 = element("button");
    			div2 = element("div");
    			div2.textContent = "Category";
    			t6 = space();
    			if (if_block1) if_block1.c();
    			t7 = space();
    			div5 = element("div");
    			button2 = element("button");
    			div4 = element("div");
    			div4.textContent = "Rating";
    			t9 = space();
    			if (if_block2) if_block2.c();
    			t10 = space();
    			div7 = element("div");
    			button3 = element("button");
    			div6 = element("div");
    			div6.textContent = "Price";
    			t12 = space();
    			if (if_block3) if_block3.c();
    			t13 = space();
    			div9 = element("div");
    			button4 = element("button");
    			div8 = element("div");
    			div8.textContent = "Skin";
    			t15 = space();
    			if (if_block4) if_block4.c();
    			t16 = space();
    			if (if_block5) if_block5.c();
    			t17 = space();
    			if (if_block6) if_block6.c();
    			t18 = space();
    			if (if_block7) if_block7.c();
    			t19 = space();
    			if (if_block8) if_block8.c();
    			attr_dev(h2, "class", "svelte-ng6vec");
    			add_location(h2, file$a, 84, 1, 2306);
    			attr_dev(div0, "class", "svelte-ng6vec");
    			add_location(div0, file$a, 91, 3, 2462);
    			attr_dev(button0, "class", "collapse-button svelte-ng6vec");
    			attr_dev(button0, "active", button0_active_value = /*expanded*/ ctx[1] === "brand");
    			add_location(button0, file$a, 86, 2, 2351);
    			attr_dev(div1, "class", "section svelte-ng6vec");
    			add_location(div1, file$a, 85, 1, 2327);
    			attr_dev(div2, "class", "svelte-ng6vec");
    			add_location(div2, file$a, 106, 3, 2787);
    			attr_dev(button1, "active", button1_active_value = /*expanded*/ ctx[1] === "category");
    			attr_dev(button1, "class", "collapse-button svelte-ng6vec");
    			add_location(button1, file$a, 101, 2, 2670);
    			attr_dev(div3, "class", "section svelte-ng6vec");
    			add_location(div3, file$a, 100, 1, 2646);
    			attr_dev(div4, "class", "svelte-ng6vec");
    			add_location(div4, file$a, 121, 3, 3118);
    			attr_dev(button2, "active", button2_active_value = /*expanded*/ ctx[1] === "rating");
    			attr_dev(button2, "class", "collapse-button svelte-ng6vec");
    			add_location(button2, file$a, 116, 2, 3005);
    			attr_dev(div5, "class", "section svelte-ng6vec");
    			add_location(div5, file$a, 115, 1, 2981);
    			attr_dev(div6, "class", "svelte-ng6vec");
    			add_location(div6, file$a, 137, 3, 3468);
    			attr_dev(button3, "active", button3_active_value = /*expanded*/ ctx[1] === "price");
    			attr_dev(button3, "class", "collapse-button svelte-ng6vec");
    			add_location(button3, file$a, 132, 2, 3357);
    			attr_dev(div7, "class", "section svelte-ng6vec");
    			add_location(div7, file$a, 131, 1, 3333);
    			attr_dev(div8, "class", "svelte-ng6vec");
    			add_location(div8, file$a, 152, 3, 3888);
    			attr_dev(button4, "active", button4_active_value = /*expanded*/ ctx[1] === "skin");
    			attr_dev(button4, "class", "collapse-button svelte-ng6vec");
    			add_location(button4, file$a, 147, 2, 3779);
    			attr_dev(div9, "class", "section svelte-ng6vec");
    			add_location(div9, file$a, 146, 1, 3755);
    			attr_dev(div10, "class", "container svelte-ng6vec");
    			add_location(div10, file$a, 83, 0, 2281);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div10, anchor);
    			append_dev(div10, h2);
    			append_dev(div10, t1);
    			append_dev(div10, div1);
    			append_dev(div1, button0);
    			append_dev(button0, div0);
    			append_dev(div1, t3);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div10, t4);
    			append_dev(div10, div3);
    			append_dev(div3, button1);
    			append_dev(button1, div2);
    			append_dev(div3, t6);
    			if (if_block1) if_block1.m(div3, null);
    			append_dev(div10, t7);
    			append_dev(div10, div5);
    			append_dev(div5, button2);
    			append_dev(button2, div4);
    			append_dev(div5, t9);
    			if (if_block2) if_block2.m(div5, null);
    			append_dev(div10, t10);
    			append_dev(div10, div7);
    			append_dev(div7, button3);
    			append_dev(button3, div6);
    			append_dev(div7, t12);
    			if (if_block3) if_block3.m(div7, null);
    			append_dev(div10, t13);
    			append_dev(div10, div9);
    			append_dev(div9, button4);
    			append_dev(button4, div8);
    			append_dev(div9, t15);
    			if (if_block4) if_block4.m(div9, null);
    			append_dev(div9, t16);
    			if (if_block5) if_block5.m(div9, null);
    			append_dev(div9, t17);
    			if (if_block6) if_block6.m(div9, null);
    			append_dev(div9, t18);
    			if (if_block7) if_block7.m(div9, null);
    			append_dev(div9, t19);
    			if (if_block8) if_block8.m(div9, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*toggleFilter*/ ctx[4]("brand"), false, false, false),
    					listen_dev(button1, "click", /*toggleFilter*/ ctx[4]("category"), false, false, false),
    					listen_dev(button2, "click", /*toggleFilter*/ ctx[4]("rating"), false, false, false),
    					listen_dev(button3, "click", /*toggleFilter*/ ctx[4]("price"), false, false, false),
    					listen_dev(button4, "click", /*toggleFilter*/ ctx[4]("skin"), false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*expanded*/ 2 && button0_active_value !== (button0_active_value = /*expanded*/ ctx[1] === "brand")) {
    				attr_dev(button0, "active", button0_active_value);
    			}

    			if (/*$filters*/ ctx[2].brand) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*$filters*/ 4) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_8(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div1, null);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*expanded*/ 2 && button1_active_value !== (button1_active_value = /*expanded*/ ctx[1] === "category")) {
    				attr_dev(button1, "active", button1_active_value);
    			}

    			if (/*$filters*/ ctx[2].category) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*$filters*/ 4) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_7(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div3, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*expanded*/ 2 && button2_active_value !== (button2_active_value = /*expanded*/ ctx[1] === "rating")) {
    				attr_dev(button2, "active", button2_active_value);
    			}

    			if (/*$filters*/ ctx[2].rating) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*$filters*/ 4) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_6(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div5, null);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*expanded*/ 2 && button3_active_value !== (button3_active_value = /*expanded*/ ctx[1] === "price")) {
    				attr_dev(button3, "active", button3_active_value);
    			}

    			if (/*$filters*/ ctx[2].maxPrice || /*$filters*/ ctx[2].minPrice) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty & /*$filters*/ 4) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block_5(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(div7, null);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*expanded*/ 2 && button4_active_value !== (button4_active_value = /*expanded*/ ctx[1] === "skin")) {
    				attr_dev(button4, "active", button4_active_value);
    			}

    			if (/*$filters*/ ctx[2].dry) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);

    					if (dirty & /*$filters*/ 4) {
    						transition_in(if_block4, 1);
    					}
    				} else {
    					if_block4 = create_if_block_4(ctx);
    					if_block4.c();
    					transition_in(if_block4, 1);
    					if_block4.m(div9, t16);
    				}
    			} else if (if_block4) {
    				group_outros();

    				transition_out(if_block4, 1, 1, () => {
    					if_block4 = null;
    				});

    				check_outros();
    			}

    			if (/*$filters*/ ctx[2].oily) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);

    					if (dirty & /*$filters*/ 4) {
    						transition_in(if_block5, 1);
    					}
    				} else {
    					if_block5 = create_if_block_3(ctx);
    					if_block5.c();
    					transition_in(if_block5, 1);
    					if_block5.m(div9, t17);
    				}
    			} else if (if_block5) {
    				group_outros();

    				transition_out(if_block5, 1, 1, () => {
    					if_block5 = null;
    				});

    				check_outros();
    			}

    			if (/*$filters*/ ctx[2].normal) {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);

    					if (dirty & /*$filters*/ 4) {
    						transition_in(if_block6, 1);
    					}
    				} else {
    					if_block6 = create_if_block_2(ctx);
    					if_block6.c();
    					transition_in(if_block6, 1);
    					if_block6.m(div9, t18);
    				}
    			} else if (if_block6) {
    				group_outros();

    				transition_out(if_block6, 1, 1, () => {
    					if_block6 = null;
    				});

    				check_outros();
    			}

    			if (/*$filters*/ ctx[2].sensitive) {
    				if (if_block7) {
    					if_block7.p(ctx, dirty);

    					if (dirty & /*$filters*/ 4) {
    						transition_in(if_block7, 1);
    					}
    				} else {
    					if_block7 = create_if_block_1(ctx);
    					if_block7.c();
    					transition_in(if_block7, 1);
    					if_block7.m(div9, t19);
    				}
    			} else if (if_block7) {
    				group_outros();

    				transition_out(if_block7, 1, 1, () => {
    					if_block7 = null;
    				});

    				check_outros();
    			}

    			if (/*$filters*/ ctx[2].combinaion) {
    				if (if_block8) {
    					if_block8.p(ctx, dirty);

    					if (dirty & /*$filters*/ 4) {
    						transition_in(if_block8, 1);
    					}
    				} else {
    					if_block8 = create_if_block(ctx);
    					if_block8.c();
    					transition_in(if_block8, 1);
    					if_block8.m(div9, null);
    				}
    			} else if (if_block8) {
    				group_outros();

    				transition_out(if_block8, 1, 1, () => {
    					if_block8 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(if_block4);
    			transition_in(if_block5);
    			transition_in(if_block6);
    			transition_in(if_block7);
    			transition_in(if_block8);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(if_block4);
    			transition_out(if_block5);
    			transition_out(if_block6);
    			transition_out(if_block7);
    			transition_out(if_block8);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div10);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			if (if_block7) if_block7.d();
    			if (if_block8) if_block8.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let $filters,
    		$$unsubscribe_filters = noop,
    		$$subscribe_filters = () => ($$unsubscribe_filters(), $$unsubscribe_filters = subscribe(filters, $$value => $$invalidate(2, $filters = $$value)), filters);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_filters());
    	let { drawer } = $$props;
    	let { filters } = $$props;
    	validate_store(filters, "filters");
    	$$subscribe_filters();
    	let expanded = undefined;
    	let drawerContent = undefined;

    	const brandFilter = ({ detail: brand }) => {
    		$$invalidate(1, expanded = undefined);
    	}; // $filters = { ...$filters, brand };

    	const categoryFilter = ({ detail: category }) => {
    		$$invalidate(1, expanded = undefined);
    	}; // $filters = { ...$filters, category };

    	const ratingFilter = ({ detail: rating }) => {
    		$$invalidate(1, expanded = undefined);
    	}; // ;

    	const priceFilter = ({ detail }) => {
    		$$invalidate(1, expanded = undefined);
    	}; // $filters = { ...$filters, maxPrice: max, minPrice: min };

    	const skinFilter = ({ detail }) => {
    		$$invalidate(1, expanded = undefined);
    	}; // $filters = { ...$filters, ...detail };

    	const putInDrawer = field => {
    		if (drawerContent) {
    			drawerContent.$destroy();
    			drawerContent = undefined;
    		}

    		if (field === "brand") {
    			drawerContent = new Brand({ target: drawer, props: { filters } });
    			drawerContent.$on("filter", brandFilter);
    		}

    		if (field === "category") {
    			drawerContent = new Category({ target: drawer, props: { filters } });
    			drawerContent.$on("filter", categoryFilter);
    		}

    		if (field === "rating") {
    			drawerContent = new Rating_1({ target: drawer, props: { filters } });
    			drawerContent.$on("filter", ratingFilter);
    		}

    		if (field === "price") {
    			drawerContent = new Pricing({ target: drawer, props: { filters } });
    			drawerContent.$on("filter", priceFilter);
    		}

    		if (field === "skin") {
    			drawerContent = new Skin({ target: drawer, props: { filters } });
    			drawerContent.$on("filter", skinFilter);
    		}
    	};

    	const formatPriceRange = (min, max) => {
    		if (min && max) return `${min}$ - ${max}$`;
    		if (min) return `from ${min}$`;
    		if (max) return `up to ${max}$`;
    		return "";
    	};

    	const toggleFilter = name => () => $$invalidate(1, expanded = expanded === name ? undefined : name);
    	const writable_props = ["drawer", "filters"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Filters> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Filters", $$slots, []);
    	const click_handler = () => set_store_value(filters, $filters.brand = undefined, $filters);
    	const click_handler_1 = () => set_store_value(filters, $filters.category = undefined, $filters);
    	const click_handler_2 = () => set_store_value(filters, $filters.rating = undefined, $filters);

    	const click_handler_3 = () => {
    		set_store_value(filters, $filters.minPrice = undefined, $filters);
    		set_store_value(filters, $filters.maxPrice = undefined, $filters);
    	};

    	const click_handler_4 = () => {
    		set_store_value(filters, $filters.dry = undefined, $filters);
    	};

    	const click_handler_5 = () => {
    		set_store_value(filters, $filters.oily = undefined, $filters);
    	};

    	const click_handler_6 = () => {
    		set_store_value(filters, $filters.normal = undefined, $filters);
    	};

    	const click_handler_7 = () => {
    		set_store_value(filters, $filters.sensitive = undefined, $filters);
    	};

    	const click_handler_8 = () => {
    		set_store_value(filters, $filters.combinaion = undefined, $filters);
    	};

    	$$self.$set = $$props => {
    		if ("drawer" in $$props) $$invalidate(5, drawer = $$props.drawer);
    		if ("filters" in $$props) $$subscribe_filters($$invalidate(0, filters = $$props.filters));
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		Close: Close_button,
    		Rating,
    		BrandOptions: Brand,
    		CategoryOptions: Category,
    		RatingOptions: Rating_1,
    		PricingOptions: Pricing,
    		SkinOptions: Skin,
    		drawer,
    		filters,
    		expanded,
    		drawerContent,
    		brandFilter,
    		categoryFilter,
    		ratingFilter,
    		priceFilter,
    		skinFilter,
    		putInDrawer,
    		formatPriceRange,
    		toggleFilter,
    		$filters
    	});

    	$$self.$inject_state = $$props => {
    		if ("drawer" in $$props) $$invalidate(5, drawer = $$props.drawer);
    		if ("filters" in $$props) $$subscribe_filters($$invalidate(0, filters = $$props.filters));
    		if ("expanded" in $$props) $$invalidate(1, expanded = $$props.expanded);
    		if ("drawerContent" in $$props) drawerContent = $$props.drawerContent;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*expanded*/ 2) {
    			 putInDrawer(expanded);
    		}
    	};

    	return [
    		filters,
    		expanded,
    		$filters,
    		formatPriceRange,
    		toggleFilter,
    		drawer,
    		drawerContent,
    		brandFilter,
    		categoryFilter,
    		ratingFilter,
    		priceFilter,
    		skinFilter,
    		putInDrawer,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8
    	];
    }

    class Filters extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { drawer: 5, filters: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Filters",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*drawer*/ ctx[5] === undefined && !("drawer" in props)) {
    			console.warn("<Filters> was created without expected prop 'drawer'");
    		}

    		if (/*filters*/ ctx[0] === undefined && !("filters" in props)) {
    			console.warn("<Filters> was created without expected prop 'filters'");
    		}
    	}

    	get drawer() {
    		throw new Error("<Filters>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set drawer(value) {
    		throw new Error("<Filters>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get filters() {
    		throw new Error("<Filters>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filters(value) {
    		throw new Error("<Filters>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* web/product-list.svelte generated by Svelte v3.23.0 */
    const file$b = "web/product-list.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    // (60:2) {#each products as product (product.id)}
    function create_each_block$2(key_1, ctx) {
    	let first;
    	let current;
    	const product_spread_levels = [/*product*/ ctx[14]];
    	let product_props = {};

    	for (let i = 0; i < product_spread_levels.length; i += 1) {
    		product_props = assign(product_props, product_spread_levels[i]);
    	}

    	const product = new Product_card({ props: product_props, $$inline: true });

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(product.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(product, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const product_changes = (dirty & /*products*/ 1)
    			? get_spread_update(product_spread_levels, [get_spread_object(/*product*/ ctx[14])])
    			: {};

    			product.$set(product_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(product.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(product.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(product, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(60:2) {#each products as product (product.id)}",
    		ctx
    	});

    	return block;
    }

    // (66:3) {#if drawer}
    function create_if_block$1(ctx) {
    	let t;
    	let current;

    	const filters_1 = new Filters({
    			props: {
    				filters: /*filters*/ ctx[3],
    				drawer: /*drawer*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const sorting_1 = new Sorting({
    			props: { sorting: /*sorting*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(filters_1.$$.fragment);
    			t = space();
    			create_component(sorting_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(filters_1, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(sorting_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const filters_1_changes = {};
    			if (dirty & /*drawer*/ 2) filters_1_changes.drawer = /*drawer*/ ctx[1];
    			filters_1.$set(filters_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(filters_1.$$.fragment, local);
    			transition_in(sorting_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(filters_1.$$.fragment, local);
    			transition_out(sorting_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(filters_1, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(sorting_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(66:3) {#if drawer}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let main;
    	let div0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let infiniteScroll_action;
    	let t0;
    	let div3;
    	let div1;
    	let t1;
    	let div2;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*products*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*product*/ ctx[14].id;
    	validate_each_keys(ctx, each_value, get_each_context$2, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	let if_block = /*drawer*/ ctx[1] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div3 = element("div");
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t1 = space();
    			div2 = element("div");
    			attr_dev(div0, "class", "products hidden-scroll svelte-wtalo5");
    			add_location(div0, file$b, 58, 1, 1579);
    			attr_dev(div1, "class", "list svelte-wtalo5");
    			add_location(div1, file$b, 64, 2, 1749);
    			attr_dev(div2, "class", "drawer hidden-scroll svelte-wtalo5");
    			add_location(div2, file$b, 70, 2, 1872);
    			attr_dev(div3, "class", "filters svelte-wtalo5");
    			add_location(div3, file$b, 63, 1, 1725);
    			attr_dev(main, "class", "svelte-wtalo5");
    			add_location(main, file$b, 57, 0, 1571);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(main, t0);
    			append_dev(main, div3);
    			append_dev(div3, div1);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			/*div2_binding*/ ctx[13](div2);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(infiniteScroll_action = /*infiniteScroll*/ ctx[4].call(null, div0));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*products*/ 1) {
    				const each_value = /*products*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$2, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div0, outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
    				check_outros();
    			}

    			if (/*drawer*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*drawer*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (if_block) if_block.d();
    			/*div2_binding*/ ctx[13](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let $filters;
    	let $sorting;
    	let sorting = writable([]);
    	validate_store(sorting, "sorting");
    	component_subscribe($$self, sorting, value => $$invalidate(10, $sorting = value));
    	let filters = writable({});
    	validate_store(filters, "filters");
    	component_subscribe($$self, filters, value => $$invalidate(9, $filters = value));
    	let loading = false;
    	let products = [];
    	let pages;
    	let currentPage = 0;

    	const fetchProducts = async ({ minPrice, maxPrice, category, ...filters }, [sort, ascending], page = 0) => {
    		currentPage = page;
    		loading = true;

    		const response = await fetch(`/api/cosmetics?${fromRecord({
			page,
			"max-price": maxPrice,
			"min-price": minPrice,
			label: category,
			...filters,
			sort,
			ascending
		})}`);

    		const { data, meta } = await response.json();
    		pages = meta.pages;

    		for (const product of data) {
    			$$invalidate(0, products = products.concat(product));
    			await tick();
    		}

    		loading = false;
    	};

    	const timer = {};
    	
    	let expanded = null;
    	let drawer;

    	const infiniteScroll = node => {
    		const handleScroll = ({ target: { scrollHeight, scrollTop, clientHeight } }) => {
    			if (loading) return;
    			const closeToBottom = scrollHeight - clientHeight * 2 < scrollTop;
    			if (closeToBottom && currentPage + 1 < pages) fetchProducts($filters, sorting, currentPage + 1);
    		};

    		node.addEventListener("scroll", handleScroll);

    		return {
    			destroy: () => node.removeEventListener("sroll", handleScroll)
    		};
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Product_list> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Product_list", $$slots, []);

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, drawer = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		tick,
    		writable,
    		fromRecord,
    		Product: Product_card,
    		Sorting,
    		Filters,
    		sorting,
    		filters,
    		loading,
    		products,
    		pages,
    		currentPage,
    		fetchProducts,
    		timer,
    		expanded,
    		drawer,
    		infiniteScroll,
    		$filters,
    		$sorting
    	});

    	$$self.$inject_state = $$props => {
    		if ("sorting" in $$props) $$invalidate(2, sorting = $$props.sorting);
    		if ("filters" in $$props) $$invalidate(3, filters = $$props.filters);
    		if ("loading" in $$props) loading = $$props.loading;
    		if ("products" in $$props) $$invalidate(0, products = $$props.products);
    		if ("pages" in $$props) pages = $$props.pages;
    		if ("currentPage" in $$props) currentPage = $$props.currentPage;
    		if ("expanded" in $$props) expanded = $$props.expanded;
    		if ("drawer" in $$props) $$invalidate(1, drawer = $$props.drawer);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*timer, $filters, $sorting*/ 1792) {
    			 {
    				clearTimeout(timer.current);

    				$$invalidate(
    					8,
    					timer.current = setTimeout(
    						() => {
    							$$invalidate(0, products = []);
    							fetchProducts($filters, $sorting);
    						},
    						600
    					),
    					timer
    				);
    			}
    		}
    	};

    	return [
    		products,
    		drawer,
    		sorting,
    		filters,
    		infiniteScroll,
    		loading,
    		pages,
    		currentPage,
    		timer,
    		$filters,
    		$sorting,
    		fetchProducts,
    		expanded,
    		div2_binding
    	];
    }

    class Product_list extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Product_list",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* web/ingredients.svelte generated by Svelte v3.23.0 */

    const { Object: Object_1 } = globals;
    const file$c = "web/ingredients.svelte";

    function create_fragment$c(ctx) {
    	let div;
    	let canvas;
    	let Renderer_action;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			canvas = element("canvas");
    			attr_dev(canvas, "class", "svelte-fgnotd");
    			add_location(canvas, file$c, 178, 1, 5873);
    			add_location(div, file$c, 177, 0, 5866);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, canvas);

    			if (!mounted) {
    				dispose = action_destroyer(Renderer_action = /*Renderer*/ ctx[0].call(null, canvas));
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { ingredients } = $$props;

    	const Renderer = canvas => {
    		canvas.width = canvas.parentElement.clientWidth;
    		const createDownScale = (a, b, min, max, o = 2) => w => min + (max - min) - (max - min) * (b * w ** o / (b * (w ** o - a ** o) + a ** o));
    		const createupScale = (a, b, min, max, o = 2) => w => min + (max - min) * (b * w ** o / (b * (w ** o - a ** o) + a ** o));

    		const lense = (i, y) => Number.isNaN(y)
    		? 1
    		: Math.max(1 - ((i - y) / 128) ** 2, 0) + 1;

    		const L = ingredients.length;
    		const ctx = canvas.getContext("2d");
    		const interline = 8;
    		let progress = L;
    		let scrollY = NaN;
    		const axisMargin = 10;
    		const maxTextHeight = createupScale(320, 0.5, 8, 24)(canvas.width);
    		const maxUnderlineThinkness = createupScale(720, 0, 1, 5)(canvas.width);
    		const maxBarWidth = 64;
    		const axis = canvas.width - 64;
    		const textAxis = axis - axisMargin / 2;
    		const barAxis = axis + axisMargin / 2;
    		const textHeight = createDownScale(Math.ceil(L / 8), 0.5, 8, maxTextHeight);
    		const underlineWidth = createDownScale(Math.ceil(L / 8), 0.5, 1, maxUnderlineThinkness);
    		const hue = i => 10 - 130 * ((L - i) / L);
    		const barWidth = i => maxBarWidth * ((L - i) / L) * Math.max(0, Math.min(1, progress - i));
    		const barOpacity = createDownScale(canvas.height / 2, 0.5, 50, 100);
    		const pR = window.devicePixelRatio;
    		const estimatedHeight = 1.05 * ingredients.reduce((top, _, i) => interline + top + lense(top, 128) * textHeight(i), 0);
    		canvas.height = Math.ceil(estimatedHeight);
    		canvas.style.width = `${canvas.width}px`;
    		canvas.style.height = `${canvas.height}px`;
    		canvas.width = Math.ceil(canvas.width * pR);
    		canvas.height = Math.ceil(canvas.height * pR);
    		ctx.scale(pR, pR);

    		const scrollBar = {
    			zone: new Path2D(),
    			set(x, y, width, height) {
    				this.zone = new Path2D();
    				this.zone.rect(x, y, width, height);
    			},
    			isAt(clientX, clientY) {
    				const { x, y } = canvas.getBoundingClientRect();
    				return ctx.isPointInPath(this.zone, (clientX - x) * pR, (clientY - y) * pR);
    			}
    		};

    		const links = {
    			zones: Object.create(null),
    			register(key, x, y, width, height) {
    				this.zones[key] = new Path2D();
    				this.zones[key].rect(x, y, width, height);
    			},
    			findAt(clientX, clientY) {
    				const { x, y } = canvas.getBoundingClientRect();
    				const offsetX = clientX - x;
    				const offsetY = clientY - y;

    				for (const key in this.zones) {
    					if (ctx.isPointInPath(this.zones[key], offsetX * pR, offsetY * pR)) return key;
    				}
    			}
    		};

    		const setPointer = (clientX, clientY) => {
    			const { x, y } = canvas.getBoundingClientRect();
    		};

    		const setScroll = clientY => {
    			const { y } = canvas.getBoundingClientRect();
    			scrollY = clientY - y;
    		};

    		const drawIngredient = (ingredient, height, top, lineWidth) => {
    			ctx.font = `400 ${height}px  Roboto`;
    			ctx.textAlign = "end";
    			ctx.textBaseline = "alphabetic";
    			ctx.strokeStyle = "hsl(209.8, 74.2%, 41%)";
    			ctx.fillStyle = "hsl(209.8, 74.2%, 41%)";
    			ctx.lineWidth = lineWidth;
    			const { width, actualBoundingBoxAscent } = ctx.measureText(ingredient);
    			links.register(ingredient, textAxis - width, top, width, height);
    			ctx.fillText(ingredient, textAxis, top + actualBoundingBoxAscent, textAxis);
    			ctx.beginPath();
    			ctx.moveTo(textAxis - width, lineWidth + top + actualBoundingBoxAscent);
    			ctx.lineTo(textAxis, lineWidth + top + actualBoundingBoxAscent);
    			ctx.stroke();
    		};

    		const drawBar = (height, top, width, h, dL) => {
    			ctx.fillStyle = `hsla(0, 0%, 50%, ${20 + 50 * dL}%)`;
    			ctx.fillRect(barAxis, top, maxBarWidth, height);
    			ctx.fillStyle = `hsla(${h}, 50%, 50%, ${75 + 25 * dL}%)`;
    			ctx.fillRect(barAxis, top, width, height);
    		};

    		function paint() {
    			ctx.clearRect(0, 0, canvas.width / pR, canvas.height / pR);
    			let top = 0;

    			for (let i = 0; i < L; i++) {
    				const ingredient = ingredients[i];
    				const lensing = lense(top, scrollY);
    				const height = lensing * textHeight(i);
    				drawIngredient(ingredient, height, top, underlineWidth(i));
    				drawBar(height, top, barWidth(i), hue(i), lensing - 1);
    				top += height + interline;
    			}

    			// drawCursor();
    			scrollBar.set(barAxis, 0, maxBarWidth, canvas.height / pR);
    		}

    		const captureScroll = (event, clientX, clientY) => {
    			if (scrollBar.isAt(clientX, clientY)) {
    				event.preventDefault();
    				setScroll(clientY);
    				paint();
    			}
    		};

    		const captureCursor = (_, clientX, clientY) => {
    			const focused = links.findAt(clientX, clientY);
    			if (focused) canvas.style.cursor = "pointer"; else canvas.style.cursor = "default";
    		};

    		const handleTouch = event => {
    			const { touches: [{ clientX, clientY }] } = event;
    			captureScroll(event, clientX, clientY);
    			setPointer();
    		};

    		const handleClick = event => {
    			const focused = links.findAt(event.clientX, event.clientY);
    			if (focused) window.open(`https://www.google.com/search?q=${focused}`, "__blank", "noreferrer noopener");
    			captureScroll(event, event.clientX, event.clientY);
    		};

    		const handleHover = event => {
    			captureCursor(event, event.clientX, event.clientY);
    			captureScroll(event, event.clientX, event.clientY);
    		};

    		canvas.addEventListener("mousemove", handleHover);
    		canvas.addEventListener("click", handleClick);
    		canvas.addEventListener("touchmove", handleTouch);
    		canvas.addEventListener("touchstart", handleTouch);

    		const bootstrap = (i = 0) => {
    			if (i >= ingredients.length) return;
    			progress = i;
    			paint();
    			requestAnimationFrame(() => bootstrap(i + 0.1));
    		};

    		bootstrap();
    	};

    	const writable_props = ["ingredients"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Ingredients> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Ingredients", $$slots, []);

    	$$self.$set = $$props => {
    		if ("ingredients" in $$props) $$invalidate(1, ingredients = $$props.ingredients);
    	};

    	$$self.$capture_state = () => ({ onMount, ingredients, Renderer });

    	$$self.$inject_state = $$props => {
    		if ("ingredients" in $$props) $$invalidate(1, ingredients = $$props.ingredients);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [Renderer, ingredients];
    }

    class Ingredients extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { ingredients: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ingredients",
    			options,
    			id: create_fragment$c.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ingredients*/ ctx[1] === undefined && !("ingredients" in props)) {
    			console.warn("<Ingredients> was created without expected prop 'ingredients'");
    		}
    	}

    	get ingredients() {
    		throw new Error("<Ingredients>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ingredients(value) {
    		throw new Error("<Ingredients>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function get_interpolator(a, b) {
        if (a === b || a !== a)
            return () => a;
        const type = typeof a;
        if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
            throw new Error('Cannot interpolate values of different type');
        }
        if (Array.isArray(a)) {
            const arr = b.map((bi, i) => {
                return get_interpolator(a[i], bi);
            });
            return t => arr.map(fn => fn(t));
        }
        if (type === 'object') {
            if (!a || !b)
                throw new Error('Object cannot be null');
            if (is_date(a) && is_date(b)) {
                a = a.getTime();
                b = b.getTime();
                const delta = b - a;
                return t => new Date(a + t * delta);
            }
            const keys = Object.keys(b);
            const interpolators = {};
            keys.forEach(key => {
                interpolators[key] = get_interpolator(a[key], b[key]);
            });
            return t => {
                const result = {};
                keys.forEach(key => {
                    result[key] = interpolators[key](t);
                });
                return result;
            };
        }
        if (type === 'number') {
            const delta = b - a;
            return t => a + t * delta;
        }
        throw new Error(`Cannot interpolate ${type} values`);
    }
    function tweened(value, defaults = {}) {
        const store = writable(value);
        let task;
        let target_value = value;
        function set(new_value, opts) {
            if (value == null) {
                store.set(value = new_value);
                return Promise.resolve();
            }
            target_value = new_value;
            let previous_task = task;
            let started = false;
            let { delay = 0, duration = 400, easing = identity, interpolate = get_interpolator } = assign(assign({}, defaults), opts);
            if (duration === 0) {
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                store.set(value = target_value);
                return Promise.resolve();
            }
            const start = now() + delay;
            let fn;
            task = loop(now => {
                if (now < start)
                    return true;
                if (!started) {
                    fn = interpolate(value, new_value);
                    if (typeof duration === 'function')
                        duration = duration(value, new_value);
                    started = true;
                }
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                const elapsed = now - start;
                if (elapsed > duration) {
                    store.set(value = new_value);
                    return false;
                }
                // @ts-ignore
                store.set(value = fn(easing(elapsed / duration)));
                return true;
            });
            return task.promise;
        }
        return {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe
        };
    }

    /* web/skin-type.svelte generated by Svelte v3.23.0 */

    const file$d = "web/skin-type.svelte";

    // (15:30) 
    function create_if_block_4$1(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "transform", "translate(-145.43 -116.11)");
    			attr_dev(path, "d", "m165.43 116.11a20 20 0 0 0-20 20 20 20 0 0 0 20 20 20 20 0 0 0 20-20 20 20 0 0 0-20-20zm-0.65406 6.6492h1.3104v0.95976c1.2969 0.26327 2.3243 1.2906 2.5875 2.5875h4.2797c0.21473-0.3222 0.58061-0.5369 0.99234-0.5369 0.6531 0 1.1902 0.53873 1.1902 1.1917 0 0.44697-0.25414 0.8349-0.62225 1.0381l5.3008 14.172a0.5242 0.5242 0 0 1 0.0326 0.18466c0 3.1714-2.5816 5.7531-5.7531 5.7531-3.1714-2e-5 -5.7531-2.5817-5.7531-5.7531a0.5242 0.5242 0 0 1 0.031-0.17457l5.0098-14.18c-0.17137-0.0936-0.32018-0.22383-0.42828-0.38561h-4.2797c-0.26304 1.2972-1.2904 2.3249-2.5875 2.5883v17.946h3.8747v1.3104h-9.0622v-1.3104h3.877v-17.946c-1.2971-0.26338-2.3245-1.2911-2.5875-2.5883h-4.282c-0.10757 0.16158-0.25514 0.29192-0.42595 0.38561l5.0106 14.18a0.5242 0.5242 0 0 1 0.0279 0.17457c0 3.1714-2.5817 5.7531-5.7531 5.7531-3.1714 0-5.7538-2.5817-5.7538-5.7531a0.5242 0.5242 0 0 1 0.0334-0.18466l5.3031-14.172c-0.36794-0.20326-0.62224-0.59125-0.62224-1.0381 0-0.65301 0.53709-1.1917 1.1902-1.1917 0.41175 0 0.77603 0.2147 0.99001 0.5369h4.2813c0.26327-1.2969 1.2914-2.3243 2.5883-2.5875zm0.65483 2.1709a2.0311 2.0311 0 0 0-2.0312 2.0312 2.0311 2.0311 0 0 0 2.0312 2.0312 2.0311 2.0311 0 0 0 2.0312-2.0312 2.0311 2.0311 0 0 0-2.0312-2.0312zm-8.5144 1.627c-0.22818 0-0.40423 0.17611-0.40423 0.40423 0 0.22826 0.17605 0.40423 0.40423 0.40423 0.22821 0 0.40423-0.17597 0.40423-0.40423 0-0.22812-0.17602-0.40423-0.40423-0.40423zm17.03 0c-0.2282 0-0.40423 0.17611-0.40423 0.40423 0 0.22826 0.17603 0.40423 0.40423 0.40423s0.40423-0.17597 0.40423-0.40423c0-0.22812-0.17603-0.40423-0.40423-0.40423zm-17.043 2.9561-4.5606 12.187h8.8674zm17.056 0-4.3076 12.187h8.869zm-21.836 13.498c0.31776 2.2912 2.2613 4.0516 4.642 4.0516 2.3809 0 4.3293-1.7602 4.6475-4.0516zm17.327 0c0.31786 2.2914 2.2635 4.0516 4.6444 4.0516 2.3807 0 4.327-1.7604 4.6451-4.0516z");
    			attr_dev(path, "fill", "#4040c0");
    			attr_dev(path, "fill-rule", "evenodd");
    			add_location(path, file$d, 15, 3, 10310);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(15:30) ",
    		ctx
    	});

    	return block;
    }

    // (13:35) 
    function create_if_block_3$1(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "transform", "translate(-131.82 -132.74)");
    			attr_dev(path, "d", "m151.82 132.74a20 20 0 0 0-20 20 20 20 0 0 0 20 20 20 20 0 0 0 20-20 20 20 0 0 0-20-20zm0.585 2.6806 5e-3 7.7e-4c0.0985 0.0934 0.19711 0.18655 0.29561 0.28009 0.87296 0.82884 1.7441 1.6597 2.6224 2.4828v19.695h1.2608l0.31655-0.30026 0.5338-0.50509 0.2025-0.18854v-7.8254l0.9357-0.88449 0.64786-0.61449 0.92949-0.87906 1.3578 1.2848 0.70061 0.66259 0.45466 0.43061v9.5673l-1.0086 0.9551-0.57492 0.54388-1.5572 1.4734-0.40423 0.38328-0.75104 0.70992h-3.0437v7.3677h-3.0011c-6.1173 0-11.355-4.7767-11.355-11.435 0-2.7198 0.51337-5.2484 2.0933-8.6432 1.5799-3.3948 4.1664-7.6245 8.4647-14.131 0.21238-0.30193 0.45231-0.4321 0.87518-0.4306zm0.30027 2.8156v1.5409h-0.6013v-1.4757c-3.5974 5.5032-6.0471 9.5218-7.4057 12.441-1.5018 3.2269-1.9249 5.3783-1.9249 7.8828 0 5.7275 4.3579 9.6332 9.5533 9.6332l1.6487 0.0248v-6.8696h3.8359l0.35457-0.33595 0.40501-0.38018 1.5572-1.4765 0.57492-0.54078 0.61294-0.58268v-8.5082l-0.059-0.0582-0.70061-0.66259-0.4019-0.37785-0.62225 0.58811-0.53923 0.51052v7.8231l-0.5982 0.56561-0.53379 0.5051-0.71225 0.67423h-3.1733v-19.652zm-0.6013 2.1321h0.6013v1.7705h-0.6013v-1.4765zm0 2.3618h0.6013v1.7713h-0.6013v-1.4772zm0 2.3625h0.6013v1.7736h-0.6013v-1.4773zm0 2.3618h0.6013v1.7736h-0.6013v-1.4765zm0 2.3648h0.6013v1.7713h-0.6013v-1.4772zm0 2.3625h0.6013v1.7705h-0.6013v-1.4765zm0 2.3618h0.6013v1.7705h-0.6013v-1.4765zm0 2.3617h0.6013v1.7736h-0.6013v-1.4765zm-4.9198 1.056c0.27704-0.0247 0.51666 0.14843 0.42673 0.75803-0.0941 0.63852-0.0908 1.8512 0.47871 2.7706 0.66673 1.0936 1.4192 1.6239 2.9824 2.7466 1.2506 0.72213 0.57409 1.4626-0.60208 0.7526-1.1762-0.71004-2.61-1.7499-3.3603-2.558-0.75031-0.80816-1.1315-1.4236-1.3042-2.0064-0.2132-0.73552 0.27196-1.7478 0.90234-2.257 0.13023-0.10518 0.31013-0.19137 0.47638-0.20639zm4.9198 1.3066h0.6013v1.7736h-0.6013v-1.4765zm0 2.3648h0.6013v1.7705h-0.6013v-1.4765zm0 2.3618h0.6013v1.7713h-0.6013v-1.4773zm0 2.3625h0.6013v1.7705h-0.6013v-1.4765z");
    			attr_dev(path, "fill", "#4040c0");
    			attr_dev(path, "fill-rule", "evenodd");
    			add_location(path, file$d, 13, 3, 8270);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(13:35) ",
    		ctx
    	});

    	return block;
    }

    // (11:28) 
    function create_if_block_2$1(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "transform", "translate(-131.07 -42.779) matrix(.26458 0 0 .26458 131.07 42.779)");
    			attr_dev(path, "d", "m75.59 0a75.591 75.591 0 0 0-75.59 75.59 75.591 75.591 0 0 0 75.59 75.592 75.591 75.591 0 0 0 75.592-75.592 75.591 75.591 0 0 0-75.592-75.59zm-0.042969 10.043a3.4051 3.4051 0 0 1 2.8848 1.5273c16.245 24.591 26.193 40.853 32.164 53.684 5.9714 12.831 7.9102 22.388 7.9102 32.668 0 25.164-19.796 43.217-42.916 43.217-23.121 0-42.916-18.053-42.916-43.217 0-10.28 1.9408-19.837 7.9121-32.668 5.9713-12.831 15.919-29.093 32.164-53.684a3.4051 3.4051 0 0 1 2.7969-1.5273zm0.044922 9.7383c-14.185 21.644-23.564 37.026-28.832 48.346-5.6761 12.196-7.2754 20.329-7.2754 29.795 0 21.647 16.471 36.408 36.107 36.408 19.636 0 36.107-14.761 36.107-36.408 0-9.4661-1.5993-17.599-7.2754-29.795-5.2683-11.32-14.647-26.701-28.832-48.346zm-19.436 75.465c1.0471-0.093268 1.9531 0.5612 1.6133 2.8652-0.35577 2.4133-0.34377 6.9997 1.8086 10.475 2.52 4.1333 5.3633 6.1356 11.271 10.379 4.7268 2.7291 2.1701 5.5274-2.2754 2.8438-4.4454-2.6836-9.8634-6.6135-12.699-9.668-2.8358-3.0545-4.2768-5.3814-4.9297-7.584-0.80572-2.7799 1.0296-6.6085 3.4121-8.5332 0.49217-0.39758 1.1706-0.72118 1.7988-0.77734z");
    			attr_dev(path, "fill", "#4040c0");
    			attr_dev(path, "fill-rule", "evenodd");
    			add_location(path, file$d, 11, 3, 7030);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(11:28) ",
    		ctx
    	});

    	return block;
    }

    // (9:33) 
    function create_if_block_1$1(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "transform", "translate(-122.75 -44.291)");
    			attr_dev(path, "d", "m142.75 44.291a20 20 0 0 0-20 20 20 20 0 0 0 20 20 20 20 0 0 0 20-20 20 20 0 0 0-7.0705-15.255l0.0489 0.23742c0.64895 3.2539 0.0814 5.2249-1.388 6.681-0.15985 0.15843-0.31812 0.29656-0.47406 0.42207 0.41873 0.37945 0.57367 1.2694-0.10939 2.5154-0.94626 1.7262-2.5996 4.1078-4.3356 5.7802-0.40978 0.39478-0.961 0.58447-1.5603 0.65173 0.046 0.32507-0.27103 0.70706-0.5338 0.92561-0.77336 0.64322-1.3519 1.0263-2.0568 1.4974-0.71379 0.47708-1.4003 1.0245-2.1973 1.3438-0.79148 0.31706-1.6212 0.58813-2.4649 0.75337 0.0456 0.41494-0.0916 0.80007-0.3538 1.0699-1.7807 1.8326-5.2036 3.1265-5.6933 2.8001-0.0311-0.02055-0.059-0.05353-0.0884-0.08069-0.46395 2.0084-0.60869 3.9562-0.6207 5.615l-2e-3 0.2025c0.0141 0.07457 0.0295 0.15595 0.0295 0.15595l-0.031 0.0016h-7e-3l-0.78052 0.02948-0.88217-0.30181 0.0109-0.3569s0.0637-4.2652-2.4324-6.1395c-0.10577-0.07935-0.20173-0.19466-0.23897-0.35457-0.0372-0.15989 0.0126-0.34636 0.1094-0.47018 0.19379-0.24758 0.48466-0.34183 0.91242-0.40656 0.53039-0.08015 0.99673 0.03364 1.3586 0.20716-0.41423-0.67914-0.89275-1.367-0.90776-2.0987-7e-3 -0.63379 0.37563-1.0645 0.95664-1.0358 0.0287 0.0015 0.059 0.01287 0.0884 0.01707-0.03-0.3086-7e-3 -0.64095 0.10397-0.97449 0.29088-0.87298 0.88519-2.2763 2.0615-3.8762 0.11553-0.14294 0.26019-0.26746 0.46707-0.29095 0.0168-0.0015 0.0325 0.0025 0.0489 0.0023 0.0597-0.2856 0.17216-0.57876 0.36544-0.84725 0.50612-0.70312 1.4333-1.7973 2.939-2.9056 0.14391-0.09611 0.30868-0.16798 0.50122-0.13112 0.0104 0.0015 0.0197 0.0074 0.0287 0.01009 0.10298-0.16093 0.22807-0.315 0.38328-0.45233 0.64868-0.57426 1.7947-1.4373 3.5077-2.1864 0.16151-0.06211 0.33787-0.09544 0.51751-0.01707h7.7e-4c0.0317 0.0138 0.0569 0.03411 0.0838 0.05354 0.0305-0.02548 0.056-0.05296 0.0884-0.07759 0.86186-0.65546 2.2752-1.7545 4.5862-2.7163 0.21829-0.08205 0.4581-0.13726 0.70759-0.08069 0.13669 0.03085 0.23931 0.09583 0.31423 0.17069 0.17844-0.40716 0.40206-0.84102 0.69518-1.267 0.99926-1.4522 3.1485-3.7447 5.8912-4.1206l0.25449-0.03647a20 20 0 0 0-12.832-4.6638zm12.832 4.6638a20 20 0 0 1 0.097 0.08147l-0.0194-0.09233zm-0.56328 0.91475c-2.1336 0.47134-4.1529 2.7164-4.9423 3.4573-0.39087 0.36683-0.8607 1.0653-1.236 1.6774-0.0824 0.39614-0.26603 0.90632-0.32819 1.1025-0.18193 0.57305-1.0847 2.1546-1.0847 2.1546s1.2528-3.6871-0.21724-2.7699c-2.4206 1.2297-2.4731 1.2169-3.7203 1.9086-0.0755 0.04199-0.14625 0.08943-0.21337 0.14121-6e-3 0.36298-0.24976 1.1348-0.31733 1.3826-0.15125 0.55315-0.86044 2.0444-0.86044 2.0444s0.45318-1.5644 0.43682-2.3881c-0.32994 0.79983-0.35535 1.6464-0.35535 1.6464s-0.14498-1.0004-0.11871-1.3244c0.013-0.16083 0.0655-0.46821 0.21957-0.81699-0.0672 5e-3 -0.14876 0.03898-0.24905 0.11017-1.8016 1.0055-1.8398 0.98754-2.7699 1.5634-0.13256 0.08206-0.24149 0.17594-0.33518 0.27699 0.10495 0.25066 0.10197 0.50671 0.0884 0.77897-0.0258 0.57291-0.15827 1.1863-0.15827 1.1863s0.0693-1.194-0.20483-1.5378c-0.25876 0.56542-0.22681 1.2589-0.26225 1.8698l-0.0853-0.32742s-0.1021-0.39835-0.1482-0.86044c-9e-3 -0.17589 6e-3 -0.40279 0.0605-0.64785-1.396 0.95216-2.223 1.9545-2.6992 2.655-0.13838 0.20368-0.22814 0.43965-0.2894 0.69052 0.15844 0.21053 0.23165 0.45372 0.30026 0.7138 0.15504 0.589 0.21414 1.253 0.21414 1.253s-0.25891-1.0387-0.60052-1.4121c-0.0341 0.48666 0.0161 0.99851 0.0923 1.4586l-0.15595-0.30104s-0.18679-0.36558-0.33363-0.80613c-0.0273-0.09737-0.0486-0.21616-0.0636-0.34449-1.1606 1.4398-1.6933 2.7509-1.9598 3.6287-0.0923 0.30416-0.10135 0.63354-0.0605 0.96906 0.40879 0.3276 0.81654 0.89122 1.087 1.6301l0.0877 0.34914s-0.50671-0.79568-1.0404-1.3423c0.12403 0.42744 0.30387 0.84804 0.49345 1.2243l-0.25293-0.25604s-0.30526-0.31119-0.59354-0.71147c-0.11663-0.17894-0.23661-0.43806-0.31888-0.74018-0.03-0.0076-0.061-0.01801-0.0892-0.0194-0.66173-0.03989-0.58181 0.75865-0.27931 1.416 0.18419 0.39448 0.43562 1.0075 0.61526 1.5626 0.0444 0.03758 0.0868 0.07541 0.12182 0.11172 0.32098 0.33164 0.65328 1.1654 0.65328 1.1654s-0.22638-0.23877-0.57647-0.49345c0.0363 0.2455 0.0252 0.42506-0.0753 0.4632-1e-3 -0.19998-0.0454-0.39869-0.11406-0.59664-0.46475-0.30005-1.0899-0.57024-1.7317-0.44768-0.24603 0.03731-0.27945 0.07505-0.32974 0.10164 1.4551 1.1865 2.3667 3.1459 2.9041 4.7212 0.10565-1.3717 0.32365-2.8566 0.72932-4.3682-0.13121-0.32842-0.20949-0.61371-0.20949-0.61371 0.0915 0.1259 0.18458 0.24979 0.27932 0.37319 1.0224-3.6337 3.1501-7.3801 7.4848-9.987 3.5168-2.115 6.4496-4.2758 8.5276-6.0875 1.039-0.90587 1.6833-1.5465 2.4378-2.4021 0.48638-0.55153 1.3392-1.7527 1.3392-1.7527s-0.79827 1.8373-1.3741 2.648c-0.54289 0.76434-1.2238 1.4289-1.9304 2.0452-2.6645 2.3242-5.0817 4.0297-8.6323 6.1651-4.323 2.5998-6.3617 6.3626-7.2924 9.9847 0.74601 0.37329 3.607-1.2817 3.607-1.2817 2.2559-1.3672 2.1465-2.119-0.34061-1.2034 0 0 0.44269-0.3421 1.0133-0.6494-0.0153-2.39e-4 -0.0308 0.0011-0.0458 7.76e-4 -0.6473-0.01454-1.8784-0.49578-1.8784-0.49578s0.94163 0.04977 1.4121 0.03336c1.4971-0.05222 3.0305-0.2521 4.4838-0.99156 0.72675-0.34186 1.4132-0.77074 2.0685-1.2352 0.70414-0.49906 1.844-1.4161 1.9886-1.6588 0.24634-0.41344-1.904-0.34759-1.904-0.34759s0.50182-0.07159 0.86897-0.12647c-1.3053-0.26708-2.4029-0.7619-2.4029-0.7619 4.292 0.3493 4.663 0.21236 5.93-1.0404 1.267-1.2528 3.2632-4.0274 3.6885-4.8554 0.42534-0.82797 0.53628-1.1713 0.26922-1.5688-0.0391-0.05839-0.10904-0.08883-0.19552-0.10009-0.93893 0.5303-1.6464 0.53302-1.6464 0.53302 0.18005-0.46336 0.88993-1.0363 1.5742-1.1863 0.26513-0.23254 0.52103-0.47884 0.72466-0.72466 0.77678-0.93781 1.6357-2.8658 1.222-5.615z");
    			attr_dev(path, "fill", "#4040c0");
    			attr_dev(path, "fill-rule", "evenodd");
    			add_location(path, file$d, 9, 3, 1424);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(9:33) ",
    		ctx
    	});

    	return block;
    }

    // (7:2) {#if type === "dry"}
    function create_if_block$2(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "transform", "translate(4.2495 12.405)");
    			attr_dev(path, "d", "m15.751-12.405a20 20 0 0 0-20 20 20 20 0 0 0 20 20 20 20 0 0 0 20-20 20 20 0 0 0-20-20zm0.0039 1.6976c0.86698 0.86988 1.9299 1.94 2.918 2.9204v20.811h1.2608c0.35042-0.35043 0.69977-0.70201 1.0529-1.0498v-8.2692l2.513-2.513c0.83769 0.83769 1.6754 1.6754 2.513 2.513v10.111l-4.296 4.296h-3.0437v7.7851h-5.8446v-14.495h-3.0437c-1.2178-1.2134-2.7888-2.7902-4.296-4.296v-10.111c0.74485-0.74701 1.667-1.6701 2.513-2.5154 0.74512 0.74512 1.666 1.6636 2.513 2.5154v8.27c0.35693 0.35116 0.67392 0.6656 1.0645 1.0529h1.2523v-14.105c0.86805-0.86246 1.9246-1.9234 2.9235-2.9204zm-0.0031 1.9117c-0.52282 0.52303-1.0449 1.047-1.5688 1.5688v14.894h-3.1726c-0.53457-0.53273-1.219-1.2221-1.8473-1.8442v-8.2692c-0.34589-0.34589-0.77449-0.77451-1.1615-1.1615-0.38757 0.38757-0.77478 0.77536-1.1638 1.1615v8.9931c1.0435 1.0384 2.317 2.3224 3.5069 3.5046h3.8351v14.495h3.1407v-7.7859h3.8359c1.0703-1.0696 2.3218-2.3163 3.5046-3.5038v-8.9908l-0.058966-0.061294c-0.36705-0.36703-0.73348-0.73513-1.1025-1.1002-0.38709 0.38708-0.7744 0.77439-1.1615 1.1615v8.2661c-0.61484 0.61482-1.2294 1.2302-1.8442 1.845h-3.1733v-21.603l-0.01707-0.017845c-0.51854-0.51563-1.0354-1.0331-1.5517-1.551z");
    			attr_dev(path, "fill", "#4040c0");
    			attr_dev(path, "fill-rule", "evenodd");
    			add_location(path, file$d, 7, 3, 142);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(7:2) {#if type === \\\"dry\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let div1;
    	let svg;
    	let t0;
    	let div0;
    	let t1;

    	function select_block_type(ctx, dirty) {
    		if (/*type*/ ctx[0] === "dry") return create_if_block$2;
    		if (/*type*/ ctx[0] === "sensitive") return create_if_block_1$1;
    		if (/*type*/ ctx[0] === "oily") return create_if_block_2$1;
    		if (/*type*/ ctx[0] === "combination") return create_if_block_3$1;
    		if (/*type*/ ctx[0] === "normal") return create_if_block_4$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			svg = svg_element("svg");
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			t1 = text(/*type*/ ctx[0]);
    			attr_dev(svg, "width", "100%");
    			attr_dev(svg, "height", "50px");
    			attr_dev(svg, "viewBox", "0 0 40 40");
    			add_location(svg, file$d, 5, 1, 62);
    			attr_dev(div0, "class", "caption svelte-1vr6i5n");
    			add_location(div0, file$d, 19, 1, 12235);
    			attr_dev(div1, "class", "container svelte-1vr6i5n");
    			add_location(div1, file$d, 4, 0, 37);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, svg);
    			if (if_block) if_block.m(svg, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, t1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(svg, null);
    				}
    			}

    			if (dirty & /*type*/ 1) set_data_dev(t1, /*type*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { type } = $$props;
    	const writable_props = ["type"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Skin_type> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Skin_type", $$slots, []);

    	$$self.$set = $$props => {
    		if ("type" in $$props) $$invalidate(0, type = $$props.type);
    	};

    	$$self.$capture_state = () => ({ type });

    	$$self.$inject_state = $$props => {
    		if ("type" in $$props) $$invalidate(0, type = $$props.type);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [type];
    }

    class Skin_type extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { type: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Skin_type",
    			options,
    			id: create_fragment$d.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*type*/ ctx[0] === undefined && !("type" in props)) {
    			console.warn("<Skin_type> was created without expected prop 'type'");
    		}
    	}

    	get type() {
    		throw new Error("<Skin_type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Skin_type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* web/product-details.svelte generated by Svelte v3.23.0 */
    const file$e = "web/product-details.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (61:1) {:catch error}
    function create_catch_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(61:1) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (24:1) {:then product}
    function create_then_block(ctx) {
    	let div0;
    	let a;
    	let t1;
    	let div6;
    	let div5;
    	let h1;
    	let t2_value = /*product*/ ctx[3].name + "";
    	let t2;
    	let t3;
    	let div1;
    	let t4_value = /*product*/ ctx[3].category + "";
    	let t4;
    	let t5;
    	let div2;
    	let t6;
    	let strong;
    	let t7_value = /*product*/ ctx[3].brand + "";
    	let t7;
    	let t8;
    	let div3;
    	let t9_value = /*product*/ ctx[3].price + "";
    	let t9;
    	let t10;
    	let t11;
    	let div4;
    	let t12;
    	let div8;
    	let h20;
    	let t14;
    	let div7;
    	let t15;
    	let t16;
    	let t17;
    	let t18;
    	let t19;
    	let div10;
    	let h21;
    	let t21;
    	let div9;
    	let t22;
    	let div12;
    	let h22;
    	let t24;
    	let div11;
    	let current;

    	const rating = new Rating({
    			props: { value: /*product*/ ctx[3].rating },
    			$$inline: true
    		});

    	let if_block0 = /*product*/ ctx[3].dry && create_if_block_4$2(ctx);
    	let if_block1 = /*product*/ ctx[3].sensitive && create_if_block_3$2(ctx);
    	let if_block2 = /*product*/ ctx[3].oily && create_if_block_2$2(ctx);
    	let if_block3 = /*product*/ ctx[3].combination && create_if_block_1$2(ctx);
    	let if_block4 = /*product*/ ctx[3].normal && create_if_block$3(ctx);
    	let each_value = /*product*/ ctx[3].similars.concat(/*product*/ ctx[3].similars).concat(/*product*/ ctx[3].similars);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const ingredients = new Ingredients({
    			props: {
    				ingredients: /*product*/ ctx[3].ingredients
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			a = element("a");
    			a.textContent = "‹ back to listing";
    			t1 = space();
    			div6 = element("div");
    			div5 = element("div");
    			h1 = element("h1");
    			t2 = text(t2_value);
    			t3 = space();
    			div1 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			div2 = element("div");
    			t6 = text("by ");
    			strong = element("strong");
    			t7 = text(t7_value);
    			t8 = space();
    			div3 = element("div");
    			t9 = text(t9_value);
    			t10 = text("$");
    			t11 = space();
    			div4 = element("div");
    			create_component(rating.$$.fragment);
    			t12 = space();
    			div8 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Suitable for skins";
    			t14 = space();
    			div7 = element("div");
    			if (if_block0) if_block0.c();
    			t15 = space();
    			if (if_block1) if_block1.c();
    			t16 = space();
    			if (if_block2) if_block2.c();
    			t17 = space();
    			if (if_block3) if_block3.c();
    			t18 = space();
    			if (if_block4) if_block4.c();
    			t19 = space();
    			div10 = element("div");
    			h21 = element("h2");
    			h21.textContent = "With similar ingredients";
    			t21 = space();
    			div9 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t22 = space();
    			div12 = element("div");
    			h22 = element("h2");
    			h22.textContent = "Explore the ingredients";
    			t24 = space();
    			div11 = element("div");
    			create_component(ingredients.$$.fragment);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "svelte-7dnvx5");
    			add_location(a, file$e, 25, 3, 606);
    			attr_dev(div0, "class", "back svelte-7dnvx5");
    			add_location(div0, file$e, 24, 2, 584);
    			attr_dev(h1, "class", "name svelte-7dnvx5");
    			add_location(h1, file$e, 29, 4, 712);
    			attr_dev(div1, "class", "category svelte-7dnvx5");
    			add_location(div1, file$e, 30, 4, 753);
    			attr_dev(strong, "class", "svelte-7dnvx5");
    			add_location(strong, file$e, 31, 26, 826);
    			attr_dev(div2, "class", "brand svelte-7dnvx5");
    			add_location(div2, file$e, 31, 4, 804);
    			attr_dev(div3, "class", "price svelte-7dnvx5");
    			add_location(div3, file$e, 32, 4, 860);
    			attr_dev(div4, "class", "rating svelte-7dnvx5");
    			add_location(div4, file$e, 33, 4, 906);
    			attr_dev(div5, "class", "content svelte-7dnvx5");
    			add_location(div5, file$e, 28, 3, 686);
    			attr_dev(div6, "class", "details container svelte-7dnvx5");
    			add_location(div6, file$e, 27, 2, 651);
    			attr_dev(h20, "class", "header svelte-7dnvx5");
    			add_location(h20, file$e, 37, 3, 1024);
    			attr_dev(div7, "class", "content hidden-scroll svelte-7dnvx5");
    			add_location(div7, file$e, 38, 3, 1071);
    			attr_dev(div8, "class", "skin-types container svelte-7dnvx5");
    			add_location(div8, file$e, 36, 2, 986);
    			attr_dev(h21, "class", "header svelte-7dnvx5");
    			add_location(h21, file$e, 47, 3, 1446);
    			attr_dev(div9, "class", "content hidden-scroll svelte-7dnvx5");
    			add_location(div9, file$e, 48, 3, 1498);
    			attr_dev(div10, "class", "similars container svelte-7dnvx5");
    			add_location(div10, file$e, 46, 2, 1409);
    			attr_dev(h22, "class", "header svelte-7dnvx5");
    			add_location(h22, file$e, 55, 3, 1743);
    			attr_dev(div11, "class", "canvas svelte-7dnvx5");
    			add_location(div11, file$e, 56, 3, 1794);
    			attr_dev(div12, "class", "ingredients container svelte-7dnvx5");
    			add_location(div12, file$e, 54, 2, 1704);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, a);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			append_dev(div5, h1);
    			append_dev(h1, t2);
    			append_dev(div5, t3);
    			append_dev(div5, div1);
    			append_dev(div1, t4);
    			append_dev(div5, t5);
    			append_dev(div5, div2);
    			append_dev(div2, t6);
    			append_dev(div2, strong);
    			append_dev(strong, t7);
    			append_dev(div5, t8);
    			append_dev(div5, div3);
    			append_dev(div3, t9);
    			append_dev(div3, t10);
    			append_dev(div5, t11);
    			append_dev(div5, div4);
    			mount_component(rating, div4, null);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, div8, anchor);
    			append_dev(div8, h20);
    			append_dev(div8, t14);
    			append_dev(div8, div7);
    			if (if_block0) if_block0.m(div7, null);
    			append_dev(div7, t15);
    			if (if_block1) if_block1.m(div7, null);
    			append_dev(div7, t16);
    			if (if_block2) if_block2.m(div7, null);
    			append_dev(div7, t17);
    			if (if_block3) if_block3.m(div7, null);
    			append_dev(div7, t18);
    			if (if_block4) if_block4.m(div7, null);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, div10, anchor);
    			append_dev(div10, h21);
    			append_dev(div10, t21);
    			append_dev(div10, div9);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div9, null);
    			}

    			insert_dev(target, t22, anchor);
    			insert_dev(target, div12, anchor);
    			append_dev(div12, h22);
    			append_dev(div12, t24);
    			append_dev(div12, div11);
    			mount_component(ingredients, div11, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*productRequest*/ 1) && t2_value !== (t2_value = /*product*/ ctx[3].name + "")) set_data_dev(t2, t2_value);
    			if ((!current || dirty & /*productRequest*/ 1) && t4_value !== (t4_value = /*product*/ ctx[3].category + "")) set_data_dev(t4, t4_value);
    			if ((!current || dirty & /*productRequest*/ 1) && t7_value !== (t7_value = /*product*/ ctx[3].brand + "")) set_data_dev(t7, t7_value);
    			if ((!current || dirty & /*productRequest*/ 1) && t9_value !== (t9_value = /*product*/ ctx[3].price + "")) set_data_dev(t9, t9_value);
    			const rating_changes = {};
    			if (dirty & /*productRequest*/ 1) rating_changes.value = /*product*/ ctx[3].rating;
    			rating.$set(rating_changes);

    			if (/*product*/ ctx[3].dry) {
    				if (if_block0) {
    					if (dirty & /*productRequest*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_4$2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div7, t15);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*product*/ ctx[3].sensitive) {
    				if (if_block1) {
    					if (dirty & /*productRequest*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_3$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div7, t16);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*product*/ ctx[3].oily) {
    				if (if_block2) {
    					if (dirty & /*productRequest*/ 1) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_2$2(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div7, t17);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*product*/ ctx[3].combination) {
    				if (if_block3) {
    					if (dirty & /*productRequest*/ 1) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block_1$2(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(div7, t18);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (/*product*/ ctx[3].normal) {
    				if (if_block4) {
    					if (dirty & /*productRequest*/ 1) {
    						transition_in(if_block4, 1);
    					}
    				} else {
    					if_block4 = create_if_block$3(ctx);
    					if_block4.c();
    					transition_in(if_block4, 1);
    					if_block4.m(div7, null);
    				}
    			} else if (if_block4) {
    				group_outros();

    				transition_out(if_block4, 1, 1, () => {
    					if_block4 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*productRequest*/ 1) {
    				each_value = /*product*/ ctx[3].similars.concat(/*product*/ ctx[3].similars).concat(/*product*/ ctx[3].similars);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div9, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			const ingredients_changes = {};
    			if (dirty & /*productRequest*/ 1) ingredients_changes.ingredients = /*product*/ ctx[3].ingredients;
    			ingredients.$set(ingredients_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rating.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(if_block4);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(ingredients.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rating.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(if_block4);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(ingredients.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div6);
    			destroy_component(rating);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(div8);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (detaching) detach_dev(t19);
    			if (detaching) detach_dev(div10);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t22);
    			if (detaching) detach_dev(div12);
    			destroy_component(ingredients);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(24:1) {:then product}",
    		ctx
    	});

    	return block;
    }

    // (40:4) {#if product.dry}
    function create_if_block_4$2(ctx) {
    	let current;
    	const skintype = new Skin_type({ props: { type: "dry" }, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(skintype.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(skintype, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skintype.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skintype.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(skintype, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$2.name,
    		type: "if",
    		source: "(40:4) {#if product.dry}",
    		ctx
    	});

    	return block;
    }

    // (41:4) {#if product.sensitive}
    function create_if_block_3$2(ctx) {
    	let current;

    	const skintype = new Skin_type({
    			props: { type: "sensitive" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(skintype.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(skintype, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skintype.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skintype.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(skintype, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$2.name,
    		type: "if",
    		source: "(41:4) {#if product.sensitive}",
    		ctx
    	});

    	return block;
    }

    // (42:4) {#if product.oily}
    function create_if_block_2$2(ctx) {
    	let current;
    	const skintype = new Skin_type({ props: { type: "oily" }, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(skintype.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(skintype, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skintype.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skintype.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(skintype, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(42:4) {#if product.oily}",
    		ctx
    	});

    	return block;
    }

    // (43:4) {#if product.combination}
    function create_if_block_1$2(ctx) {
    	let current;

    	const skintype = new Skin_type({
    			props: { type: "combination" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(skintype.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(skintype, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skintype.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skintype.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(skintype, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(43:4) {#if product.combination}",
    		ctx
    	});

    	return block;
    }

    // (44:4) {#if product.normal}
    function create_if_block$3(ctx) {
    	let current;

    	const skintype = new Skin_type({
    			props: { type: "normal" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(skintype.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(skintype, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skintype.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skintype.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(skintype, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(44:4) {#if product.normal}",
    		ctx
    	});

    	return block;
    }

    // (50:4) {#each product.similars.concat(product.similars).concat(product.similars) as similar}
    function create_each_block$3(ctx) {
    	let current;
    	const productcard_spread_levels = [{ margin: "16px" }, /*similar*/ ctx[4]];
    	let productcard_props = {};

    	for (let i = 0; i < productcard_spread_levels.length; i += 1) {
    		productcard_props = assign(productcard_props, productcard_spread_levels[i]);
    	}

    	const productcard = new Product_card({ props: productcard_props, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(productcard.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(productcard, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const productcard_changes = (dirty & /*productRequest*/ 1)
    			? get_spread_update(productcard_spread_levels, [productcard_spread_levels[0], get_spread_object(/*similar*/ ctx[4])])
    			: {};

    			productcard.$set(productcard_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(productcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(productcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(productcard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(50:4) {#each product.similars.concat(product.similars).concat(product.similars) as similar}",
    		ctx
    	});

    	return block;
    }

    // (23:24)   {:then product}
    function create_pending_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(23:24)   {:then product}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let main;
    	let promise;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 3,
    		error: 7,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*productRequest*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			main = element("main");
    			info.block.c();
    			attr_dev(main, "class", "product svelte-7dnvx5");
    			add_location(main, file$e, 20, 0, 516);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			info.block.m(main, info.anchor = null);
    			info.mount = () => main;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty & /*productRequest*/ 1 && promise !== (promise = /*productRequest*/ ctx[0]) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[3] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { id } = $$props;

    	const fetchProduct = async () => {
    		const response = await fetch(`/api/cosmetic?${fromRecord({ id })}`);
    		return response.json();
    	};

    	const writable_props = ["id"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Product_details> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Product_details", $$slots, []);

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    	};

    	$$self.$capture_state = () => ({
    		fromRecord,
    		onMount,
    		ProductCard: Product_card,
    		Ingredients,
    		tweened,
    		Rating,
    		SkinType: Skin_type,
    		id,
    		fetchProduct,
    		productRequest
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("productRequest" in $$props) $$invalidate(0, productRequest = $$props.productRequest);
    	};

    	let productRequest;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*id*/ 2) {
    			 $$invalidate(0, productRequest = fetchProduct());
    		}
    	};

    	return [productRequest, id];
    }

    class Product_details extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { id: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Product_details",
    			options,
    			id: create_fragment$e.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[1] === undefined && !("id" in props)) {
    			console.warn("<Product_details> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<Product_details>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Product_details>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* web/main.svelte generated by Svelte v3.23.0 */

    // (13:0) {:else }
    function create_else_block(ctx) {
    	let current;
    	const products = new Product_list({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(products.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(products, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(products.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(products.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(products, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(13:0) {:else }",
    		ctx
    	});

    	return block;
    }

    // (11:0) {#if $id}
    function create_if_block$4(ctx) {
    	let current;

    	const product = new Product_details({
    			props: { id: /*$id*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(product.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(product, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const product_changes = {};
    			if (dirty & /*$id*/ 1) product_changes.id = /*$id*/ ctx[0];
    			product.$set(product_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(product.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(product.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(product, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(11:0) {#if $id}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$f(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$4, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$id*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let $id;
    	validate_store(id, "id");
    	component_subscribe($$self, id, $$value => $$invalidate(0, $id = $$value));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Main> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Main", $$slots, []);
    	$$self.$capture_state = () => ({ Products: Product_list, Product: Product_details, id, onMount, $id });
    	return [$id];
    }

    class Main extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Main",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    const app = new Main({ target: document.body });

    return app;

}());
//# sourceMappingURL=index.js.map
