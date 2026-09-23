"""Read actual export text with PDFium, independently of the producing library.

Used by the browser export tests. Install the pinned test-only dependency with
`python -m pip install -r scripts/pdf-test-requirements.txt`.
"""
import json
import sys

import pypdfium2 as pdfium

print('[PDF verification] started', file=sys.stderr)
with pdfium.PdfDocument(sys.argv[1]) as document:
    pages = []
    selection = []
    needle = sys.argv[2] if len(sys.argv) > 2 else ''
    for index in range(len(document)):
        page = document[index]
        try:
            text = page.get_textpage()
            try:
                pages.append(text.get_text_range())
                if needle:
                    search = text.search(needle)
                    try:
                        match = search.get_next()
                        if match:
                            count = text.count_rects(*match)
                            selection.append({'page': index + 1, 'rects': [text.get_rect(i) for i in range(count)]})
                    finally:
                        search.close()
            finally:
                text.close()
        finally:
            page.close()
    print(json.dumps({'pages': pages, 'selection': selection}, ensure_ascii=True))
    print(f'[PDF verification] completed: {len(pages)} pages', file=sys.stderr)
