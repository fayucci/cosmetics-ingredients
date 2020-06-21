<script>
	import Products from "./product-list.svelte"
	import Product from "./product-details.svelte"
	import id from "./route-id"

	import { onMount } from 'svelte';

</script>


{#if $id}
	<Product id={$id} />
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
</style>