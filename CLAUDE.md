# CLAUDE.md — TİLKİLE

Türkçe günlük kelime bulmacası (foximax.com'un Türkçe sürümü). Saf HTML/CSS/JS,
bağımlılık yok. Kaynak çok dosyalı (`index.src.html` + `style.css` + JS + PNG);
deploy edilen `index.html` ise bunlardan üretilen KENDİ KENDİNE YETEN tek dosyadır
(CSS/JS inline, tüm PNG data-URI). Bu, sitenin `/tilkile/` proxy'sinde harici
dosya 404'ünü (style.css/js yüklenmemesi) önlemek için gereklidir.

## Dosya haritası (yeniden taramaya gerek yok)

- `index.src.html` — KAYNAK sayfa + tüm modallar (help, mode, archive, settings,
  stats, end); harici `style.css`/`game.js`/`words.js` bağlantılarıyla. ELLE burayı düzenle.
- `index.html` — ÜRETİLMİŞ tek dosya (deploy edilen). Elle düzenleme;
  `python3 assemble.py` ile `index.src.html`'ten üretilir.
- `assemble.py` — `index.src.html` + kaynakları tek `index.html`'e derler.
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

1. Arayüz/oyun değişikliğini KAYNAKTA yap: `index.src.html`, `style.css`,
   `game.js`, `words.js`. `index.html`'i asla elle düzenleme.
2. `python3 assemble.py` çalıştır → kendi kendine yeten `index.html` üretilir
   (JS/CSS inline + tüm PNG data-URI; script içi dinamik `can.png` dahil).
   Betik harici yerel bağımlılık kalırsa hata verir.
3. Playwright ile ekran görüntüsü doğrula (repodaki `index.html` üzerinden):
   `import pkg from '/opt/node22/lib/node_modules/playwright/index.js'`,
   chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
   Not: `#help-modal` açılışta tıklamaları bloklar — önce `hidden=true` yap.
4. Commit (hem kaynak hem üretilen `index.html`) + designated branch'e push
   (ağ hatasında 2s/4s/8s/16s ile tekrar dene).
5. Deploy: site GitHub'dan OTOMATİK deploy oluyor → `main`'e merge = yayın.
   `main`'e merge yalnız kullanıcı isteyince: PR aç + merge et (GitHub MCP araçları).
   (Doğrudan Netlify'a bu ortamdan erişilemez; api.netlify.com egress'te 403.)
6. Artifact önizlemesi (isteğe bağlı): `index.html`'i AYNI Artifact URL'sinden
   yeniden yayınla (favicon 🦊).

Kelime havuzu güncelleme: ilgili `.txt`'yi değiştir, `words.js`'i `cevaplar.txt`'ten
yeniden üret (başlık yorumunu koru).
