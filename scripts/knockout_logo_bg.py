"""Remove opaque white backdrop from the official BS Consulting PNG. Logo colors unchanged."""
from pathlib import Path

from PIL import Image

ROOT = Path(r"c:\Users\ousma\Desktop\bs.com")
SRC = ROOT / "bserp-backend" / "resources" / "brand" / "bs-consulting-logo.png"
TARGETS = [
    SRC,
    ROOT / "bserp-backend" / "public" / "brand" / "bs-consulting-logo.png",
    ROOT / "bserp-backend" / "public" / "bs-consulting-logo.png",
    ROOT / "BSERP" / "public" / "bs-consulting-logo.png",
]


def knock_out_white(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            mx = max(r, g, b)
            mn = min(r, g, b)
            # Backdrop: nearly white / light gray, low chroma.
            if mx >= 228 and (mx - mn) <= 18:
                px[x, y] = (r, g, b, 0)
            elif mx >= 210 and (mx - mn) <= 10 and a < 255:
                px[x, y] = (r, g, b, 0)
    return im


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing {SRC}")
    out = knock_out_white(Image.open(SRC))
    for dest in TARGETS:
        dest.parent.mkdir(parents=True, exist_ok=True)
        out.save(dest, "PNG", optimize=True)
        print(f"wrote {dest} {dest.stat().st_size}")


if __name__ == "__main__":
    main()
