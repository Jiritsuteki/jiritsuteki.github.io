# Ozerk Portfolio — yayın öncesi son denetim

30 Ekim 2026. Mevcut çalışma klasörü incelendi; internet yayını yapılmadı. Bu rapor, önceki denetimlerin üzerine yapılan güncel kontrolü anlatır. Kaynak, tasarım, animasyon, ses, profil verisi veya lisans metinleri bu denetimde değiştirilmedi. Eklenenler bu rapor ve denetim kanıtlarıdır.

Kapsam: src altındaki 31 dosyanın tamamı, bütün statik varlıklar, kök yapılandırmalar ve lockfile, workflow, beş mevcut test dosyası, lisans/notlar ve üretilen dağıtım. Başlangıçta kaydedilen [dosya yolları ve SHA-256 değerleri](denetim-2026-10-30/source-before.json) kaynak/config/statik karşılaştırmasının kanıtıdır. node_modules bütünü satır satır incelenmedi; paket grafiği, ilgili runtime uygulaması ve lisans/güvenlik bildirimleri incelendi.

## Karar

**Uygulamanın normal JavaScript açık akışı çalışıyor; ancak henüz “eksiksiz yayın hazırlığı tamamlandı” demek doğru değil.** Önce repo kapsamı ve kaynak/lisans durumu netleşmeli. Slat Graph'a anonim erişim, çalışmayan DM Mono CDN adresi ve kullanılacak iletişim bağlantıları da yayın öncesinde ele alınmalı veya bilinçli eksik olarak kabul edilmeli.

Bu değerlendirme, bir build hatası olduğu anlamına gelmiyor: check, lint, 28 mevcut test, production build ve iki farklı base path için statik sunucu kontrolleri geçti. Bunların dışında bulunan eksikler aşağıda ayrı verildi.

## Önce çözülmesi gerekenler

| Öncelik            | Bulgu                                                      | Kanıt / etkisi                                                                                                                                                                                                                 | Sonraki işlem                                                                                                                                             |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Yayın kurulumu     | Git deposu portfolyonun üst klasöründe                     | Git kökü `Myself`; portfolyo `Myself/Ozerk-Portfolio` altında. Commit ve remote yok. Workflow repo kökünün `.github/workflows` dizininde bulunmuyor. Üst klasörü aynen push etmek ZIP'leri ve diğer projeleri de kapsayabilir. | Yayın reposunun kökü yalnız portfolyo olmalı. Bu denetimde Git deposu kurulmadı, commit/push yapılmadı.                                                   |
| Lisans kararı      | Özgün projeden alınan kodun bildirim durumu çözülmüş değil | Özgün public depo artık doğrulanabildi; aynı kalan dosyalar var. Önceki bildirim kullanıcı tarafından kaldırılmış. Yeni LICENSE yalnız Ozerk'in telifine sahip olduğu katkıları kapsıyor.                                      | Önceki kaynak için bildirim koruma koşulu veya kaldırmaya izin veren ayrı izin netleştirilmeli. İsmi kaldırmak veya satırları taşımak hak devri değildir. |
| Aktif dış bağlantı | Slat Graph anonim HTTP isteğine **401** dönüyor            | `src/lib/projects/data.ts:20`; 30 Ekim anonim isteği 401. Kart doğru URL'yi açıyor, ancak sıradan ziyaretçinin projeyi görüntüleyebilmesi bu sonuçla doğrulanmıyor.                                                            | Dış sitenin erişimini/yayın ayarını çözmek veya bu erişim durumunu bilinçli kabul etmek gerekiyor.                                                        |
| Aktif font hatası  | DM Mono CSS isteği **500** dönüyor                         | `src/app.html:12`; hem bağımsız HTTP kontrolünde hem Chrome network kayıtlarında tekrar görüldü. `var(--font-mono)` kullanan alanlarda fallback devreye giriyor.                                                               | Fontu aynı sürüm/weight ile güvenilir kaynaktan veya self-host ederek sağlamak; OFL metnini korumak. Burada font değiştirilmedi.                          |
| İçerik kararı      | İletişim alanları boş                                      | `src/lib/index.ts:3–6`: GitHub, Discord, email, LinkedIn boş. LinkedIn düğmesi gerçek profil açmıyor. Bunlar başka sahibin linkleri değil, kasıtlı yer tutucular.                                                              | Kullanılacak gerçek adresler verilmeli; istenmeyen kanalların yer tutucu olarak kalıp kalmayacağı kararlaştırılmalı.                                      |

