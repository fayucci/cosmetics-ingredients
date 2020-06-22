<script>
	import Products from "./product-list.svelte"
	import Product from "./product-details.svelte"
	import { onMount } from 'svelte';
	
	const id = new URLSearchParams(window.location.search).get("id")
</script>

{#if id}
	<Product id={id} />
{:else }
	<Products />
{/if}


<style>
	:global(body) {
		background-color: hsl(0, 0%, 95%);
	}
	:global(button):focus {
		outline: none;
	}
	:global(.hidden-scroll) {
		scrollbar-width: none;
	}
	:global(.hidden-scroll)::-webkit-scrollbar {
		width: 0px;
		background: transparent;
	}

	:global(a) {
		color: hsl(240, 49.8%, 50%);
	}
	:global(a:visited) {
		color: hsl(240, 49.8%, 50%);
	}

</style>