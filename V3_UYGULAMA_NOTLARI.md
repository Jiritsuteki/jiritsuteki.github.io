# Ozerk Portfolio — V3 teslim notları

> Tarihsel V3 teslim kaydıdır. Sonraki ses, ikon ve hizalama düzeltmeleri ile güncel test sonuçları için [kaynak denetimine](docs/KAYNAK_DENETIMI.md) bakın. Aşağıdaki 28/28 sonucu o teslim aşamasına aittir.

28 Ekim 2026. En güncel `Ozerk-Portfolio` çalışma klasörü üzerinde devam edildi. Önceki sürümün kaynak yedeği çalışma klasörünün yanında `Ozerk_Portfolio_Before_V3.zip` olarak saklandı. Proje sıfırdan oluşturulmadı ve yeni dependency eklenmedi.

## Görünüm ve içerik

- Ana sayfanın Ozerk profili merkezlendi. Biyografi, konum ve availability metinleri korundu. Kısa süs metni sol üstte, kompakt ses/müzik kontrolleri sağ üstte; mobilde ayrı satırlar kullanıyorlar.
- Anime arka planı, DM Sans / DM Mono, favicon, iletişim konfigürasyonu ve footer metni korunuyor.
- Halkbank rolü **Internship**, süresi **3 months**. Açıklama tam olarak:

  > Completed a three-month internship, gaining experience in software development and basic banking operations.

- Deneyimler `src/lib/experiences.ts` listesinden geliyor. LinkedIn her deneyimin dışında, tüm listenin ardından ve footer'ın öncesinde bağımsız, ortalanmış bir alanda. İkinci deneyim eklendiğinde de konumu korunuyor.
- LinkedIn URL'si mevcut konfigürasyonda boş. Sahte profil veya `href="#"` eklenmedi; erişilebilir bir yer tutucu ve hover/focus animasyonu var. Doğru URL'yi `src/lib/index.ts` içindeki `CONTACT.linkedin` alanına yazınca gerçek bağlantı olur.
- Map, ChartLine ve LinkedIn ikonlarının belirtilen SVG yolları kullanıldı. Çizim/pulse animasyonu yalnız ikonlarda; metinler yer değiştirmiyor. Hover, klavye odağı ve reduced motion destekleniyor.

## Açılış ve rota geçişi

**Click to enter kaldırıldı.** Shoh2008 loader'ı tek **1,8 saniyelik** döngü çalıştırır. Asıl bitiş sinyali `animationend`; CSS devre dışıysa 1,95 saniyelik güvenlik süresi var. Ardından loader 450 ms'de kapanırken içerik 500 ms'de opacity + 6 px translate + hafif blur ile belirir. Sayfanın açılması sesin bitmesini veya ses iznini beklemez.

Loader aynı tarayıcı oturumunda tekrar gösterilmez; modül işareti ve sessionStorage birlikte kullanılır. Doğrudan Projects'ten Home'a dönünce de intro atlanır. Reduced motion altında loader ve giriş hareketi sadeleştirilir.

Home ↔ Projects geçişi **260 ms çıkış + 340 ms giriş** kullanır. Geçiş efektleri tamamlanınca transform/filter ve Web Animations kaynakları bırakılır; Cursor1'in viewport koordinat sistemi kalıcı olarak değiştirilmez. Hızlı navigasyon veya sayfanın kapanması eski callback'leri geçersiz kılar.

## Tek ses yöneticisi ve zaman çizelgesi

Kaynak: `src/lib/audio/manager.ts`. Tek kalıcı müzik öğesi ve tek SFX kanalı vardır. Mute ve volume bütün rotalarda aynı store'dan okunur.

| Olay                              | Ses / davranış                                                                |
| --------------------------------- | ----------------------------------------------------------------------------- |
| Oturumun ilk ana sayfa açılışı    | `treasure.mp3`, tarayıcı izin verirse                                         |
| Treasure gerçekten bittiğinde     | **500 ms sessizlik**, ardından müzik için **600 ms fade-in**                  |
| Home → Projects tıklaması         | Müzik durur, eski SFX ve bekleyen dönüşler iptal edilir                       |
| Grid hazır olduktan 0,28 sn sonra | Braam ve ilk içe tarama aynı `AudioContext.currentTime` başlangıcını kullanır |
| İlk tarama                        | **4 sn**                                                                      |
| Sonraki sessiz taramalar          | **4,8 sn tarama + 2 sn ara**; yeni Braam başlamaz                             |
| Projects → Home                   | Gerçek tıklamada `swoop.mp3`; loader/treasure tekrar başlamaz                 |
| Swoop gerçekten bittiğinde        | **500 ms sessizlik**, ardından **600 ms müzik fade-in**                       |

