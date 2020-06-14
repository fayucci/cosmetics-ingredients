<script>
	import Products from "./product-list.svelte"
	import Product from "./product-details.svelte"

	import BrandFilters from "./brand-filter.svelte"
	import routes from "./routes"

	import { onMount } from 'svelte';

	let filters = {};
</script>


{#if $routes[0] === "main"}
	<Products {filters} />
{:else if $routes[0] === "details"}
	<Product id={$routes[1]} />
{/if}




		<!-- <aside class="filters">
			<BrandFilters
				selected={filters.brand}
				on:change="{({ detail }) => { filters = { ...filters, ...detail }}}"
			/>
		</aside> -->
<style>
	:global(body) {
		background-color: hsl(0, 0%, 95%);
	}
</style>