# Waia Studio — 2 saatlik takım planı (teslim 19:30)

## Tek cümlelik konum (pitch'in ilk cümlesi)
> "Odanın fotoğrafını çek; Waia neyin eksik olduğunu, **duvarına sığacak ölçüde** ve **bütçene uygun** olarak bulur, nereden alacağını gösterir."

Kategori **Utilities**. "İç tasarım uygulaması" gibi anlatmayın. Ürünü "eksik parça bulucu + ölçü/bütçe hesaplayıcı" diye anlatın. Jüri "everyday problem" puanını buradan verir.

## Roller

| Kişi | Sahip olduğu iş | Dokunduğu dosyalar |
| --- | --- | --- |
| **A — Builder** | Çekirdek akış, `styles.css`, RevenueCat paywall, fal canlı üretim (sunucu tarafı), Cloudflare deploy | `app.js`, `styles.css`, `worker.mjs`, `index.html` |
| **B — Farklılaştırma** | "Sığar mı? + Bütçe" modülü, paywall fiyat mantığı, gerekirse PWA manifest | Yeni dosya: `public/fit.js` (+ A'ya 3 satırlık entegrasyon notu) |
| **C — Demo & Pitch** | Gerçek ürün linkleri (ASIN), 2 dk pitch metni, QR kod, telefon testleri, yedek ekran kaydı | `catalog` verisi (A'ya JSON olarak verir), sunum |

**Kural:** `app.js`'e yalnızca A yazar. B ve C kendi dosyasında çalışır, A'ya hazır parça verir. Git yoksa paylaşım için tek bir GitHub reposu açın (5 dk), yoksa dosyaları WhatsApp'tan değil tek bir klasörden (Drive/Live Share) paylaşın.

## Zaman çizelgesi

| Saat | Ne oluyor |
| --- | --- |
| 17:30–17:40 | 10 dk senkron: bu planı onayla, kapsamı dondur, repo aç |
| 17:40–18:40 | Paralel geliştirme |
| **18:40** | Entegrasyon #1: B'nin modülü + C'nin ürün verisi A'ya, ilk deploy |
| 18:40–19:00 | Hata düzeltme, telefonda test |
| **19:00** | **Feature freeze.** Yeni özellik yok |
| 19:00–19:15 | Pitch provası ×2 (kronometreyle), yedek ekran kaydı al |
| 19:20 | Teslim (19:30'u bekleme) |

## Farklılaştırma — öncelik sırası

1. **Sığar mı? (ölçü hesaplayıcı)**: Kullanıcı koltuk/duvar genişliğini girer (veya "küçük / orta / geniş" seçer). Uygulama önerilen saat çapını ve lamba yüksekliğini hesaplar, ürünleri buna göre filtreler, kartta "✓ Duvarına uygun: 40–50 cm" rozeti gösterir. Rakiplerde yok, tamamen deterministik, 1 saatte biter.
2. **Bütçe toplamı**: Seçilen ürünler için "Toplam ₺X / bütçen ₺Y" çubuğu. "Money helper" kategorisine de dokunur.
3. **Paywall fiyat mantığı (tie-break kriteri!)**: İnsanlar odayı sürekli değil, ara sıra yeniler. Plan seti:
   - Ücretsiz: 1 oda, öneriler, benzer ürünler
   - **Oda Paketi**: tek seferlik (consumable) — tek odası olan kullanıcı için
   - **Waia Plus**: aylık/yıllık, deneme süreli — sınırsız oda + **kayıtlı ürünlerde fiyat düşüş uyarısı** (= "neden gelecek hafta yenilesin" cevabı)
   - İkinci gelir kanalı: affiliate link (ücretsiz kullanıcı da gelir getirir → "first dollar")
4. **Paywall zamanlaması**: Paywall, kullanıcı **kendi odasının sonucunu gördükten sonra** gelsin (aha anı), önce değil.

## Pitch akışı (2 dk)
1. (15 sn) Problem: "Boş duvar var, ne asacağını, hangi boyda alacağını bilmiyorsun."
2. (60 sn) Canlı demo: fotoğraf → fal sonucu → hotspot → "✓ sığar" → Amazon
3. (25 sn) Paywall: ücretsiz / Oda Paketi / Plus + affiliate
4. (10 sn) Neden yenilenir: fiyat düşüş uyarıları, yeni oda
5. (10 sn) Sonraki adım: gerçek ölçüm (AR/referans nesne), sepete ekle
Son: ekranda **QR kod** → jüri kendi telefonundan denesin.

## Riskler / hemen kontrol (repo durumu 17:35)
- [x] `public/styles.css` repoda var, akış mobilde düzgün görünüyor.
- [x] ASIN'ler gerçek ürünlerle değiştirildi; "Sepete git" + "Ürünü gör" bağlantıları var.
- [ ] Linkler `amazon.com`, fiyatlar ₺ → Türk kullanıcı için `amazon.com.tr` daha tutarlı (karar: A + C).
- [ ] "Sepete git" bağlantısını gerçek bir Amazon oturumunda bir kez deneyin; çalışmazsa sadece "Ürünü gör" kalsın.
- [ ] Canlı fotoğraf yükleme + fal henüz yok (A).
- [ ] RevenueCat paywall henüz yok, paywall demo modunda (A).
- [ ] "Mobile app" şartı: mobil uyumlu web + "Ana ekrana ekle" (PWA manifest); demo telefondan yapılsın.
- [ ] Canlı fal yavaş/başarısız olursa hazır `room-before/after` görsellerine düşen yedek yol olsun.
- [ ] fal anahtarı istemcide değil, Worker secret'ında.