GitHub workflow dosyasının repo kökünde bulunması şartı [resmi GitHub belgesinde](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#about-yaml-syntax-for-workflows) açıklanıyor. Mevcut workflow `npm ci` ve `npm run build` komutlarını kökten bekliyor; `Myself` kökünde package.json yok.

## Başka projeden kalanlar: bu kez gerçek özgün depoyla karşılaştırma

Önceki karşılaştırma V1 ZIP ile yapılmıştı; o paket zaten kişiselleştirilmişti. Bu denetimde özgün public depo bulundu ve karşılaştırma **29 Ağustos 2026 tarihli `42b2f9eec71235f341dcb86a6a70c5c26be56cad` commit'ine** sabitlendi. Git tree yanıtı eksiksizdi (`truncated=false`). Ham dosya içeriği/hash karşılaştırması yapıldı; yalnız görünüşe bakılmadı.

| Mevcut dosya                                 | Özgün dosyayla sonuç | SHA-256                                                            |
| -------------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| `src/app.html`                               | Byte olarak aynı     | `d03fec4ec4f680e05c58164129b6ca890a5cbec7f3fc5dcd8f87fb8ea2d8910a` |
| `src/app.d.ts`                               | Byte olarak aynı     | `3d450fc2fc7b0f10b6a9493a682769aac34f8b612f0f5d1bc4845a7b0bfe9f0a` |
| `src/lib/components/sections/Section.svelte` | Byte olarak aynı     | `78959f241c6a370253f7b9d47e029ee717469644f9bf68b270610696900e9f81` |
| `prettier.config.js`                         | Byte olarak aynı     | `60cb8fc922b49ca004f0a5b191c0ee63f423d0bfa43019696165b854db6f4b8b` |
| `tsconfig.json`                              | Byte olarak aynı     | `7a19bf2d57ef51ed3d7ddb0ed6ac3c4aa89025ab1cc2b0271132477905763134` |

Boş `.nojekyll` dosyası da aynı. `layout.css` dosyasının bütünü farklı; theme/selection/body blokları normalize edilmiş karşılaştırmada aynı. Diğer mevcut upstream dosyaları farklı. Eski depo `bun.lock` kullanıyor; buradaki package-lock onun aynı kilit dosyası değil.

Önemli ayrım: ortak framework şablonlarının veya basit yapılandırmaların eşitliği, her satırın önceki geliştiriciye ait özgün eser olduğunu tek başına kanıtlamaz. Ancak kullanıcı tarafından da belirtilen, mevcut portfolyonun önceki projeden uyarlanmış olması geçmişini isim/satır değişiklikleri ortadan kaldırmaz. Kodun AI veya insan yazarlığı hakkında görünüşünden bir iddia yapılmadı. Sırf farklı göstermek için kaynak dosyaları değiştirilmedi.

Özgün lisans metni, telif ve izin bildiriminin kopyalar veya önemli bölümlerde korunması koşulunu içeriyor. Mevcut Ozerk LICENSE bunu yeniden lisanslamadığını açıkça söylüyor. Bu denetim, önceki bildirimin kaldırılmasına ayrıca izin verildiğini doğrulayamadı. Bütün projenin tamamen bağımsız ve yalnız Ozerk lisansına tabi olduğu sonucu çıkarılmamalı. Pratik seçenek, gereken upstream bildirimini korumak veya kaldırılmasına ilişkin ayrı izni netleştirmektir; bu, görünür site profilinde eski sahibin kişisel bilgilerini göstermeyi gerektirmez.

### Kişisel kalıntı sonucu

Kaynak uygulamada eski sahibin GitHub API/Discord/profil bağlantısı, Grenoble konumu, eski yaş/okul/işveren içerikleri, kedi, eski müzik/video istekleri bulunmadı. Eski Player, Project, Logos, GitHub store bileşenleri ve eski favicon PNG burada yok. Eski workflow yazımındaki `delpoy.yml` de yok.

`CONTACT` boş değerler içeriyor. Kullanılan Ozerk/Ankara/Halkbank/Slat Graph verileri korunuyor; yaş ve staj gibi kişisel bilgilerin dışarıdan doğruluğu araştırılmadı. Biyografideki “eighteen-year-old” ifadesi kullanıcı tarafından güncelliği teyit edilecek bir kişisel içerik, önceki sahibin metni diye tespit edilmiş bir kalıntı değil.

## Üçüncü taraflar ve medya

React Bits, Motion Primitives, Uiverse, AnimateIcons, Lucide Animated, Lucide, Arc UI, Remix Icon ve DM fontları dış kaynaklıdır. Bunları isim kalıntısı diye silmek uygun bir temizlik olmaz. Ayrıntılı eşleştirme [kaynak bildirimlerinde](licenses/README.md).

- `docs/licenses/` içindeki **10 tam lisans metni**, static ve build THIRD_PARTY_NOTICES içinde eksiksiz bulunuyor; iki dağıtım bildirimi eşit.
- Root LICENSE, static/LICENSE.txt ve build/LICENSE.txt aynı scoped Ozerk metnini içeriyor. Bu eşitlik, önceki kaynak için eksik olan izin/bildirim kararını çözmüyor.
- Vite çıktısında gerçekten bundle'a giren Humanspeak, SvelteKit, Svelte, clsx, framer-motion, motion-dom ve motion-utils paketlerinin lisansları var. React/ReactDOM kurulmuş bir uygulama yok; framer-motion yardımcı kodunun varlığı yine lisans bildirimi gerektiriyor ve bildirim korunuyor.
- [React Bits lisansı](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) sade MIT değil; Commons Clause koşulları da içeriyor. Bu site içinde kullanım ile bileşenleri bağımsız paket olarak dağıtmak aynı durum değildir. Tam metin korunuyor.
- Motion Primitives lisansının sonundaki `app/page.tsx` satırı upstream dosyada da bulundu; sahte proje artığı sayılıp silinmedi.
- Wallpaper ve üç MP3 kullanıcı tarafından sağlandı. Dosyalardan gerçek yaratıcıları ve kamuya yayın izinleri kanıtlanamıyor. “Kullanıcı sağladı” ile “telif kullanıcıya ait” aynı tespit değildir.
- DM font projelerinin OFL metinleri var; CDN-served font binary sürümleri upstream hash'leriyle eşleştirilmedi. Uiverse genel MIT koşulu doğrulandı; kesin Shoh2008 loader post adresi elde değil.

## Gerçek test sonuçları

| Kontrol                                            | Güncel sonuç                                                          |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| Svelte / TypeScript                                | **0 hata, 0 uyarı**                                                   |
| Mevcut Prettier + ESLint                           | **Başarılı**; kural gevşetilmedi                                      |
| Mevcut Playwright testleri                         | **28/28 başarılı**, bu son çalışmada yaklaşık 5 dakika                |
| Production build                                   | Başarılı; static adapter                                              |
| Kök statik sunucu testi                            | Başarılı                                                              |
| `/Ozerk-Portfolio` base path testi                 | Yeni alt dizin build'i ile başarılı                                   |
| Son build                                          | Kök domain için yeniden bırakıldı                                     |
| Gerçek MP3 decode                                  | Treasure 3,432 sn; Swoop 1,104 sn; Braam 7,152 sn; üçü de iki kanallı |
| Dış Slat Graph GET                                 | **401**                                                               |
| DM Sans CSS / Remix Icon CSS                       | Bu bağımsız kontrolde **200 / 200**                                   |
| DM Mono CSS                                        | **500**, Chrome'da da görüldü                                         |
| Uygulama kaynak/config/statik hash karşılaştırması | Denetim sırasında **0 mevcut dosya değişikliği**                      |

Mevcut testler loader'ın 1,8 sn bitişini, icon hover/focus'u, LinkedIn'in bağımsız ve solda kalmasını, ikinci deneyim fixture'ını, slider/touch etkileşimini, ses orchestration/gap/iptal/visibility'yi, Cursor1'i, Grid Scan shader saatini, reduced-motion Grid GPU idlesını, WebGL fallback/context restoration'ı ve kaynak bırakmayı kapsıyor. Test şirketi/müziği yalnız fixture; gerçek portfolyoya eklenmedi. Dış proje açma testindeki 401 fixture'ı, ayrı gerçek anonim HTTP kontrolü yerine kullanılmadı.

Statik testler SPA fallback bulunmayan düz dosya sunucusunda Home/Projects direct URL, refresh, `/projects` → `/projects/`, favicon/wallpaper/ses/lisans yolları ve uygulama JS hata kontrolünü geçti. İlk wallpaper yol hatası yeniden görülmedi. Geçersiz bir URL'nin 404 dönmesi ayrıca doğrulandı.

### Sekiz production ekran boyutu

| Ekran         | Home yatay taşma | Projects yatay taşma | Kart merkezi |
| ------------- | ---------------- | -------------------- | ------------ |
| 320×568       | Yok              | Yok                  | Merkezde     |
| 360×800       | Yok              | Yok                  | Merkezde     |
| 390×844       | Yok              | Yok                  | Merkezde     |
| 768×1024      | Yok              | Yok                  | Merkezde     |
| 1440×900      | Yok              | Yok                  | Merkezde     |
| 1920×1080     | Yok              | Yok                  | Merkezde     |
| 844×390 yatay | Yok              | Yok                  | Merkezde     |
| 320×360 kısa  | Yok              | Yok                  | Merkezde     |

Ölçülen sekiz durumda kartın yatay merkez sapması 0 px, düşey sapması yaklaşık 0,008 px idi. Genişleyen ses kontrolü ekran içinde kaldı. Grid sekizinde de ready verdi. Mobile touch emülasyonu ve masaüstü Chrome kullanıldı; fiziksel iPhone/Android cihazları kullanılmadı.

Home ↔ Projects geçişlerinde **514 animation-frame örneği** alındı. Yatay overflow, route frame'de transform veya wallpaper'ın ekran genişliğinden sapması görülmedi. Eski küçülme/zoom hatası bu testte yeniden üretilemedi; her cihazda asla oluşmayacağı garanti edilmiyor.

Kanıtlar: [production ölçümleri](denetim-2026-10-30/production-results.json), [mobil Home — panel açık](denetim-2026-10-30/home-360.png), [masaüstü Home — panel açık](denetim-2026-10-30/home-1440.png), [mobil Projects](denetim-2026-10-30/projects-360.png), [masaüstü Projects](denetim-2026-10-30/projects-1440.png). Bunlar bu son denetimde alınan görüntülerdir.

### Ses: otomasyon sonucuyla gerçek ilk ziyaret ayrımı

Normal Playwright tabanlı smoke testleri otomatik ses için allowed döndürdü. Bu, tıklamasız ilk gerçek ziyaret için garanti olarak kullanılmadı: kurulu Playwright'ın Chromium evaluate yolunda `userGesture: true` gönderdiği `node_modules/playwright-core/lib/coreBundle.js:36971` içinde görüldü. DOM sorgulayan otomasyon kullanıcı aktivasyonunu etkileyebiliyor.

Bu yüzden ayrıca **userGesture=false CDP okuması**, native WebAudio/HTMLAudio ve gerçek browser mouse olaylarıyla bir açılış kontrolü yapıldı. Browser'ın sadece bu test örneğinde autoplay daha kısıtlı tutuldu; kullanıcının kalıcı tarayıcı ayarları değiştirilmedi.

| An                                | Tarayıcı kullanıcı etkileşimi | İzin / mute                                   |
| --------------------------------- | ----------------------------- | --------------------------------------------- |
| Sayfa açıldı, loader bitti        | hasBeenActive=false           | blocked / muted=false; native NotAllowedError |
| Speaker hover                     | hasBeenActive=false           | Hâlâ blocked / muted=false                    |
| İlk gerçek Enable sound tıklaması | hasBeenActive=true            | allowed / muted=false; düğme Mute sound oldu  |

[Ham ses kontrolü](denetim-2026-10-30/audio-cdp-results.json). Kaynak incelemesinde şüphelenilen capture/bubble yarışı bu gerçek kontrol sırasında doğrulanmadı; kesin hata olarak listelenmedi. İlk Treasure isteğinin hata metni teşhis verisi olarak kalıyor; bu sonradan açılan sesin başarısız olduğu anlamına gelmiyor. Site ilk açılışı kullanıcı tıklamasında geç oynatmaya çalışmıyor.

Sonuç: gerçek tıklamadan önce sesin reddedilebildiği kesin. Bu Chrome'un [otomatik oynatma politikasıyla](https://developer.chrome.com/blog/autoplay/) uyumlu. Hosting/domain değiştirerek veya kendi MIT lisansını ekleyerek bu sınır kalkmaz. İlk açılış sesi bütün ziyaretçilere tıklamasız garanti edilemez. Gerçek hoparlörden insan dinleme testi yapılmadı; dosya decode ve API durumları kontrol edildi. Playlist boş olduğundan gerçek müzik parçası dinleme testi de yapılamaz.

## Ek bulunan uygulama eksikleri

### Hareket azaltma tercihi kısmen uygulanıyor — doğrulandı

`Showcase.svelte:13–16` ve `:30–33`, Projects/Experiences için 28 px dikey giriş ve 600 ms motion tanımlıyor. MotionConfig reducedMotion=user kullanılmıyor; kurulu kütüphane varsayılanı never. Gerçek `reducedMotion=reduce` browser context'inde ilk showcase öğesinin 28 px → 0 hareketi ve opacity geçişi ölçüldü. Dolayısıyla bütün animasyonların reduce tercihine uyduğu söylenemez. Loader, route, ikon, Grid ve custom cursor azaltması mevcut.

Öneri: sadece bu iki motion öğesini OS tercihini takip edecek şekilde ele almak. Bu denetimde kaynak değiştirilmedi. Mevcut 28 testin başarılı olması bu eksikliği yakaladıkları anlamına gelmiyor.

### JavaScript yoksa veya başlamazsa kullanılabilir fallback yok — doğrulandı

JS-disabled gerçek browser context'inde loader 2,1 sn sonra da duruyor; Home main ready=false ve inert. Kaynakta Loading onMount'a, Home ready değişimine bağlı. Projects kompozisyonu da JS ile ready olmadan görünmüyor. Static HTML üretilmesi, JS olmadan sitenin kullanılabilir olduğunu tek başına göstermez.

Bu, normal JS açık akışın bozuk olduğu anlamına gelmez. Dayanıklılık geliştirmesi olarak noscript/progressive fallback düşünülebilir; burada tasarım değiştirilmedi.

### Küçük SEO ve süreç eksikleri

- Projects HTML'inde iki description meta etiketi var: layout genel açıklaması (`+layout.svelte:74`) ve Projects açıklaması (`projects/+page.svelte:94`). Başlık tek ve doğru. Tek route-specific açıklama üretilmeli.
- Canonical, sosyal paylaşım metası, sitemap/robots ve özel statik 404.html yok. Bunların yokluğu tek başına yayın engeli değil. Domain belli olmadan URL uydurulmamalı. Mevcut +error bileşeni statik host için otomatik özel 404 dosyası üretmiş sayılmaz.
- Deploy workflow yalnız npm ci/build çalıştırıyor; check/lint/test gate'i yok. Gelecek bir commit build geçip kontrolleri bozarsa otomatik yayına gidebilir. Kalite kontrolleri workflow'a sonradan eklenebilir.
- Playlist hâlâ boş ve bunu dürüstçe söylüyor. Müzik istenmiyorsa sorun değil; “müzik özellikleri gerçek parçalarla tamamen denenmiş” denemez.

## Güvenlik ve gizlilik

Güncel npm audit: **5 low paket etkisi, 0 moderate/high/critical**. Aynı dependency zincirinin etkileri ayrı paket olarak sayıldığı için bu beş bağımsız uygulama açığı demek değil. Sürümler kit 2.70.3, adapter-static 3.0.10, plugin 7.3.1; dolaylı cookie ve deepmerge zincirleri etkileniyor. Önerilen otomatik geçiş kit 3 / adapter 4 major değişiklik içeriyor; paket güncellenmedi ve audit fix --force uygulanmadı.

- [Enhanced form redirect](https://github.com/sveltejs/kit/security/advisories/GHSA-pfhg-q3qv-9q6r): projede use:enhance/form ve ilgili catch-all akışı yok.
- [Prerender cache-control XSS](https://github.com/sveltejs/kit/security/advisories/GHSA-27mw-82g8-phjj): projede güvenilmeyen cache-control'u setHeaders ile geçiren akış yok.
- [cookie](https://github.com/jshttp/cookie/security/advisories/GHSA-pxg6-pf52-xh8x): uygulama cookie serialize/API kullanmıyor; statik yayında uygulama Node sunucusu yok.
- [deepmerge](https://github.com/advisories/GHSA-gcqx-w48m-w2h4): build-tool zincirinde; ziyaretçi girdisini ona aktaran uygulama import'u yok. cookie/deepmerge client bundle lisans listesinde de bulunmuyor.

Bu kullanım değerlendirmesi açıkların giderildiği anlamına gelmez. Framework yükseltmesi ayrı ve kontrollü bir bakım işi olmalı.

Kaynak/static/config taramasında .env/özel anahtar/sertifika, yaygın GitHub/OpenAI/AWS token kalıpları, production console/debugger veya TODO/FIXME bulunmadı. Geçmiş commit olmadığı için eskiden silinmiş sırlar hakkında garanti verilemiyor. Build'de kaynak .ts/.svelte, source map, test probe'ları, fixture şirket/müziği veya yerel Windows yolu bulunmadı.

Kaynakta analytics, izleme kodu veya cookie akışı görülmedi. Ancak font ve ikon CDN'leri üçüncü taraf HTTP istekleridir; “hiçbir dış servise bağlantı yok” denemez. Güvenlik incelemesi bir penetrasyon testi, hukuki gizlilik uygunluk belgesi veya mutlak sır yokluğu garantisi değildir.

## Yayın çıktısı ve test sınırları

Build yaklaşık **1,58 MB / 27 dosya**; wallpaper, üç MP3, favicon, iki sayfa, client kodu ve lisans metinlerinden oluşuyor. Kaynak notları, test sonuçları, node_modules ve kardeş projeler build'e girmiyor. Workflow da yalnız build dizinini yüklemeyi hedefliyor; sorun, mevcut Git kökünün kapsamı.

Static adapter, prerender, trailingSlash=always, paths.relative=false ve BASE_PATH sistemi korunuyor. Domain/GitHub kullanıcı adı uygulama yollarına sabitlenmemiş. Alt dizin değişirse yeniden build gerekir. Kurulum adımları [YAYINLAMA.md](YAYINLAMA.md) içinde; o belge repo kökünün zaten portfolyo olduğunu varsayar, mevcut üst Git kökü sorununu kendiliğinden çözmez.

Bu yerel kontroller Node **24.21.0**, npm **11.19.0**, Windows ve kurulu Google Chrome ile yapıldı. Workflow Node 22 seçiyor; güncel Node 22 paket minimumlarını karşılayabilir ama gerçek GitHub/Linux workflow çalıştırılmadı. Temiz bir Linux npm ci/CI çalışmasının veya GitHub Pages ayarlarının başarıyla yapıldığı iddia edilmiyor. iOS/Safari, gerçek ekran okuyucu, fiziksel mobil pil/GPU, Lighthouse/WCAG sertifikası veya her cihazda 60 fps ölçümü yapılmadı.

## Önerilen sıra

1. Portfolyonun doğru repo kökünü ve önceki kaynak için lisans/bildirim kararını netleştir.
2. Slat Graph anonim erişimini ve DM Mono font kaynağını düzelt.
3. Gerçek iletişim/LinkedIn adreslerini ekle veya yer tutucuların kalmasına karar ver.
4. Showcase hareket azaltma ve tek description meta düzeltmesini yap.
5. İsteniyorsa JS fallback, sosyal paylaşım bilgileri ve CI kalite gate'lerini ekle; framework yükseltmesini ayrı değerlendir.
6. Bu değişikliklerden etkilenen kontrolleri tekrarla, ardından doğru repo kapsamından yayınla.

Kodun yerini değiştirerek kökenini gizleme, başka proje bilgisi uydurma, yeni proje kartı ekleme veya gereksiz refactor bu denetimin parçası olmadı.
