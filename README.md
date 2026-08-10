# 🦊 FoxiMax (Türkçe)

[foximax.com](https://foximax.com/) oyununun Türkçe sürümü — günlük kelime bulmacası.

Klasik harf tahmin oyununa kurnaz bir kıvrım getirir: gizli kelimeyi harfleri
tek tek tahmin ederek çözersin. Ama tahmin ettiğin harf kelimede **yoksa**,
ızgaraya **yeni bir kelime eklenir** ve artık hepsini aynı tahminlerle çözmen
gerekir. **8 yanlış** harfte oyun biter. Amaç: kelimeleri **mümkün olan en az
yanlışla** çözmek.

## Özellikler

- **Günlük mod** — herkese aynı bulmaca, deterministik (tarihe göre). Serini uzat.
- **Antrenman modu** — sınırsız rastgele oyun, tekrar oyna ve paylaş.
- Büyüyen ızgara mekaniği, canlar, oyun sonu istatistikleri.
- Seri (streak) ve istatistik takibi (`localStorage`).
- Sonuç paylaşımı (emoji ile), açık/koyu tema.
- Türkçe ekran klavyesi + fiziksel klavye desteği (Türkçe büyük harf: i→İ).
- Bağımlılık yok, tek sayfa. Doğrudan `index.html` açılarak veya statik olarak
  (ör. GitHub Pages) çalışır.

## Nasıl oynanır

`index.html` dosyasını bir tarayıcıda aç. Ekran klavyesinden ya da fiziksel
klavyeden harfleri tahmin et.

## Dosyalar

- `index.html` — sayfa yapısı
- `style.css` — tema ve arayüz
- `game.js` — oyun mantığı (günlük/antrenman, tahmin, streak, paylaşım)
- `words.js` — 5 harfli Türkçe kelime listesi (5.521 kelime)

## Kelime listesi kaynağı

5 harfli Türkçe kelimeler
[MehmetHuseyinDelipalta/Wordle-Turkce-Kelime-Listesi](https://github.com/MehmetHuseyinDelipalta/Wordle-Turkce-Kelime-Listesi)
reposundan alınmıştır (o da
[CanNuhlar/Turkce-Kelime-Listesi](https://github.com/CanNuhlar/Turkce-Kelime-Listesi)
temel alınarak hazırlanmıştır). Şapkalı harfler (Â, Î, Û) temel Türkçe
harflere normalize edilmiş, tekrarlar temizlenmiştir.
