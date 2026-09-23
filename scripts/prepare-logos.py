from PIL import Image
import os

pub = os.path.join(os.path.dirname(__file__), "..", "public")


def make_white_transparent(img: Image.Image, threshold: int = 200) -> Image.Image:
    img = img.convert("RGBA")
    pix = img.load()
    w, h = img.size
    out = Image.new("RGBA", (w, h))
    outp = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            luminance = 0.299 * r + 0.587 * g + 0.114 * b
            # JPEG noise + pale purple strip on the right
            if luminance > threshold and abs(r - g) < 28 and abs(g - b) < 40:
                outp[x, y] = (255, 255, 255, 0)
            else:
                outp[x, y] = (r, g, b, 255)
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def campus_light(img: Image.Image) -> Image.Image:
    light = img.copy()
    pix = light.load()
    w, h = light.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a < 20:
                continue
            if r > 140 and g < 90 and b < 90:
                pix[x, y] = (227, 27, 35, a)
            else:
                pix[x, y] = (255, 255, 255, a)
    return light


def bs_light(img: Image.Image) -> Image.Image:
    light = img.copy()
    pix = light.load()
    w, h = light.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a < 20:
                continue
            if r > 180 and g > 80 and b < 120 and r > g:
                pix[x, y] = (r, g, b, a)
            else:
                pix[x, y] = (255, 255, 255, a)
    return light


cf = Image.open(os.path.join(pub, "campus-france-logo.jpg")).convert("RGBA")
w, h = cf.size
cf = cf.crop((12, 8, int(w * 0.92), h - 8))
cf = make_white_transparent(cf, threshold=198)
cf.save(os.path.join(pub, "campus-france-logo.png"))
campus_light(cf).save(os.path.join(pub, "campus-france-logo-light.png"))
print("campus", cf.size)

bs = Image.open(os.path.join(pub, "bs-consulting-logo.png")).convert("RGBA")
bbox = bs.getbbox()
if bbox:
    bs = bs.crop(bbox)
bs.save(os.path.join(pub, "bs-consulting-logo.png"))
bs_light(bs).save(os.path.join(pub, "bs-consulting-logo-light.png"))
print("bs", bs.size)
