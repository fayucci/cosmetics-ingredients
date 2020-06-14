<script>
	export let expanded;

	$: to = expanded ? "M0 80 L50 30 L100 80" : "M0 20 L50 70 L100 20";
	$: from = expanded ? "M0 20 L50 70 L100 20" : "M0 80 L50 30 L100 80";

	const animation = (element, to) => {
		element.setAttribute("from", to);
		return ({ update: () => element.beginElement() });
	}
</script>

<button on:click>
	<svg width="16" height="16" version="1.1" viewBox="0 0 100 100">
		<path d={to} fill="transparent" stroke="#000" stroke-width="10">
			<animate
				{to}
				{from}
				use:animation={to}
				dur="300ms"
				attributeName="d"
				restart="always"
			/>
		</path>
	</svg>
</button>

<style>
	button {
		transition: all 300ms ease-in;
		user-select: none;
		border: none;
		cursor: pointer;
		background: none;
		padding: 0;
		width: 16px;
		height: 16px;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>