"""Build a dark-background display PNG: navy/dark strokes become white, orange kept."""
from pathlib import Path

from PIL import Image

ROOT = Path(r"c:\Users\ousma\Desktop\bs.com")
SRC = ROOT / "BSERP" / "public" / "bs-consulting-logo.png"
DEST = ROOT / "BSERP" / "public" / "bs-consulting-logo-on-dark.png"


def is_orange(r: int, g: int, b: int) -> bool:
    return r >= 160 and r > b + 25 and g >= 60 and b < 140


def to_light(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 12:
                continue
            if is_orange(r, g, b):
                continue
            # Navy / dark / gray lettering -> white, keep original alpha
            px[x, y] = (255, 255, 255, a)
    return im


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing {SRC}")
    out = to_light(Image.open(SRC))
    out.save(DEST, "PNG", optimize=True)
    print(f"wrote {DEST} {DEST.stat().st_size}")


if __name__ == "__main__":
    main()
