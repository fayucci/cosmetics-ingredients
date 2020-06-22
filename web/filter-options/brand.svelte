<script>
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	export let filters;

	let brands = []
	onMount(async () => {
		const response = await fetch("/api/brands", {cache: "force-cache"});
		brands = await response.json();
	});

	const dispatch = createEventDispatcher();

	const handleSelection = (brand) => () => {
		$filters = { ...$filters, brand }
		dispatch("filter");
	}
</script>

<div class="drawer-content" >
	{#each brands as brand }
		<div data-selected={$filters.brand === brand} class="option" on:click={handleSelection(brand)}>{brand}</div>
	{/each}
</div>

<style>
	.drawer-content {
		display: grid;
		grid-auto-rows: min-content;
		row-gap: 8px;
		width: 250px;
		box-sizing: border-box;
	}

	.option {
		transition: all 300ms ease;
		white-space: nowrap;
		padding: 8px 12px;
		text-align: left;
		cursor: pointer;
		background: transparent;
		border-radius: 4px;
	}

	.option[data-selected="true"] {
		font-weight: 500;
	}
	.option:hover {
		background: #EEEEEEDD;
	}
</style>