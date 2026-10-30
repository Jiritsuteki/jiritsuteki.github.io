<script lang="ts">
	import { asset } from '$app/paths';
</script>

<div
	aria-hidden="true"
	class="portfolio-background pointer-events-none fixed inset-0 -z-10"
	style:--portfolio-wallpaper={`url('${asset('/wallpaper.jpg')}')`}
></div>
