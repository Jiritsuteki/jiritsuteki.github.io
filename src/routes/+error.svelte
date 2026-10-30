<script>
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
	<h1 class="text-5xl">{page.status}</h1>
	<p class="opacity-50">{page.error?.message ?? 'Something went wrong.'}</p>
	<a class="underline underline-offset-4" href={resolve('/')}>Back to home</a>
</div>
