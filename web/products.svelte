<script>
	import Product from "./product.svelte";

	export let products = [];
</script>

<main class="products">
	{#each products as product}
		<Product {...product}/>
	{/each}
</main>

<style>
	.products {
		border: 1px solid #999;
		border-radius: 4px;
		overflow: hidden;
	}
</style>