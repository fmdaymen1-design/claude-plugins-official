"""Generate the printable Budget Planner (A4 + US Letter) and Etsy listing images.

Usage: python3 generate.py   (writes into ./output)
"""
import os
import subprocess
from reportlab.lib.pagesizes import A4, LETTER
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")

INK = HexColor("#3B3A36")
SAGE = HexColor("#8FA58C")
SAGE_LIGHT = HexColor("#E6ECE3")
BLUSH = HexColor("#E9C9BE")
CREAM = HexColor("#FBF8F3")
LINE = HexColor("#CFCAC0")
MUTED = HexColor("#8A857B")

MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
          "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


class Planner:
    def __init__(self, path, size):
        self.c = canvas.Canvas(path, pagesize=size)
        self.c.setTitle("Budget Planner - Printable Finance Kit")
        self.c.setAuthor("Your Shop Name")
        self.w, self.h = size
        self.m = 40  # margin

    # ---------- primitives ----------
    def bg(self):
        self.c.setFillColor(CREAM)
        self.c.rect(0, 0, self.w, self.h, stroke=0, fill=1)

    def header(self, title, subtitle=None):
        self.bg()
        c, m = self.c, self.m
        c.setFillColor(SAGE)
        c.roundRect(m, self.h - m - 46, self.w - 2 * m, 46, 10, stroke=0, fill=1)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 20)
        c.drawString(m + 18, self.h - m - 31, title.upper())
        c.setFont("Helvetica", 10)
        c.drawRightString(self.w - m - 18, self.h - m - 29, "MONTH: ________   YEAR: ______")
        if subtitle:
            c.setFillColor(MUTED)
            c.setFont("Helvetica-Oblique", 10)
            c.drawString(m, self.h - m - 64, subtitle)
        return self.h - m - (78 if subtitle else 62)

    def footer(self):
        self.c.setFillColor(MUTED)
        self.c.setFont("Helvetica", 7)
        self.c.drawCentredString(self.w / 2, 18, "Budget Planner  •  for personal use only")

    def label(self, x, y, text, size=9, color=INK, bold=True):
        self.c.setFillColor(color)
        self.c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        self.c.drawString(x, y, text)

    def table(self, x, top, width, cols, rows, row_h=20, head_fill=SAGE_LIGHT):
        """cols: list of (title, relative width). Returns bottom y."""
        c = self.c
        total = sum(w for _, w in cols)
        widths = [width * w / total for _, w in cols]
        c.setFillColor(head_fill)
        c.roundRect(x, top - row_h, width, row_h, 4, stroke=0, fill=1)
        cx = x
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 8)
        for (title, _), cw in zip(cols, widths):
            c.drawString(cx + 6, top - row_h + 7, title.upper())
            cx += cw
        c.setStrokeColor(LINE)
        c.setLineWidth(0.6)
        y = top - row_h
        for _ in range(rows):
            y -= row_h
            c.line(x, y, x + width, y)
        cx = x
        for cw in widths[:-1]:
            cx += cw
            c.line(cx, top - row_h, cx, y)
        return y

    def box(self, x, y_top, w, h, title, lines=True):
        c = self.c
        c.setStrokeColor(LINE)
        c.setLineWidth(0.8)
        c.roundRect(x, y_top - h, w, h, 8, stroke=1, fill=0)
        self.label(x + 10, y_top - 18, title.upper(), 9, SAGE)
        if lines:
            c.setStrokeColor(LINE)
            c.setLineWidth(0.5)
            yy = y_top - 38
            while yy > y_top - h + 10:
                c.line(x + 10, yy, x + w - 10, yy)
                yy -= 20

    def page(self):
        self.footer()
        self.c.showPage()

    # ---------- pages ----------
    def cover(self):
        c = self.c
        self.bg()
        c.setFillColor(SAGE_LIGHT)
        c.circle(self.w * 0.85, self.h * 0.85, 160, stroke=0, fill=1)
        c.setFillColor(BLUSH)
        c.circle(self.w * 0.12, self.h * 0.15, 120, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica", 14)
        c.drawCentredString(self.w / 2, self.h * 0.62, "U N D A T E D")
        c.setFont("Helvetica-Bold", 52)
        c.drawCentredString(self.w / 2, self.h * 0.53, "BUDGET")
        c.drawCentredString(self.w / 2, self.h * 0.46, "PLANNER")
        c.setStrokeColor(SAGE)
        c.setLineWidth(2)
        c.line(self.w / 2 - 60, self.h * 0.43, self.w / 2 + 60, self.h * 0.43)
        c.setFont("Helvetica-Oblique", 13)
        c.setFillColor(MUTED)
        c.drawCentredString(self.w / 2, self.h * 0.39, "plan it  •  track it  •  save it")
        c.setFont("Helvetica", 11)
        c.setFillColor(INK)
        c.drawCentredString(self.w / 2, self.h * 0.22, "THIS PLANNER BELONGS TO: ______________________")
        c.showPage()

    def how_to(self):
        top = self.header("How to use", "A simple monthly money routine - 30 minutes a month.")
        steps = [
            ("1. Set your goals", "Fill in the Financial Goals page. Know WHY you are budgeting."),
            ("2. Plan the month", "On the Monthly Budget page, list all income and give every euro/dollar a job."),
            ("3. List your bills", "Use the Bill Tracker so nothing is ever paid late again."),
            ("4. Track daily", "Write every purchase in the Expense Tracker (takes 1 minute a day)."),
            ("5. Save on purpose", "Use Savings & Sinking Funds to colour in your progress."),
            ("6. Kill debt", "Use the Debt Payoff tracker (snowball or avalanche method)."),
            ("7. Review", "End of month: fill in the Monthly Review and adjust next month."),
        ]
        y = top - 20
        for t, d in steps:
            self.label(self.m, y, t, 13, SAGE)
            self.label(self.m + 14, y - 17, d, 10, INK, bold=False)
            y -= 52
        self.label(self.m, y - 10, "TIP: print the monthly pages 12x and store them in a binder.", 10, MUTED)
        self.page()

    def goals(self):
        top = self.header("Financial goals")
        gw = (self.w - 2 * self.m - 15) / 2
        for i, t in enumerate(["Short-term goals (this year)", "Long-term goals (3-5 years)"]):
            self.box(self.m + i * (gw + 15), top - 10, gw, 230, t)
        y = top - 260
        self.table(self.m, y, self.w - 2 * self.m,
                   [("Goal", 4), ("Amount needed", 2), ("Deadline", 2), ("Monthly saving", 2)], 8, 24)
        self.box(self.m, y - 240, self.w - 2 * self.m, y - 240 - 40, "My money motto")
        self.page()

    def yearly_overview(self):
        top = self.header("Yearly overview")
        rows = [(mo,) for mo in MONTHS]
        y = self.table(self.m, top - 10, self.w - 2 * self.m,
                       [("Month", 2), ("Income", 3), ("Expenses", 3), ("Saved", 3), ("Debt paid", 3)],
                       len(rows), 28)
        c = self.c
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(INK)
        for i, (mo,) in enumerate(rows):
            c.drawString(self.m + 6, top - 10 - 28 * (i + 2) + 10, mo)
        self.label(self.m, y - 30, "TOTAL INCOME: ____________   TOTAL SAVED: ____________   NET WORTH CHANGE: ____________", 9)
        self.page()

    def monthly_budget(self):
        top = self.header("Monthly budget")
        fw = self.w - 2 * self.m
        cw = (fw - 15) / 2
        y = self.table(self.m, top - 10, cw, [("Income source", 3), ("Planned", 2), ("Actual", 2)], 6)
        self.table(self.m + cw + 15, top - 10, cw, [("Savings", 3), ("Planned", 2), ("Actual", 2)], 6)
        n = int((y - 15 - 140) / 20) - 1
        top2 = y - 15
        y = self.table(self.m, top2, cw, [("Fixed expenses", 3), ("Planned", 2), ("Actual", 2)], n)
        self.table(self.m + cw + 15, top2, cw, [("Variable expenses", 3), ("Planned", 2), ("Actual", 2)], n)
        # summary
        c = self.c
        c.setFillColor(BLUSH)
        c.roundRect(self.m, y - 85, fw, 70, 8, stroke=0, fill=1)
        items = ["TOTAL INCOME", "TOTAL EXPENSES", "TOTAL SAVINGS", "LEFT OVER"]
        sw = fw / 4
        for i, t in enumerate(items):
            self.label(self.m + i * sw + 12, y - 38, t, 8)
            self.label(self.m + i * sw + 12, y - 65, "€/$ ________", 11, INK, bold=False)
        self.page()

    def expense_tracker(self):
        top = self.header("Expense tracker", "Write down every purchase. Awareness = savings.")
        rows = int((top - 60) / 20) - 1
        self.table(self.m, top - 10, self.w - 2 * self.m,
                   [("Date", 1.3), ("Description", 4), ("Category", 2.2), ("Method", 1.5), ("Amount", 1.6)], rows)
        self.page()

    def bill_tracker(self):
        top = self.header("Bill tracker")
        fw = self.w - 2 * self.m
        cols = [("Bill", 3)] + [(m[0], 0.55) for m in MONTHS]
        y = self.table(self.m, top - 10, fw, [("Bill", 3), ("Due", 1), ("Amount", 1.4), ("Autopay", 1.2), ("Paid", 0.8)], 12)
        self.label(self.m, y - 25, "PAID CHECKLIST (tick each month)", 10, SAGE)
        self.table(self.m, y - 35, fw, cols, 10, 20)
        self.page()

    def savings_tracker(self):
        top = self.header("Savings tracker", "Colour in one circle each time you save. 100 circles = goal reached!")
        c = self.c
        fw = self.w - 2 * self.m
        for g in range(2):
            gy = top - 10 - g * ((top - 60) / 2)
            self.label(self.m, gy - 10, "GOAL: ____________________   TARGET: ________   EACH CIRCLE = ________", 10)
            r, gap = 11, (fw - 20) / 10
            for row in range(10):
                for col in range(10):
                    cx = self.m + 10 + gap * col + gap / 2
                    cy = gy - 40 - row * 26
                    c.setStrokeColor(SAGE)
                    c.setLineWidth(1)
                    c.circle(cx, cy, r, stroke=1, fill=0)
                    c.setFillColor(LINE)
                    c.setFont("Helvetica", 6)
                    c.drawCentredString(cx, cy - 2, str(row * 10 + col + 1))
        self.page()

    def sinking_funds(self):
        top = self.header("Sinking funds", "Save a little each month for big, known expenses (holidays, car, gifts...).")
        fw = self.w - 2 * self.m
        bw, bh = (fw - 15) / 2, (top - 60) / 3 - 12
        for i in range(6):
            x = self.m + (i % 2) * (bw + 15)
            y = top - 10 - (i // 2) * (bh + 12)
            self.c.setStrokeColor(LINE)
            self.c.roundRect(x, y - bh, bw, bh, 8, stroke=1, fill=0)
            self.label(x + 10, y - 18, "FUND: _______________", 9, SAGE)
            self.label(x + 10, y - 34, "GOAL: ________  DUE: ________", 8, INK, bold=False)
            # progress bar
            self.c.setStrokeColor(SAGE)
            self.c.roundRect(x + 10, y - 56, bw - 20, 12, 6, stroke=1, fill=0)
            for k in range(1, 10):
                xx = x + 10 + (bw - 20) * k / 10
                self.c.line(xx, y - 56, xx, y - 44)
            self.c.setStrokeColor(LINE)
            yy = y - 74
            while yy > y - bh + 8:
                self.c.line(x + 10, yy, x + bw - 10, yy)
                yy -= 18
        self.page()

    def debt_payoff(self):
        top = self.header("Debt payoff tracker", "Snowball: smallest balance first.  Avalanche: highest interest first.")
        fw = self.w - 2 * self.m
        y = self.table(self.m, top - 10, fw,
                       [("Creditor", 3), ("Balance", 2), ("Interest %", 1.5), ("Min. payment", 2), ("Order", 1)], 6)
        self.label(self.m, y - 25, "PAYMENT LOG", 10, SAGE)
        self.table(self.m, y - 35, fw,
                   [("Date", 1.5), ("Creditor", 3), ("Paid", 2), ("New balance", 2), ("Note", 2.5)],
                   int((y - 100) / 20))
        self.page()

    def no_spend(self):
        top = self.header("No-spend challenge", "Colour in each day you spend nothing but essentials.")
        c = self.c
        fw = self.w - 2 * self.m
        size = (fw - 6 * 10) / 7
        for d in range(31):
            col, row = d % 7, d // 7
            x = self.m + col * (size + 10)
            y = top - 20 - row * (size + 10)
            c.setStrokeColor(SAGE)
            c.setLineWidth(1)
            c.roundRect(x, y - size, size, size, 8, stroke=1, fill=0)
            c.setFillColor(SAGE)
            c.setFont("Helvetica-Bold", 14)
            c.drawCentredString(x + size / 2, y - size / 2 - 5, str(d + 1))
        by = top - 20 - 5 * (size + 10) - 10
        self.box(self.m, by, fw, by - 40, "Rules & reward")
        self.page()

    def review(self):
        top = self.header("Monthly review")
        fw = self.w - 2 * self.m
        gw = (fw - 15) / 2
        h = (top - 60) / 3 - 10
        titles = ["Wins this month", "What went wrong", "Biggest expense surprises",
                  "Where I can cut back", "Goals for next month", "Notes"]
        for i, t in enumerate(titles):
            self.box(self.m + (i % 2) * (gw + 15), top - 10 - (i // 2) * (h + 10), gw, h, t)
        self.page()

    def notes(self):
        top = self.header("Notes")
        self.box(self.m, top - 10, self.w - 2 * self.m, top - 50, "")
        self.page()

    def build(self):
        self.cover()
        self.how_to()
        self.goals()
        self.yearly_overview()
        self.monthly_budget()
        self.expense_tracker()
        self.bill_tracker()
        self.savings_tracker()
        self.sinking_funds()
        self.debt_payoff()
        self.no_spend()
        self.review()
        self.notes()
        self.c.save()


def listing_images(pdf):
    """Render pages to PNG and compose Etsy listing images (2000x1600)."""
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    tmp = os.path.join(OUT, "_pages")
    os.makedirs(tmp, exist_ok=True)
    subprocess.run(["pdftoppm", "-png", "-r", "90", pdf, os.path.join(tmp, "p")], check=True)
    pages = sorted(os.path.join(tmp, f) for f in os.listdir(tmp))

    def font(sz, bold=True):
        name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
        try:
            return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", sz)
        except OSError:
            return ImageFont.load_default()

    def shadowed(canvas_img, page_img, pos, scale):
        p = page_img.resize((int(page_img.width * scale), int(page_img.height * scale)))
        sh = Image.new("RGBA", (p.width + 60, p.height + 60), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rectangle([30, 30, p.width + 30, p.height + 30], fill=(0, 0, 0, 70))
        sh = sh.filter(ImageFilter.GaussianBlur(14))
        canvas_img.paste(sh, (pos[0] - 18, pos[1] - 10), sh)
        canvas_img.paste(p, pos)

    imgs = [Image.open(p).convert("RGB") for p in pages]
    W, H = 2000, 1600

    # 1. hero image
    im = Image.new("RGB", (W, H), "#E6ECE3")
    d = ImageDraw.Draw(im)
    for i, idx in enumerate([4, 0, 7]):
        shadowed(im, imgs[idx], (180 + i * 560, 420 - (60 if i == 1 else 0)), 0.85)
    d.rectangle([0, 0, W, 300], fill="#3B3A36")
    d.text((W / 2, 110), "PRINTABLE BUDGET PLANNER", font=font(92), fill="white", anchor="mm")
    d.text((W / 2, 220), "13 pages  •  A4 + US Letter  •  Undated  •  Instant download",
           font=font(46, False), fill="#E9C9BE", anchor="mm")
    im.save(os.path.join(OUT, "listing-1-hero.png"))

    # 2. what's inside grid
    im = Image.new("RGB", (W, H), "#FBF8F3")
    d = ImageDraw.Draw(im)
    d.text((W / 2, 90), "WHAT'S INSIDE", font=font(80), fill="#3B3A36", anchor="mm")
    sel = imgs[1:13]
    s = 0.42
    tw = int(imgs[0].width * s)
    th = int(imgs[0].height * s)
    gapx = (W - 6 * tw) / 7
    for i, pg in enumerate(sel):
        x = int(gapx + (i % 6) * (tw + gapx))
        y = 260 + (i // 6) * (th + 110)
        shadowed(im, pg, (x, y), s)
    im.save(os.path.join(OUT, "listing-2-inside.png"))

    # 3. features
    im = Image.new("RGB", (W, H), "#8FA58C")
    d = ImageDraw.Draw(im)
    shadowed(im, imgs[4], (120, 180), 1.25)
    feats = ["Monthly budget", "Expense tracker", "Bill tracker", "Savings tracker",
             "Sinking funds", "Debt payoff", "No-spend challenge", "Monthly review"]
    d.text((1120, 200), "TAKE CONTROL\nOF YOUR MONEY", font=font(84), fill="white", spacing=10)
    for i, f in enumerate(feats):
        d.text((1140, 470 + i * 112), "✓  " + f, font=font(54, False), fill="#FBF8F3")
    im.save(os.path.join(OUT, "listing-3-features.png"))

    for p in pages:
        os.remove(p)
    os.rmdir(tmp)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    a4 = os.path.join(OUT, "Budget-Planner-A4.pdf")
    Planner(a4, A4).build()
    Planner(os.path.join(OUT, "Budget-Planner-US-Letter.pdf"), LETTER).build()
    listing_images(a4)
    print("done ->", OUT)
