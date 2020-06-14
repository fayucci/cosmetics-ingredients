<script>
	import { onMount } from 'svelte';
	export let width;
	export let height;

	export let ingredients;


	let canvas;
	
	const createDownScale = (a, b, min, max, o = 2) => (w) => (min + (max-min) - (max-min)*((b * w ** o) / (b * (w ** o - a ** o) + a ** o)));
	const createupScale = (a, b, min, max, o = 2) => (w) => (min + (max-min)*((b * w ** o) / (b * (w ** o - a ** o) + a ** o)));
	const lense = (i, y) => Number.isNaN(y) ? 1 : Math.max(1 - ((i - y) / 128)**2, 0) + 1;


	const createRenderer = () => {
		const L = ingredients.length;
		const ctx = canvas.getContext("2d");
		
		let progress = L;
		let pointerX = NaN;
		let pointerY = NaN;

		const scrollWidth = createupScale(320, 0.7, 3, 37)(canvas.width);
		const scrollMargin = createupScale(320, 0.7, 0, 5)(canvas.width);

		const maxTextHeight = createupScale(320, 0.5, 8, 64)(canvas.width);
		const maxUnderlineThinkness = createupScale(720, 0., 1, 5)(canvas.width);

		const axis = canvas.width * 0.75;
		const textAxis = axis - scrollWidth / 2;
		const barAxis = axis + scrollWidth / 2;

		
		const textHeight = createDownScale(Math.ceil(L/8), 0.5, 8, maxTextHeight);


		const underlineWidth = createDownScale(Math.ceil(L/8), 0.5, 1, maxUnderlineThinkness);

	
		const hue = i => 10 - 130*((L-i)/L);
		const baseBarWidth = canvas.width - textAxis - scrollWidth;

		const barWidth = i => baseBarWidth * ((L-i)/L) * Math.max(0, Math.min(1, progress - i));

		const pR = window.devicePixelRatio;

		const estimatedHeight = 1.02* ingredients.reduce((top, _, i) => top + lense(top, 128) * textHeight(i), 0)

		const strech = Math.max(0, height - estimatedHeight);

		canvas.height = Math.ceil(estimatedHeight + strech);
		const thumbHeight = createDownScale(canvas.height/2, 0.8, 8, maxTextHeight*2);

		canvas.style.width = `${canvas.width}px`;
		canvas.style.height = `${canvas.height}px`;
		canvas.width = Math.ceil(canvas.width * pR);
		canvas.height = Math.ceil(canvas.height * pR);
		ctx.scale(pR, pR);


		let scrollY = 0;
		let scrollBar = new Path2D();


		const CaptureZones = () => {
			const zones = Object.create(null);
			return ({
				register: (key, x, y, width, height) => {
					zones[key] = new Path2D();
					zones[key].rect(x, y, width, height);
				},
				findAt: (offsetX, offsetY) => {
					for (const key in zones) {
						if (ctx.isPointInPath(zones[key], offsetX*pR, offsetY*pR)) return key; 
					}
				}
			});
		}

		const links = CaptureZones();


		const drawIngredient = (ingredient, height, top, lineWidth) => {
			ctx.font = `400 italic ${height}px  Roboto`;
			ctx.textAlign = "end";
			ctx.textBaseline = "alphabetic";
			ctx.strokeStyle = "#222222";
			ctx.fillStyle = "#222222";
			ctx.lineWidth = lineWidth;

			const { width, actualBoundingBoxAscent } = ctx.measureText(ingredient);
			
			links.register(ingredient, textAxis - width, top, width, height);

			ctx.fillText(ingredient, textAxis, top + actualBoundingBoxAscent, textAxis);
			// ctx.beginPath();
			// ctx.moveTo(textAxis - Math.min(width, textAxis), top + actualBoundingBoxAscent);
			// ctx.lineTo(textAxis, top + actualBoundingBoxAscent);
			// ctx.stroke();
		};

		const drawBar = (height, top, width, h) => {
			ctx.fillStyle = `hsl(${h}, 50%, 50%)`;
			ctx.fillRect(barAxis, top - 1, width, height - 2 );
		};

		const drawScroll = (top) => {
			const thumbSize = thumbHeight(scrollY - strech / 2);
			
			ctx.strokeStyle = "#222222";

			// ctx.beginPath();
			// ctx.moveTo(axis, 0);
			// ctx.lineTo(axis, top);
			// ctx.stroke();
			
			scrollBar = new Path2D();
			scrollBar.rect(textAxis, 0, scrollWidth, canvas.height);

			ctx.fillStyle = `hsla(0, 0%, 95%, 100%)`;
			ctx.fillRect(textAxis + scrollMargin, 0, scrollWidth - 2*scrollMargin, canvas.height);
			
			ctx.fillStyle = `hsla(0, 0%, 50%, 100%)`;
			const thumbTop = Math.min(Math.max(strech / 2, scrollY - thumbSize / 2), top);
			const thumbBottom = Math.min(thumbTop + thumbSize / 2, Math.min(Math.max(scrollY, strech / 2), top)) //Math.min(thumbTop + thumbSize / 2);

			ctx.fillRect(
				textAxis + scrollMargin,
				thumbTop,
				scrollWidth - 2*scrollMargin,
				thumbBottom - thumbTop
				//Math.min(thumbSize, Math.max(0, top - scrollY + thumbSize / 2))
			);
		};

		const drawCursor = () => {
			ctx.fillStyle = `hsla(270, 0%, 50%, 50%)`;
			ctx.beginPath();
			ctx.ellipse(pointerX, pointerY, 20, 20, Math.PI / 4, 0, 2 * Math.PI);
			ctx.fill();
		};

		function paint() {
			ctx.clearRect(0, 0, canvas.width / pR, canvas.height / pR);
			let top = strech/2;
			for (let i = 0; i < L; i++) {
				const ingredient = ingredients[i];
				const height = lense(top, scrollY) * textHeight(i);
				drawIngredient(ingredient, height, top, underlineWidth(i));
				drawBar(height, top, barWidth(i), hue(i));
				top += height;
			}
			drawScroll(top);
			drawCursor();
		}
		paint();
		return ({
			setProgress: (p) => {
				progress = p;
				paint();
			},
			setPointer: (clientX, clientY) => {
				const { x,y } = canvas.getBoundingClientRect();
				pointerX = clientX - x;
				pointerY = clientY - y;
			
				if (ctx.isPointInPath(scrollBar, pointerX*pR, pointerY*pR)) {
					scrollY = pointerY;
					paint();
				}

				const focused = links.findAt(pointerX, pointerY);
				if(focused && canvas.style.cursor !== "pointer") canvas.style.cursor = "pointer";
				else if (!focused && canvas.style.cursor === "pointer") canvas.style.cursor = "default";
				paint();
			},
			captureScroll: (clientX, clientY) => {
				if (ctx.isPointInPath(scrollBar, pointerX*pR, pointerY*pR)) {
					scrollY = pointerY;
					paint();
				}
			};
			focused: (clientX, clientY) => {
				const { x, y } = canvas.getBoundingClientRect();
				return links.findAt(clientX - x, clientY - y)
			}, 
		});
	}


	
	let renderer

	const animate = (i = 0) => {
		if (i >= ingredients.length) return
		renderer.setProgress(i);
		requestAnimationFrame(() => animate(i + 0.1))
	} 

	onMount(() => {
		renderer = createRenderer(canvas);
		animate();
	});

	const googleAt = ({ clientX, clientY }) => {
		const focused = renderer.focused(clientX, clientY)
		if (focused) window.open(`https://www.google.com/search?q=${focused}`, "__blank", "noreferrer noopener")
	}
</script>

<canvas
	on:mousemove="{({ clientX, clientY }) => renderer.setPointer(clientX, clientY) }"
	on:touchstart|preventDefault={({ touches: [{ clientX, clientY}] }) => {
		renderer.setPointer(clientX, clientY);
		googleAt({ clientX, clientY});
	}}
	on:touchmove|preventDefault={({ touches: [{ clientX, clientY}] }) =>
		renderer.setPointer(clientX, clientY)
	}

	on:mouseleave="{(event) => (canvas, { x: NaN, y: NaN })}"
	on:click={googleAt}
	bind:this={canvas}
	width={width}
/>

<style>

</style>