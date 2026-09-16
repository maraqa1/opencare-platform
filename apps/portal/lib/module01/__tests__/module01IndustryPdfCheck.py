"""Check generated print exports against their report JSON and render QA contact sheets."""
import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw
from pypdf import PdfReader

folder = Path(sys.argv[1] if len(sys.argv) > 1 else "output/module01-industry-tests")
results = []
normalize = lambda value: re.sub(r"\s+", "", value).replace("\u00ad", "")
for pdf in sorted(folder.glob("*-report.pdf")):
    industry = pdf.name.removesuffix("-report.pdf")
    reader = PdfReader(pdf)
    texts = [page.extract_text() or "" for page in reader.pages]
    combined = normalize(" ".join(texts))
    response = json.loads((folder / f"{industry}-response.json").read_text(encoding="utf-8"))
    report = response["report"]
    for name in ["executiveSummary", "overallAdvisoryNarrative", "boardScorecardNarrative", "headlineAssessment"]:
        assert normalize(report[name]) in combined, f"{industry}: PDF lost or changed {name}"
    assert normalize(report["roadmapPhases"][0]) in combined, f"{industry}: PDF omitted roadmap rationale"
    if report.get("discovery"):
        for heading in ["Platform and data essentials", "Main pain points", "Current and future use-case register", "Current-state architecture"]:
            assert normalize(heading) in combined, f"{industry}: PDF omitted {heading}"
        for use_case in report["discovery"]["useCases"]:
            assert normalize(use_case["name"]) in combined, f"{industry}: PDF omitted registered use case"
        for component in report["discovery"]["architecture"]["nodes"]:
            assert normalize(component["label"]) in combined, f"{industry}: PDF omitted architecture component"
    for finding in report.get("functionalFindings", []):
        assert normalize(finding["name"]) in combined, f"{industry}: PDF omitted functional domain"
        assert normalize(f"Weighted confidence: {finding['weightedConfidence']}%") in combined, f"{industry}: PDF omitted functional confidence"
        assert normalize(finding["gate"]) in combined, f"{industry}: PDF omitted functional readiness gate"
    for i, (page, text) in enumerate(zip(reader.pages, texts)):
        assert len(text.strip()) > 40, f"{industry}: blank/near-empty page {i+1}"
        assert float(page.mediabox.width) > float(page.mediabox.height), f"{industry}: portrait page"
    assert normalize(report["industryProfile"]["labelEn"]) in combined
    assert "AI2enrichmentstatus" not in combined, f"{industry}: debug panel leaked into PDF"
    render_dir = folder / "qa" / industry
    render_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(["pdftoppm", "-scale-to", "420", "-png", str(pdf), str(render_dir / "page")], check=True, capture_output=True)
    thumbnails = sorted(render_dir.glob("page-*.png"))
    sheet = Image.new("RGB", (4 * 440, ((len(thumbnails) + 3) // 4) * 275), "#e7e9ec")
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(thumbnails):
        with Image.open(path) as image:
            sheet.paste(image.convert("RGB"), ((i % 4) * 440 + 10, (i // 4) * 275 + 25))
        draw.text(((i % 4) * 440 + 12, (i // 4) * 275 + 6), f"{industry} / page {i+1}", fill="#16191e")
    sheet.save(folder / f"{industry}-pdf-contact.png")
    results.append({"industry": industry, "pages": len(reader.pages), "landscape": True, "blankPages": 0, "narrativeMatchesJson": True, "debugHidden": True})
    print(f"PASS {industry}: {len(reader.pages)} landscape pages; narratives match JSON; no blank pages", flush=True)
expected = int(sys.argv[2]) if len(sys.argv) > 2 else 6
assert len(results) == expected, f"Expected {expected} industry PDFs"
(folder / "pdf-test-results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
