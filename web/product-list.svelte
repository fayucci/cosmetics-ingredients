<script>
	import { fromRecord } from "./query-params";
	import Product from "./product-card.svelte";
	import Rating from "./rating.svelte"

	const fetchProducts = async (filters) => {
		const response = await fetch(`/api/cosmetics?brand=JOSIE MARAN&${fromRecord(filters)}`);
		const { data } = await response.json(); 
		return data;
	}
	export let filters = {};

	$: productsRequest = fetchProducts(filters)
</script>

<div>
	<main class="products">
		{#await productsRequest}
		{:then products}
			{#each products as product (product.id)}
				<Product {...product}/>
			{/each}
		{:catch error}
		{/await}
	</main>
</div>

<style>
	.products {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		grid-auto-rows: 200px;
		grid-column-gap: 16px;
		grid-row-gap: 16px;

	}

	
</style>