# Resume (LaTeX)

| File | What it is |
|---|---|
| `Himanshu_Adwani_Resume.tex` | The resume: every fact, bullet and date. Edit this. |
| `preamble.tex` | Layout: Carlito (a Calibri clone) at 11pt, 0.5in margins, single column. |

One resume for every employer type (big tech, quant, startups, mid-size). For a specific posting, at most reorder a project or mirror two or
three of its keywords in Skills; don't fork the file.

## Build

With MiKTeX (or TeX Live) installed, from this folder:

```bash
pdflatex Himanshu_Adwani_Resume.tex
```

Overleaf works too: upload both `.tex` files and compile `Himanshu_Adwani_Resume.tex`.

The site serves the copy in `public/`, so publish a new build by copying it there:

```bash
cp Himanshu_Adwani_Resume.pdf ../public/Himanshu_Adwani_Resume.pdf
```

The build's own files (the PDF, `.aux`, `.log`) stay out of git; only the copy in `public/` is committed.

## Checks after every edit

- Still one page.
- No bullet wraps onto a line with only one or two words.
- Dates stay in "Mon YYYY" form everywhere.
- Copying all the PDF's text into a plain-text editor reads cleanly (`preamble.tex` turns on `\pdfgentounicode` and
  `\pdfinterwordspaceon`, and maps Carlito's fi, ff and fl ligatures back to plain letters, for this).
