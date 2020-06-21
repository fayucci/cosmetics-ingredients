<script>
	import { onMount } from 'svelte';
	export let ingredients;

	const Renderer = (canvas) => {

		canvas.width = canvas.parentElement.clientWidth;
		const createDownScale = (a, b, min, max, o = 2) => (w) => (min + (max-min) - (max-min)*((b * w ** o) / (b * (w ** o - a ** o) + a ** o)));
		const createupScale = (a, b, min, max, o = 2) => (w) => (min + (max-min)*((b * w ** o) / (b * (w ** o - a ** o) + a ** o)));
		const lense = (i, y) => Number.isNaN(y) ? 1 : Math.max(1 - ((i - y) / 128)**2, 0) + 1;

		const L = ingredients.length;
		const ctx = canvas.getContext("2d");
		const interline = 8;

		let progress = L;
		let pointerX = NaN;
		let pointerY = NaN;
		let scrollY = NaN;

		const axisMargin = 10;
		const maxTextHeight = createupScale(320, 0.5, 8, 24)(canvas.width );
		const maxUnderlineThinkness = createupScale(720, 0., 1, 5)(canvas.width );
		
		const maxBarWidth = 64;
		const axis = canvas.width  - 64;
		const textAxis = axis - axisMargin / 2;
		const barAxis = axis + axisMargin / 2;
	
		const textHeight = createDownScale(Math.ceil(L/8), 0.5, 8, maxTextHeight);
		const underlineWidth = createDownScale(Math.ceil(L/8), 0.5, 1, maxUnderlineThinkness);
		const hue = i => 10 - 130*((L-i)/L);
		const barWidth = i => maxBarWidth * ((L-i)/L) * Math.max(0, Math.min(1, progress - i));
		const barOpacity = createDownScale(canvas.height/2, 0.5, 50, 100);

		const pR = window.devicePixelRatio;
		const estimatedHeight = 1.05* ingredients.reduce((top, _, i) => interline + top + lense(top, 128) * textHeight(i), 0)
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
			ctx.fillStyle = `hsla(0, 0%, 50%, ${20 + 50*dL}%)`;
			ctx.fillRect(barAxis, top, maxBarWidth, height);
			ctx.fillStyle = `hsla(${h}, 50%, 50%, ${75 + 25*dL}%)`;
			ctx.fillRect(barAxis, top, width, height);
		};

		const drawCursor = () => {
			ctx.fillStyle = `hsla(270, 0%, 50%, 50%)`;
			ctx.beginPath();
			ctx.ellipse(pointerX, pointerY, 20, 20, Math.PI / 4, 0, 2 * Math.PI);
			ctx.fill();
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

		const captureCursor = (_, clientX, clientY)=> {
			const focused = links.findAt(clientX, clientY);
			if(focused) canvas.style.cursor = "pointer";
			else canvas.style.cursor = "default";
		}

		const handleTouch = (event) => {
			const { touches: [{ clientX, clientY }] } = event;
			captureScroll(event, clientX, clientY);
			setPointer(clientX, clientY);
		}

		const handleClick = (event) => {
			const focused = links.findAt(event.clientX, event.clientY);
			if (focused) window.open(`https://www.google.com/search?q=${focused}`, "__blank", "noreferrer noopener");
			captureScroll(event, event.clientX, event.clientY);
		}

		const handleHover = (event) => {
			captureCursor(event, event.clientX, event.clientY);
			captureScroll(event, event.clientX, event.clientY);
		}

		canvas.addEventListener("mousemove", handleHover);
		canvas.addEventListener("click", handleClick);
		canvas.addEventListener("touchmove", handleTouch);
		canvas.addEventListener("touchstart", handleTouch);
		
		const bootstrap = (i = 0) => {
			if (i >= ingredients.length) return
			progress = i;
			paint()
			requestAnimationFrame(() => bootstrap(i + 0.1))
		}
		bootstrap();
	}

</script>
<div>
	<canvas	use:Renderer />
</div>

<style>
	canvas {
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}
</style>