"""Cut the weight-700 instance out of Big Shoulders Stencil Display (variable, wght 100-900),
so the wordmark's outlines are exactly the face the round-2/3 boards rendered at font-weight 700."""
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

src, out = sys.argv[1], sys.argv[2]
font = instantiateVariableFont(TTFont(src), {"wght": 700})
font.save(out)
cmap = font.getBestCmap()
glyf, hmtx = font["glyf"], font["hmtx"]
for ch in "HIVE.0123456789":
    g = cmap[ord(ch)]
    print(ch, g, "advance", hmtx[g][0], "contours", glyf[g].numberOfContours, "overlap-flag", bool(getattr(glyf[g], "flags", [0])[0] & 0x40) if glyf[g].numberOfContours > 0 else "-")
