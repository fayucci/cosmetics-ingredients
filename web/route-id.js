import { writable } from 'svelte/store';

export default writable(new URLSearchParams(window.location.search).get("id"));
