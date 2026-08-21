# HANDOFF.md — sonraki oturum için devir notu

Önce `CLAUDE.md`'yi oku (dosya haritası + kurallar + iş akışı). Burada yalnız
oturum durumu ve bilinen sorunlar var.

## Durum (2026-08-21)

- Branch: `claude/foximax-daily-game-check-58c9qx`, HEAD push'lu ve temiz.
- `main`'e son merge: PR #4. Sonrasında branch'te merge EDİLMEMİŞ 2+ commit var:
  panel buton sırası (arşiv, istatistikler, nasıl oynanır, ayarlar) + CLAUDE.md.
  Merge yalnız kullanıcı isteyince (PR aç + merge, GitHub MCP).
- Artifact: https://claude.ai/code/artifact/88342021-2456-4bfc-ab19-9f3661351428
  Yeni oturumdan güncellerken Artifact aracına `url` parametresini geç
  (yoksa yeni artifact oluşur). Favicon 🦊, başlık "TİLKİLE".

## Önemli kararlar

- Cevap havuzu = `cevaplar.txt` (2.788) → `words.js` buradan üretilir.
  `kelimehavuzu.txt` (5.585 kabul edilen tahmin) şu an RUNTIME'DA KULLANILMIYOR;
  ileride tam-kelime tahmini eklenirse hazır.
- Logo koyu/açık tema: CSS filter DEĞİL, tema başına düz görsel
  (`logo-light.png` / `logo-dark.png`; `tilkilelogo.png` kaynağından piksel
  sınıflandırmayla üretildi: yazı=kalın nötr siyah, tilki=gerisi).
- Gömülü başlık fontları denendi ve tamamen kaldırıldı; marka görsel wordmark.
- Kutucuk çerçeveleri tek gri; klavye büyük ve köşeli; canlar satırı tahtanın
  ilk karesiyle hizalı (`.status-row` genişliği kare boyuna bağlı: 306/276/236px).

## Bilinen sorunlar / yarım işler

- `assemble.py` ve üretilen `foximax.html` yalnız ESKİ oturumun scratchpad'inde
  (repoda YOK) — yeni oturumda yeniden yazılmalı. Özü: index.html'i oku;
  stylesheet linkini `<style>` inline yap; `words.js` + `game.js`'i `<script>`
  inline yap; TÜM çıktıda (script içi dinamik `can.png` dahil)
  `src="logo-light.png|logo-dark.png|logo.png|fox.png|can.png"` geçişlerini
  base64 data-URI ile değiştir.
- `akbil` kelimesi `cevaplar.txt`'te var ama `kelimehavuzu.txt`'te yok
  (kullanıcı verisindeki tutarsızlık; bilerek dokunulmadı, kullanıcı biliyor).
- `fox.png` artık kullanılmıyor ama repoda duruyor (kullanıcı görseli, silme).
- Günlük bulmaca içerikleri havuz değişince değişir (deterministik seed) — bilinçli.

## Test hatırlatmaları

- Playwright: `/opt/node22/lib/node_modules/playwright/index.js`,
  chromium `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- `#help-modal` tıklamaları bloklar → önce `hidden=true`.
- Koyu tema testi: `data-theme="dark"` + `localStorage foximax-theme=dark`.
- Ekran boyları: 390/360/320 genişlik; klavye için 760/680/600 yükseklik kırılımları.
