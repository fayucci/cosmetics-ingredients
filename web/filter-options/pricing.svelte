<script>
	import { createEventDispatcher } from 'svelte';
	
	
	export let filters;

	const dispatch = createEventDispatcher();

	let { minPrice = "", maxPrice = "" } = $filters;

	const handleSubmit = () => {
		$filters.maxPrice = maxPrice || undefined;
		$filters.minPrice = minPrice || undefined;

		dispatch("filter");
	}

	const timer = {}
	const debouncedChange = () => {
		clearTimeout(timer.current);
		timer.current = setTimeout(handleSubmit, 1000);
	}
</script>

<div
	class="drawer-content"
	on:input|capture={debouncedChange}
	on:keyup|capture={({ key })=> (key === "Enter" && handleSubmit()) }
>
	<input placeholder="min" bind:value={minPrice} type="text" inputmode="decimal">
	<input placeholder="max" bind:value={maxPrice} type="text" inputmode="decimal">
</div>

<style>
	.drawer-content {
		display: grid;
		grid-auto-rows: min-content;
		row-gap: 8px;
		width: 250px;
		padding: 0 12px;
		box-sizing: border-box;
	}

	input {
		transition: all 300ms ease;
		padding: 8px 4px;
		border: 1px solid #DDDD;
		color: #555;
		border-radius: 4px;
	}

	input:focus{
		outline: none;
		border-color: #333;
		color: #333;
	}
</style>