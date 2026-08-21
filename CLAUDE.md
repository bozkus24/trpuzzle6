# CLAUDE.md — TİLKİLE

Türkçe günlük kelime bulmacası (foximax.com'un Türkçe sürümü). Saf HTML/CSS/JS,
bağımlılık yok, build yok; `index.html` doğrudan açılır.

## Dosya haritası (yeniden taramaya gerek yok)

- `index.html` — sayfa + tüm modallar (help, mode, archive, settings, stats, end)
- `style.css` — temalar (`:root` açık, `:root[data-theme="dark"]` koyu), tüm arayüz
- `game.js` — oyun mantığı (IIFE, ~660 satır); günlük/arşiv, `mulberry32` seed,
  1 Ağustos 2026 = bulmaca #1, `localStorage` anahtarları `foximax-*`
- `words.js` — ÜRETİLMİŞ dosya; elle düzenleme. `cevaplar.txt`'ten üretilir
- `cevaplar.txt` — oyunun sorduğu cevap havuzu (2.788 kelime)
- `kelimehavuzu.txt` — kabul edilen tüm tahminler (5.585 kelime)
- Görseller: `logo.png` (TR küpü), `logo-light.png`/`logo-dark.png` (tema başına
  wordmark; koyu sürümde yalnız yazı pikselleri beyaz), `tilkilelogo.png`
  (wordmark KAYNAĞI, 1920×1080, doğrudan kullanılmaz), `can.png` (kalp),
  `fox.png` (kullanılmıyor, bardan kaldırıldı)

`words.js`, `kelimehavuzu.txt`, `cevaplar.txt` büyük veri dosyalarıdır —
tamamını asla okuma; gerekirse `grep`/`head` ile örnekle.

## Kurallar

- Türkçe büyük harf: `i→İ`, `ı→I` (kod: `s.replace("ı","I").replace("i","İ").upper()`).
  CSS `text-transform` Türkçe için güvenilmez; metni kaynakta büyük yaz.
- Arayüz metinlerinde uzun çizgi (—) kullanma.
- Kutucuk çerçeveleri renkten bağımsız tek gri (`--tile-border`); flip animasyonunda
  yalnız `.tile-face` döner, çerçeve sabittir.
- Tema varsayılanı açık; koyu tema `data-theme="dark"` ile. Logo görünürlüğü
  `img.bl-light`/`img.bl-dark` seçicileriyle (özgüllüğü düşürme — çift logo hatası yaşandı).
- Panel buton sırası: arşiv(mode-btn), istatistikler, nasıl oynanır, ayarlar.

## İş akışı

1. Değişiklikten sonra scratchpad'deki `assemble.py` ile tek dosyalık
   `foximax.html` üret (JS/CSS inline + tüm `src="*.png"` data-URI; script içindeki
   dinamik `can.png` dahil TÜM çıktıda replace edilir).
2. Playwright ile ekran görüntüsü doğrula:
   `import pkg from '/opt/node22/lib/node_modules/playwright/index.js'`,
   chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
   Not: `#help-modal` açılışta tıklamaları bloklar — önce `hidden=true` yap.
3. Artifact'ı AYNI dosya yolundan yeniden yayınla (favicon 🦊, başlık "TİLKİLE").
4. Commit + `git push -u origin claude/foximax-daily-game-check-58c9qx`
   (ağ hatasında 2s/4s/8s/16s ile tekrar dene).
5. `main`'e merge yalnız kullanıcı isteyince: PR aç + merge et (GitHub MCP araçları).

Kelime havuzu güncelleme: ilgili `.txt`'yi değiştir, `words.js`'i `cevaplar.txt`'ten
yeniden üret (başlık yorumunu koru).
