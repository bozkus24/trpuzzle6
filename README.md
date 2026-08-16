# Tilkile (Türkçe)

[foximax.com](https://foximax.com/) oyununun Türkçe sürümü, günlük kelime bulmacası.

Klasik harf tahmin oyununa kurnaz bir kıvrım getirir: gizli kelimeyi harfleri
tek tek tahmin ederek çözersin. Ama tahmin ettiğin harf kelimede **yoksa**,
ızgaraya **yeni bir kelime eklenir** ve artık hepsini aynı tahminlerle çözmen
gerekir. **8 yanlış** harfte oyun biter. Amaç: kelimeleri **mümkün olan en az
yanlışla** çözmek.

## Özellikler

- **Günlük mod**: herkese aynı bulmaca, deterministik (tarihe göre). Serini uzat.
- **Antrenman modu**: sınırsız rastgele oyun, tekrar oyna ve paylaş.
- Büyüyen ızgara mekaniği, canlar, oyun sonu istatistikleri.
- **Galibiyet Kaydı** grafiği (kaç kelimeyle kazanıldığının dağılımı), günlük ve
  antrenman için ayrı tutulur.
- Bilinen harfler **yeşil**, bilinmeyenler **gri**. Yeni eklenen bir kelime
  önceden denenmiş (çıkmamış) harfleri içeriyorsa bunlar doğrudan gri gösterilir.
- Harf açılışında küçük **flip** animasyonu, yeni kelimede düşme animasyonu
  (`prefers-reduced-motion` desteklenir).
- Seri (streak) ve istatistik takibi (`localStorage`).
- Sonuç paylaşımı (emoji ile), açık/koyu tema.
- Türkçe ekran klavyesi + fiziksel klavye desteği (Türkçe büyük harf: i→İ).
- Bağımlılık yok, tek sayfa. Doğrudan `index.html` açılarak veya statik olarak
  (ör. GitHub Pages) çalışır.

## Nasıl oynanır

`index.html` dosyasını bir tarayıcıda aç. Ekran klavyesinden ya da fiziksel
klavyeden harfleri tahmin et.

## Dosyalar

- `index.html`: sayfa yapısı
- `style.css`: tema ve arayüz
- `game.js`: oyun mantığı (günlük/antrenman, tahmin, streak, paylaşım)
- `words.js`: 5 harfli Türkçe kelime listesi (5.521 kelime)

## Kelime listesi kaynağı

Kelimeler doğrudan repodaki **`kelimehavuzu.txt`** dosyasından alınır (5.585
adet 5 harfli Türkçe kelime). Herhangi bir dış doğrulama yapılmaz; dosyadaki
kelimeler Türkçe kurallara göre büyük harfe çevrilerek (`i→İ`, `ı→I`)
`words.js` üretilir.

Kelime havuzunu güncellemek için `kelimehavuzu.txt` dosyasını düzenleyip
`words.js`'i yeniden üretmen yeterli.
