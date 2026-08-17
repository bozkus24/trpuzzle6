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
- `words.js`: oyunun sorduğu cevap havuzu, 5 harfli (2.788 kelime)
- `cevaplar.txt`: cevap havuzu kaynağı (2.788 kelime)
- `kelimehavuzu.txt`: kabul edilen tüm geçerli tahminler (5.585 kelime)

## Kelime listeleri

İki liste vardır:

- **`kelimehavuzu.txt`** — *kabul edilen tahminler*: geçerli sayılan tüm 5
  harfli Türkçe kelimeler (5.585 adet).
- **`cevaplar.txt`** — *cevaplar*: oyunun tahtaya çıkarabileceği / sorabileceği
  kelimeler (2.788 adet). Bu liste kabul edilen tahminlerin bir alt kümesidir.

Oyunun kullandığı `words.js`, **`cevaplar.txt`** dosyasından üretilir;
kelimeler Türkçe kurallara göre büyük harfe çevrilir (`i→İ`, `ı→I`).

Havuzu güncellemek için ilgili `.txt` dosyasını düzenleyip `words.js`'i
`cevaplar.txt`'ten yeniden üretmen yeterli.

## Başlık fontu

Başlık (**TİLKİLE**) için *Megamax Jonathan Too* (heaven castro, Freeware)
kullanılır. Font Türkçe **İ** harfini içermediğinden, fontun kendi piksel
ızgarasında (I gövdesi + nokta) bir **İ** glifi üretilip eklenmiş; ardından
gerekli harflere subset'lenip `style.css` içine base64 gömülmüştür. Böylece
her cihazda aynı görünür.
