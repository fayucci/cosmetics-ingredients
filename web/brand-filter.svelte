<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import CloseButton from "./close-button.svelte";
	import ExpandButton from "./expand-button.svelte";
	import { slide } from 'svelte/transition';

	export let selected;

	const dispatch = createEventDispatcher();
	let brands;

	let expanded = true;

	onMount(async () => {
		const response = await fetch("/api/brands");
		brands = await response.json();
	});
</script>

<div class="container">
	<div class="header">
		<ExpandButton on:click="{() => {expanded = !expanded}}" expanded={expanded} />
		<strong>Brands</strong>
		{#if selected}
			<span class="selected">
				<span>{selected}</span>
				<CloseButton on:click="{() => dispatch("change", { brand: undefined })}" />
			</span>
		{/if}
	</div>
	{#if brands && expanded}
		<div class="brands" transition:slide >
			{#each brands as brand}
				<div on:click="{() => dispatch("change", { brand })}" class="brand" >
					<span>{brand}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.header {
		align-items: center;
		display: inline-grid;
		grid-template-columns: auto auto auto;
		column-gap: 4px;
	}
	.container {
		margin: 8px;
	}
	.selected {
		user-select: none;
		padding: 4px;
		background: #333333;
		color: #FFFFFF;
		border-radius: 4px;
		display: inline-grid;
		grid-template-columns: 1fr 16px;
		column-gap: 8px;
		line-height: 16px;
		align-items: center;
		font-style: italic;
		font-weight: 500;
	}
	.brands {
		padding: 0 16px;
	}
	.brand {
		text-transform: lowercase;
		font-variant: petite-caps;
		font-style: italic;
		line-height: 19px;
		font-size: 16px;
		cursor: pointer;
	}
	.brand span {
		display: inline-flex;
		flex-direction: column;
	}
	.brand span:after {
		content: "";
		transition: transform 300ms ease-in;
		transform: scaleX(0);
		border-bottom: 1px solid #666;
	}
	.brand:hover span:after {
		transform: scaleX(1);
	}
</style>