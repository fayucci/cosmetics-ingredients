<script>
	import { onMount } from 'svelte';

	import Close from "./close-button.svelte";
	import Rating from "./rating.svelte";

	import BrandOptions from "./filter-options/brand.svelte";
	import CategoryOptions from "./filter-options/category.svelte";
	import RatingOptions from "./filter-options/rating.svelte";
	import PricingOptions from "./filter-options/pricing.svelte";
	import SkinOptions from "./filter-options/skin.svelte";

	export let drawer;

	export let filters
	let expanded = undefined;
	let drawerContent = undefined;

	const brandFilter = ({ detail: brand }) => {
		expanded = undefined;
		// $filters = { ...$filters, brand };
	}

	const categoryFilter = ({ detail: category }) => {
		expanded = undefined;
		// $filters = { ...$filters, category };
	}

	const ratingFilter = ({ detail: rating }) => {
		expanded = undefined;
		// ;
	}

	const priceFilter = ({ detail }) => {
		expanded = undefined;
		// $filters = { ...$filters, maxPrice: max, minPrice: min };
	}

	const skinFilter = ({ detail }) => {
		expanded = undefined;
		// $filters = { ...$filters, ...detail };
	}

	const putInDrawer = (field) => {
		if(drawerContent) {
			drawerContent.$destroy();
			drawerContent = undefined;
		}
		if(field === "brand") {
			drawerContent = new BrandOptions({ target: drawer, props: { filters } });
			drawerContent.$on("filter", brandFilter)
		}
		if(field === "category") {
			drawerContent = new CategoryOptions({ target: drawer, props: { filters } });
			drawerContent.$on("filter", categoryFilter)
		}
		if(field === "rating") {
			drawerContent = new RatingOptions({ target: drawer, props: { filters } });
			drawerContent.$on("filter", ratingFilter)
		}
		if(field === "price") {
			drawerContent = new PricingOptions({ target: drawer, props: { filters } });
			drawerContent.$on("filter", priceFilter)
		}
		if(field === "skin") {
			drawerContent = new SkinOptions({ target: drawer, props: { filters } });
			drawerContent.$on("filter", skinFilter)
		}
	}

	const formatPriceRange = (min, max) => {
		if(min && max) return `${min}$ - ${max}$`;
		if(min) return `from ${min}$`;
		if(max) return `up to ${max}$`;
		return ""
	}

	const toggleFilter = (name) => () => expanded = expanded === name ? undefined : name

	$: putInDrawer(expanded);

</script>

<div class="container">
	<h2>Filter by:</h2>
	<div class="section">
		<button
			class="collapse-button"
			active={expanded === "brand"}
			on:click={toggleFilter("brand")}
		>
			<div>Brand</div>
		</button>
		{#if $filters.brand}
			<div class="selected" >
				{$filters.brand}<Close on:click={()=> ( $filters.brand = undefined )} />
			</div>
		{/if}
	</div>

	<div class="section">
		<button
			active={expanded === "category"}
			class="collapse-button"
			on:click={toggleFilter("category")}
		>
			<div>Category</div>
		</button>
		{#if $filters.category}
			<div class="selected" >
				{$filters.category}<Close on:click={()=> ($filters.category = undefined)} />
			</div>
		{/if}
	</div>

	<div class="section">
		<button
			active={expanded === "rating"}
			class="collapse-button"
			on:click={toggleFilter("rating")}
		>
			<div>Rating</div>
		</button>
		{#if $filters.rating}
			<div class="selected rating" >
				<Rating value={$filters.rating} />
				<Close on:click={()=> ($filters.rating = undefined)} />
			</div>
		{/if}
	</div>

	<div class="section">
		<button
			active={expanded === "price"}
			class="collapse-button"
			on:click={toggleFilter("price")}
		>
			<div>Price</div>
		</button>
		{#if $filters.maxPrice || $filters.minPrice }
			<div class="selected" >
				{formatPriceRange($filters.minPrice, $filters.maxPrice)}
				<Close on:click={()=> { $filters.minPrice = undefined; $filters.maxPrice = undefined }} />
			</div>
		{/if}
	</div>
	<div class="section">
		<button
			active={expanded === "skin"}
			class="collapse-button"
			on:click={toggleFilter("skin")}
		>
			<div>Skin</div>
		</button>
		{#if $filters.dry }
			<div class="selected" >
				Dry
				<Close on:click={()=> { $filters.dry = undefined; }} />
			</div>
		{/if}
		{#if $filters.oily }
			<div class="selected" >
				Oily
				<Close on:click={()=> { $filters.oily = undefined; }} />
			</div>
		{/if}
		{#if $filters.normal }
			<div class="selected" >
				Normal
				<Close on:click={()=> { $filters.normal = undefined; }} />
			</div>
		{/if}
		{#if $filters.sensitive }
			<div class="selected" >
				Sensitive
				<Close on:click={()=> { $filters.sensitive = undefined; }} />
			</div>
		{/if}
		{#if $filters.combinaion }
			<div class="selected" >
				Combinaion
				<Close on:click={()=> { $filters.combinaion = undefined; }} />
			</div>
		{/if}
	</div>

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
	.collapse-button {
		border: 0;
		width: 100%;
		border-top-left-radius: 4px;
		border-bottom-left-radius: 4px;
		padding-left: 4px;
		padding-right: 0px; 
		padding-top: 1px;
		padding-bottom: 1px;
		box-shadow: 0px 0px 1px 0px hsla(0, 0%, 50%, 0.5);
		transition: all 300ms ease;
		white-space: nowrap;
		cursor: pointer;
		background: #DDDD;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.collapse-button div {
		transition: all 300ms ease;
		padding: 4px;
		border-top-left-radius: 4px;
		border-bottom-left-radius: 4px;
		width: 100%;
		box-sizing: border-box;
		background: hsl(0, 0%, 100%);
		box-shadow: -1px 0px 1px 0px hsla(0, 0%, 50%, 0.5);
	}

	.collapse-button:focus div, .collapse-button:hover div {
		box-shadow: -1px 0px 1px 1px hsla(0, 0%, 50%, 0.75);
	}

	.collapse-button:focus {
		outline: none;
	}

	.collapse-button[active="true"], .collapse-button:active {
		padding-left: 1px;
	}
	.section {
		display: grid;
		row-gap: 4px;
	}
	.selected {
		display: grid;
		grid-template-columns: 1fr min-content;
		font-size: 14px;
		font-weight: 300;
		column-gap: 4px;
		text-align: right;
		align-items: center;
	}
	.rating {
		grid-template-columns: 80px min-content;
	}
</style>