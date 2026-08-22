#!/usr/bin/env python3
"""index.src.html -> kendi kendine yeten index.html (CSS/JS inline, PNG -> data-URI).

Kaynak dosyalar:
  index.src.html   elle duzenlenen HTML iskeleti (harici link/script ile)
  style.css        ana stil
  words.js, game.js  oyun mantigi
  *.png            gorseller
Cikti:
  index.html       deploy edilen tek dosya (harici bagimlilik yok)

Kullanim: python3 assemble.py
"""
import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "index.src.html"
OUT = ROOT / "index.html"

# HTML'de referans verilen tum yerel gorseller (script ici dinamik can.png dahil).
IMAGES = ["logo-light.png", "logo-dark.png", "logo.png", "fox.png", "can.png"]


def datauri(name):
    data = (ROOT / name).read_bytes()
    b64 = base64.b64encode(data).decode()
    return f"data:image/png;base64,{b64}"


def main():
    html = SRC.read_text(encoding="utf-8")
    css = (ROOT / "style.css").read_text(encoding="utf-8")
    words = (ROOT / "words.js").read_text(encoding="utf-8")
    game = (ROOT / "game.js").read_text(encoding="utf-8")

    # stylesheet link -> inline <style>
    html = html.replace(
        '<link rel="stylesheet" href="style.css" />',
        f"<style>\n{css}\n</style>",
    )
    # script src -> inline
    html = html.replace('<script src="words.js"></script>', f"<script>\n{words}\n</script>")
    html = html.replace('<script src="game.js"></script>', f"<script>\n{game}\n</script>")

    # tum PNG referanslarini data-URI ile degistir (src/href ve script ici tirnakli)
    for png in IMAGES:
        uri = datauri(png)
        html = html.replace(f'src="{png}"', f'src="{uri}"')
        html = html.replace(f'href="{png}"', f'href="{uri}"')
        html = html.replace(f'"{png}"', f'"{uri}"')
        html = html.replace(f"'{png}'", f"'{uri}'")

    OUT.write_text(html, encoding="utf-8")

    leftovers = re.findall(r'(?:src|href)="((?!data:)[^"]*\.(?:png|css|js))"', html)
    print(f"yazildi: index.html ({len(html)} bayt)")
    print("kalan yerel bagimlilik:", leftovers or "yok")
    if leftovers:
        raise SystemExit("HATA: index.html'de hala harici yerel bagimlilik var!")


if __name__ == "__main__":
    main()
