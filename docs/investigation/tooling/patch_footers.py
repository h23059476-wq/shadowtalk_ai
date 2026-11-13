"""Patch footer PAGE fields with explicit format switches (WPS compat) and
strip empty <w:pgNumType/> from the cover section — per docx skill toc.md."""
import re
import shutil
import zipfile
from pathlib import Path

DOC = Path("/home/z/my-project/download/ShadowTalk_ResearchToViz_Investigation_Report.docx")
TMP = DOC.with_suffix(".tmp.docx")

with zipfile.ZipFile(DOC) as z:
    names = z.namelist()
    data = {n: z.read(n) for n in names}

doc_xml = data["word/document.xml"].decode("utf-8")
rels_xml = data["word/_rels/document.xml.rels"].decode("utf-8")

# 1. Strip empty pgNumType (docx-js emits it on the cover section).
before = doc_xml.count("<w:pgNumType/>")
doc_xml = doc_xml.replace("<w:pgNumType/>", "")
print(f"removed {before} empty <w:pgNumType/>")

# 2. Map sectPr order -> footer rId (default footer reference).
sect_blocks = re.findall(r"<w:sectPr[^>]*>.*?</w:sectPr>|<w:sectPr[^>]*/>", doc_xml, re.S)
print(f"sections found: {len(sect_blocks)}")
rid_to_file = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="(footer\d+\.xml)"', rels_xml))

section_footer_fmt = []  # (footer_file, fmt) in section order
for i, block in enumerate(sect_blocks):
    refs = re.findall(r'<w:footerReference w:type="default" r:id="(rId\d+)"', block)
    fmt = None
    m = re.search(r'<w:pgNumType[^>]*w:fmt="([^"]+)"', block)
    if m:
        fmt = m.group(1)
    for rid in refs:
        f = rid_to_file.get(rid)
        if f:
            section_footer_fmt.append((f, fmt or ("upperRoman" if i == 1 else "decimal")))
    print(f"  section {i + 1}: fmt={fmt} footers={[rid_to_file.get(r) for r in refs]}")

# 3. Patch each referenced footer's instrText with the explicit switch.
for fname, fmt in section_footer_fmt:
    key = f"word/{fname}"
    xml = data[key].decode("utf-8")
    switch = "ROMAN" if "roman" in (fmt or "").lower() else "arabic"
    patched, n = re.subn(
        r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
        rf"\1 PAGE \\* {switch} \\* MERGEFORMAT \2",
        xml,
    )
    if n:
        data[key] = patched.encode("utf-8")
    print(f"  {fname}: fmt={fmt} -> switch={switch}, patched {n} field(s)")

data["word/document.xml"] = doc_xml.encode("utf-8")

with zipfile.ZipFile(TMP, "w", zipfile.ZIP_DEFLATED) as z:
    for n in names:
        z.writestr(n, data[n])
shutil.move(TMP, DOC)
print("patched:", DOC)