Chrome'un gerçek dosyalarda çözdüğü süreler: **treasure 3,432 sn**, **swoop 1,104 sn**, **braam 7,152 sn**, stereo / 48 kHz. MP3 dosyaları pakettekilerle SHA-256 eşleşiyor; hız, pitch veya içerik değiştirilmedi. Müzik aralığı tahmini MP3 süresine göre değil, gerçek `onended` olayına göre başlar. Parça seçmek veya mute değiştirmek zorunlu 500 ms sessizliği atlamaz.

Gösterilen başlangıç volume **35/100**. Müzik kazancı `(volume / 100) × 0.4`: başlangıçta 0,14, en fazla 0,4. SFX kazancı `min(0.32, (volume / 100) × 0.7)`: başlangıçta 0,245. Mute ikisine de uygulanır. Tercihler yerel depolamada saklanır; izleme/analitik yok.

Sekme gizlenince ses ve görsel zaman çizelgesi kontrollü durur; dönüşte kalan gecikme/örnek konumu korunur. Yeni navigasyon eski sesleri, müzik beklemelerini ve geçersiz decode sonuçlarını iptal eder. Sayfa kapanırken kaynaklar temizlenir.

### Tarayıcı otomatik ses sınırı

Treasure için otomatik ses denenir; tarayıcı reddeder veya resume isteğini askıda bırakırsa giriş normal ve sessiz tamamlanır. Sesin hazır olmasını bekleyen işlemlerin 1,5 saniyelik güvenlik sınırı vardır. Kontroldeki **Enable sound**, gerçek kullanıcı eylemiyle sesi etkinleştirir. Tarayıcının izin politikası aşılmaya çalışılmaz. Doğrudan `/projects/` açılışı sessizdir; Projects'te ayrıca Sound On/Off düğmesi yoktur.

## Elastic Slider ve müzik ekleme

Ses kontrolü kapalıyken **38 px**, hover/focus veya mobil dokunuşla sola doğru **190 px** genişler; geçiş 220 ms. Native range klavye oklarını ve dokunmayı destekler. Görünür çizgi 3 px, dokunma alanı 24 px. Thumb büyümesi, uçlarda küçük esneme ve değer etiketinde hareket var. Dışarı dokunma/odak çıkışı/Esc kapanmayı destekler. Reduced motion bu hareketleri azaltır.

Müzik listesi bilerek boştur: **No tracks added yet**. Olmayan şarkı veya URL istenmez. Gerçek müzik eklemek için:

1. Dosyanı `static/music/` içine koy.
2. `src/lib/audio/tracks.ts` içindeki `tracks` dizisine `{ id, title, src: '/music/dosya-adin.mp3', artist? }` girdisi ekle.
3. Sağ üstteki **Choose music** menüsünden seç. Liste dolduğunda seçim, play/pause ve bir sonraki parça denetimleri görünür.

Üretim listesinde henüz gerçek müzik olmadığı için gerçek şarkı dinleme testi yapılamadı. Müzik orkestrasyonu, yalnız test ortamındaki fixture liste ve kontrollü ses API olaylarıyla sınanır; test parçaları üretim listesine eklenmez.

## Slat Graph ve Projects

İlk gerçek kart **Slat Graph**: <https://slat-graph-ozerk.jiritsuteki.chatgpt.site/>. Başlık ve nötr `Explore this project` metni dışında doğrulanmamış teknik özellik yazılmadı. Kart native dış bağlantı olarak yeni sekmede açılır; Enter, Space ve touch desteği vardır. **More projects coming soon** ikincil durum olarak kalır. Ana sayfadaki eski `Nothing here. Yet.` kaldırıldı.

**Erişim kontrolü:** Chrome'da oturum açılmadan gerçek URL **401**, başlık **Sign in required** döndürdü. Sites kaydı aktif/canlı ve erişim modu `custom`. Dolayısıyla URL mevcut ancak şu anda anonim ziyaretçiye açık değil. Erişim/yayın ayarları değiştirilmedi; hesapla yetkili açılış bu çalışmada doğrulanmadı.

Grid Scan'in seçilen paleti, 8 hücresi, 10 derinliği, depth fade 1, shader, parallax ve boş alandaki ping korunuyor. Cursor1 **16×16 → 80×32 px More +**, 150 ms geçişle devam ediyor. Kart tıklaması ping oluşturmaz. WebGL yalnız Projects rotasında; çıkışta GPU kaynakları/RAF/observer/dinleyiciler bırakılır. Reduced motion statik kare, WebGL2 yoksa statik tünel kullanılır.

Projeler daha sonra `src/lib/projects/data.ts` dizisinden eklenir. Gerçek kartlar URL'ye gider; `coming-soon` girdiler için önceki erişilebilir açıklama paneli altyapısı korunur.

## Değişen kaynaklar

