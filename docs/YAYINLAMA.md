# Statik yayınlama

Kaynak proje bu klasörde kalır; yalnız `build/` içeriği statik hosta yüklenir. `node_modules/`, testler, önizleme resimleri, proje notları ve `.svelte-kit/output/server/` dağıtılmaz. İkinci bir proje kopyası gerekmez.

Kurulu SvelteKit 2 sürümü yapılandırmayı `vite.config.ts` içindeki `sveltekit(...)` üzerinden okur. `adapter-static`, `prerender = true` ve `trailingSlash = 'always'` korunmuştur. Build hem `index.html` hem `projects/index.html` üretir; SPA fallback gerektirmez. Host dizin URL'lerini `/projects/` biçiminde sunmalı; `/projects` isteğini buna yönlendirmelidir.

`paths.relative = false`, SSR sırasında da varlık adreslerinin yapılandırılmış base path'e göre üretilmesini sağlar. Bu projede wallpaper URL'si CSS custom property içinde kullanılıyor; göreli URL aksi halde harici CSS dosyasının dizinine göre çözülüp ilk yüklemede 404 veriyordu. Domain adı sabitlenmedi; yalnız host köküne göre yollar kullanılıyor.

## GitHub Pages

`.github/workflows/deploy.yml`, `main` dalına push veya elle başlatma ile `npm ci` ve `npm run build` çalıştırır. Base path, `actions/configure-pages` çıktısından gelir; kullanıcı adı veya repo adresi uygulamaya sabitlenmez. GitHub repo ayarlarında Pages kaynağı GitHub Actions olmalıdır. Bu denetim sırasında repo kurulmadı veya yayın yapılmadı.

Repo alt dizinini yerelde sınamak için PowerShell:

```powershell
$env:BASE_PATH = '/repo-adi'
npm run build
node tests/static-smoke.mjs /repo-adi
Remove-Item Env:BASE_PATH
npm run build
```

`BASE_PATH` başında `/` bulunmalı, sonunda `/` olmamalıdır. Uygulama içi rotalar `resolve`, favicon ve wallpaper `asset`, sesler ise SvelteKit `base` üzerinden adreslenir. Gerçek host bir alt dizin kullanıyorsa bu değerle yeniden build alınır; aynı build rastgele başka bir base path'e taşınmaz.

## Özel domain veya farklı statik host

Domain köküne yayın için `BASE_PATH` boş veya tanımsız olmalıdır:

```powershell
Remove-Item Env:BASE_PATH -ErrorAction SilentlyContinue
npm run build
```

GitHub Pages özel domain'i repo Pages ayarlarından tanımlanır; domain sağlayıcısında GitHub'ın istediği DNS kayıtları yapılır. `configure-pages` çıktısının yeni domain için boş base path verdiği kontrol edilir. Elle yüklemede hostun istediği `CNAME` dosyası gerekirse gerçek domain verildiğinde `static/CNAME` olarak eklenebilir. Şimdilik domain uydurulmadı. Başka hostta aynı kök build'in `build/` içeriği kullanılır; GitHub Actions workflow'u orada gerekli değildir.

`build/.nojekyll`, `build/THIRD_PARTY_NOTICES.txt` ve `build/THIRD_PARTY_DEPENDENCIES.md` korunmalıdır. Fontlar ve Remix Icon halen harici CDN'lerden yüklenir; site ağ olmadan tam görsel eşdeğerlik garantisi vermez. Slat Graph'ın erişimi portfolyo hosting'inden bağımsızdır. Sesin otomatik başlaması tarayıcı iznine bağlıdır.

Resmi kaynaklar: [SvelteKit statik adapter ve GitHub Pages](https://svelte.dev/docs/kit/adapter-static), [GitHub Pages özel domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages).
