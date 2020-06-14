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

		const axisMargin = 10;
		const maxTextHeight = createupScale(320, 0.5, 8, 64)(canvas.width);
		const maxUnderlineThinkness = createupScale(720, 0., 1, 5)(canvas.width);

		const axis = canvas.width * 0.80;
		const textAxis = axis - axisMargin / 2;
		const barAxis = axis + axisMargin / 2;

		
		const textHeight = createDownScale(Math.ceil(L/8), 0.5, 8, maxTextHeight);

		const underlineWidth = createDownScale(Math.ceil(L/8), 0.5, 1, maxUnderlineThinkness);
	
		const hue = i => 10 - 130*((L-i)/L);
		const maxBarWidth = canvas.width - textAxis - axisMargin;

		const barWidth = i => maxBarWidth * ((L-i)/L) * Math.max(0, Math.min(1, progress - i));

		const pR = window.devicePixelRatio;

		const estimatedHeight = 1.02* ingredients.reduce((top, _, i) => top + lense(top, 128) * textHeight(i), 0)

		const strech = Math.max(0, height - estimatedHeight);

		canvas.height = Math.ceil(estimatedHeight + strech);
		const barOpacity = createDownScale(canvas.height/2, 0.5, 50, 100);

		canvas.style.width = `${canvas.width}px`;
		canvas.style.height = `${canvas.height}px`;
		canvas.width = Math.ceil(canvas.width * pR);
		canvas.height = Math.ceil(canvas.height * pR);
		ctx.scale(pR, pR);


		let scrollY = 0;

		const scrollBar = {
			zone: new Path2D(),
			set(x, y, width, height) {
				this.zone = new Path2D();
				this.zone.rect(x, y, width, height);
			},
			isAt(clientX, clientY) {
				const { x,y } = canvas.getBoundingClientRect();
				return ctx.isPointInPath(this.zone, (clientX - x)*pR, (clientY - y)*pR);
			}
		}
		const links = {
			zones: Object.create(null),
			register(key, x, y, width, height) {
				this.zones[key] = new Path2D();
				this.zones[key].rect(x, y, width, height);
			},
			findAt(clientX, clientY) {
				const { x,y } = canvas.getBoundingClientRect();
				const offsetX = clientX - x;
				const offsetY = clientY - y;
				for (const key in this.zones) {
					if (ctx.isPointInPath(this.zones[key], offsetX*pR, offsetY*pR)) return key; 
				}
			}
		};

		const setPointer = (clientX, clientY)=>{
			const { x,y } = canvas.getBoundingClientRect();
			pointerX = clientX - x;
			pointerY = clientY - y;
		}
		const setScroll = (clientY)=>{
			const { y } = canvas.getBoundingClientRect();
			scrollY = clientY - y;
		}
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
		};

		const drawBar = (height, top, width, h, dL) => {
			ctx.fillStyle = `hsla(0, 0%, 50%, ${20 + 50*dL}%)`;
			ctx.fillRect(barAxis, top - 1, maxBarWidth, height - 2 );
			ctx.fillStyle = `hsla(${h}, 50%, 50%, ${75 + 25*dL}%)`;
			ctx.fillRect(barAxis, top - 1, width, height - 2 );
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
				const lensing = lense(top, scrollY); 
				const height = lensing * textHeight(i);
				drawIngredient(ingredient, height, top, underlineWidth(i));
				drawBar(height, top, barWidth(i), hue(i), lensing - 1);
				top += height;
			}
			drawCursor();
			scrollBar.set(barAxis, 0, maxBarWidth, canvas.height);
		}
		paint();

		let tapped = false;
		let tapTimmer;
		return ({
			setProgress: (p) => {
				progress = p;
				paint();
			},
			setPointer: (clientX, clientY) => {
				
				if (scrollBar.isAt(clientX, clientY)) {
					setScroll(clientY);
					paint();
				}

				const focused = links.findAt(clientX, clientY);
				if(focused && canvas.style.cursor !== "pointer") canvas.style.cursor = "pointer";
				else if (!focused && canvas.style.cursor === "pointer") canvas.style.cursor = "default";
				paint();
			},
			touchmove: (event) => {
				const { touches: [{ clientX, clientY}] } = event;
				if (scrollBar.isAt(clientX, clientY)) {
					event.preventDefault();
					setScroll(clientY);

				}
				setPointer(clientX, clientY)
				paint();

			},
			touchstart: (event) => {
				const { touches: [{ clientX, clientY}] } = event;
				const focused = links.findAt(clientX, clientY);
				if (tapped && focused) {
					window.open(`https://www.google.com/search?q=${focused}`, "__blank", "noreferrer noopener");
				} else if (focused) {
					clearTimeout(tapTimmer);
					tapped = true;
					tapTimmer = setTimeout(() => tapped = false, 600);
				}
			},
			focused: (clientX, clientY) => {
				return links.findAt(clientX, clientY)
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
		return
		const focused = renderer.focused(clientX, clientY)
		if (focused) window.open(`https://www.google.com/search?q=${focused}`, "__blank", "noreferrer noopener")
	}
</script>

<canvas
	on:mousemove="{({ clientX, clientY }) => renderer.setPointer(clientX, clientY) }"
	on:touchstart={renderer.touchstart}
	on:touchmove={renderer.touchmove}

	on:mouseleave="{(event) => (canvas, { x: NaN, y: NaN })}"
	on:click={googleAt}
	bind:this={canvas}
	width={width}
/>

<style>
	canvas {
		user-select: none;
	}

</style>