| Dosyalar                                                                                                                   | Amaç                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/routes/+page.svelte`                                                                                                  | Merkez hero, üst köşeler ve yeni bileşenlerin entegrasyonu                             |
| `src/lib/components/Loading.svelte`, `src/lib/home-entry.ts`                                                               | Tek döngü loader ve oturum işareti                                                     |
| `src/lib/experiences.ts`, `src/lib/components/sections/Showcase.svelte`                                                    | Halkbank verisi, bağımsız LinkedIn, güncel Projects özeti                              |
| `src/lib/components/icons/LocationMap.svelte`, `AvailabilityChartLine.svelte`, `LinkedIn.svelte`                           | Üç küçük animasyonlu ikon                                                              |
| `src/lib/audio/manager.ts`, `tracks.ts`                                                                                    | Ortak ses durumu, SFX, müzik ve zamanlama                                              |
| `src/lib/components/audio/AudioControls.svelte`                                                                            | Elastic Slider ve playlist                                                             |
| `src/lib/projects/experience.ts`                                                                                           | Eski Projects API'sinin ortak ses yöneticisine bağlanması                              |
| `src/lib/navigation.ts`, `src/routes/+layout.svelte`, `src/lib/components/projects/HomeLink.svelte`, `ProjectsLink.svelte` | Gerçek tıklama ses sinyalleri ve iki yönlü geçiş                                       |
| `src/routes/projects/+page.svelte`, `src/lib/projects/data.ts`, `src/lib/components/projects/ProjectCard.svelte`           | Slat Graph, dış bağlantı, ikincil WIP ve gereksiz Projects ses düğmesinin kaldırılması |
| `static/sounds/treasure.mp3`, `swoop.mp3`, `braam.mp3`, `docs/MUZIK_EKLEME.md`                                             | Verilen sesler ve gerçek müzik ekleme yeri                                             |
| `tests/audio.spec.ts`, `home-controls.spec.ts`, `projects.spec.ts`, `renderer.spec.ts`, `static-smoke.mjs`                 | V3 testleri                                                                            |
| `README.md`, bu dosya, `PROJECTS_NOTLARI.md`, `docs/preview/*`, `docs/licenses/*`                                          | Güncel kullanım, önizlemeler ve korunan kaynak bildirimleri                            |

Bu ilk teslimde Grid shader dosyaları, anime görseli, favicon ve iletişim alanları korundu. Sonraki lisans durumu için güncel denetim raporuna bakın. React, Next.js, shadcn komutu, kamera veya yeni runtime paket eklenmedi.

## Testleri tekrar çalıştırma

**Sonuç:** `check` 0 hata / 0 uyarı, `lint` temiz, **28/28 Playwright testi başarılı**. Hem `/` hem `/Ozerk-Portfolio` altında üretim build ve SPA fallback olmadan direct URL / refresh / varlık / gezinme kontrolleri geçti. Orijinal üç sesin gerçek Chrome decode süreleri ayrıca ölçüldü.

Görsel kontroller: [ana sayfa](docs/preview/home-desktop.png), [mobil ana sayfa](docs/preview/home-mobile.png), [mobil Experiences → LinkedIn → footer](docs/preview/experiences-mobile.png), [Projects](docs/preview/projects-desktop.png), [genişleyen ses kontrolü](docs/preview/audio-expanded.png).

```sh
npm ci
npm run check
npm run lint
npm run build
npm test
npm run test:static
```

Playwright mevcut kurulu Google Chrome'u kullanır. Tarayıcı testleri masaüstü ve 360 px touch emülasyonu, loader'ın gerçek animationend süresi, ikonlar, ikinci deneyim, slider, ses politikası/senkronizasyon/500 ms boşluk/iptal/visibility, gerçek WebGL çizimi/temizliği, fallback ve native proje bağlantısını kapsar. Dış bağlantı aktivasyon testlerinde 401 yanıtı kontrollü fixture'dır; yukarıdaki erişim raporu ayrı, gerçek anonim Chrome isteğine dayanır.

Statik test düz dosya sunucusunda SPA fallback olmadan direct URL, refresh, varlıklar ve rota gezinmesini sınar. Alt dizin için PowerShell:

```powershell
$env:BASE_PATH = '/Ozerk-Portfolio'
npm run build
node tests/static-smoke.mjs /Ozerk-Portfolio
Remove-Item Env:BASE_PATH
npm run build
```

## Kalan durumlar

- Gerçek müzikler ve doğru LinkedIn profil URL'si kullanıcı tarafından henüz verilmedi; yerleri hazır.
- Slat Graph anonim erişime kapalı; hesap/yayın erişimi ayrıca düzenlenebilir.
- Fiziksel iOS/Safari veya düşük güçlü cihazda dinleme/fps testi yapılmadı; Chrome masaüstü ve mobil emülasyon kullanıldı. 60 fps her cihaz için garanti edilmez.
- Bu çalışma portfolyoyu internete yeniden yayımlamaz; statik GitHub Pages yapılandırması korunur.
