<script>
	import Products from "./products.svelte"
	import { onMount } from 'svelte';

	let products = [];
	onMount(async () => {
		const response = await fetch("/api/cosmetics");
		const content = await response.json();
		products = content
	});
</script>

<Products {products} />
