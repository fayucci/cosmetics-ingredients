<script>

	export let sorting;

	const toggleSort = (field) => () => {
		const [active, ascending] = $sorting;
		if(active !== field) $sorting = [field, true];
		else if(ascending === true) $sorting = [field, false];
		else $sorting = [];
	} 
	
	const swipeRightSort = (field) => () => {
		const [active, ascending] = $sorting;
		if(active !== field) $sorting = [field, false];
		else if(ascending === true) $sorting = [];
	} 

	const swipeLeftSort = (field) => () => {
		const [active, ascending] = $sorting;
		if(active !== field) $sorting = [field, true];
		else if(ascending === false) $sorting = [];
	}

	const clickLeftSort = (field) => () => {
		$sorting = [field, true];
	}

	const clickRightSort = (field) => () => {
		$sorting = [field, false];
	} 

	const swipe = (node, field) => {
		const left = swipeLeftSort(field);
		const right = swipeRightSort(field);

		const sensitivity = 10;
		const horizontality = 50;
		let X;
		let Y;

		const reset = () => { X = undefined; Y = undefined };
		const touchStart = ({ touches: [{ clientX, clientY }]}) => {
			X = clientX;
			Y = clientY;
		};
		const touchMove = (event) => {
			if (!Number.isFinite(X) || !Number.isFinite(Y)) return
			event.preventDefault();

			const { touches: [{ clientX, clientY }]} = event;
			

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
		}
	}
	const isAscending = (field, active, ascending) => {
		if(active !== field) return undefined;
		return ascending;
	}
</script>

<div class="container">
	<h2>Sort by:</h2>
	<button class="sort-button" use:swipe={"name"} data-ascending={isAscending("name", ...$sorting)}>
		<div class="ascending" on:click={clickRightSort("name")}>↑</div>
		<div class="slider" on:click={toggleSort("name")}>Name</div>
		<div class="descending" on:click={clickLeftSort("name")}>↓</div>
	</button>
	<button class="sort-button" use:swipe={"rating"} data-ascending={isAscending("rating", ...$sorting)}>
		<div class="ascending" on:click={clickRightSort("rating")}>↑</div>
		<div class="slider"  on:click={toggleSort("rating")}>Rating</div>
		<div class="descending" on:click={clickLeftSort("rating")}>↓</div>
	</button>
	<button class="sort-button" use:swipe={"price"} data-ascending={isAscending("price", ...$sorting)}>
		<div class="ascending" on:click={clickRightSort("price")}>↑</div>
		<div class="slider" on:click={toggleSort("price")}>Price</div>
		<div class="descending" on:click={clickLeftSort("price")}>↓</div>
	</button>
</div>

<style>
	h2 {
		margin: 0;
		font-size: 14px;
		font-weight: 400;
		color: #444;
	}
	.container {
		display: grid;
		grid-template-columns: auto;
		row-gap: 16px;
	}
	.sort-button {
		display: flex;
		position: relative;
		align-content: center;
		align-items: center;
		border: 0;
		border-radius: 4px;
		padding-left: 12px;
		padding-right: 12px; 
		padding-top: 1px;
		padding-bottom: 1px;
		/* border: 1px solid hsla(0, 0%, 50%, 0.5); */
		box-shadow: 0px 0px 1px 0px hsla(0, 0%, 50%, 0.5);
		transition: all 300ms ease;
		white-space: nowrap;
		cursor: pointer;
		background: #DDDD;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}


	.sort-button .ascending, .sort-button .descending {
		position: absolute;
		user-select: none;
		color: #000;
		font-weight: 400;
		font-size: 12px;
		line-height: 12px;
		display: block;
		width: 12px;
		text-align: center;
	}
	.sort-button .descending {
		left: 0;
	}
	.sort-button .ascending {
		right: 0;
	}
	.sort-button .slider {
		transition: all 300ms ease;
		padding: 4px;
		border-radius: 4px;
		width: 100%;
		box-sizing: border-box;
		background: hsl(0, 0%, 100%);
		/* border: 1px solid hsla(0, 0%, 50%, 0.5); */
		box-shadow: 0px 0px 1px 0px hsla(0, 0%, 50%, 0.5);
	}

	.sort-button[data-ascending="false"] {
		padding-right: 0; 
	}
	.sort-button[data-ascending="false"] .slider {
		padding-right: 12px; 
	}

	.sort-button[data-ascending="true"] {
		padding-left: 0; 
	}
	.sort-button[data-ascending="true"] .slider {
		padding-left: 12px; 
	}

</style>