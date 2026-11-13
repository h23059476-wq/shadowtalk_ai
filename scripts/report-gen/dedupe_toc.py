"""Remove the duplicated plain '1. Executive Summary' TOC entry (the placeholder
script emitted both a hyperlink entry and a static duplicate for heading 1)."""
import re
import shutil
import zipfile
from pathlib import Path

DOC = Path("/home/z/my-project/download/ShadowTalk_ResearchToViz_Investigation_Report.docx")
TMP = DOC.with_suffix(".tmp.docx")

with zipfile.ZipFile(DOC) as z:
    names = z.namelist()
    data = {n: z.read(n) for n in names}

xml = data["word/document.xml"].decode("utf-8")

paras = [(m.start(), m.end()) for m in re.finditer(r"<w:p>.*?</w:p>", xml, re.S)]
removed = 0
for s, e in paras:
    block = xml[s:e]
    if ">1. Executive Summary<" in block and "<w:hyperlink" not in block and 'w:val="TOC1"' in block:
        xml = xml[:s] + xml[e:]
        removed += 1
        break  # only one duplicate exists; recompute spans if needed

print("removed paragraphs:", removed)
if removed:
    data["word/document.xml"] = xml.encode("utf-8")
    with zipfile.ZipFile(TMP, "w", zipfile.ZIP_DEFLATED) as z:
        for n in names:
            z.writestr(n, data[n])
    shutil.move(TMP, DOC)
    print("patched:", DOC)
else:
    print("nothing to remove")
