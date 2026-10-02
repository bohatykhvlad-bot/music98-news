from urllib.request import urlopen
from PIL import Image
from io import BytesIO
urls = ['https://static.pollstar.com/wp-content/uploads/2026/01/Elle-playing-live.jpg', 'https://entertaining-options.com/wp-content/uploads/2025/11/ryman-night-1_-4.jpg']
for url in urls:
    try:
        raw = urlopen(url, timeout=30).read()
        im = Image.open(BytesIO(raw))
        print('CANDIDATE', url, im.size, im.format, len(raw), flush=True)
    except Exception as exc:
        print('FAILED', url, str(exc), flush=True)
