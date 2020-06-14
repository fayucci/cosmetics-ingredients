<script>
	import LinearLoader from "./linear-loader.svelte"
</script>

<div class="product">
	<LinearLoader />
	<LinearLoader />
	<LinearLoader />
	<LinearLoader />
	<LinearLoader />
	<LinearLoader />
	<LinearLoader />
	<LinearLoader />
	<LinearLoader />
	<LinearLoader />
</div>

<style>
	.product {
		display: grid;
		grid-template-columns: 200px 1fr 100px 150px 100px 30px 30px 30px 30px 30px;
		grid-template-rows: 24px;
		column-gap: 8px;
		align-items: center;
		padding: 8px;
		background:#ffffff;
		box-shadow: 0px 1px 2px 0px hsla(0, 0%, 0%, 0.5);
	}

	.product:hover {
		cursor: wait;
	}
</style>