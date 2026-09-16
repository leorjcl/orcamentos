from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "orcamento-ygprint-exemplo.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
pdfmetrics.registerFont(TTFont("DejaVu", FONT))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", FONT_BOLD))

NAVY = colors.HexColor("#0B2146")
BLUE = colors.HexColor("#1769E0")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#6B7485")
LINE = colors.HexColor("#DFE5EE")
PALE = colors.HexColor("#EEF5FF")
SOFT = colors.HexColor("#F4F7FB")

styles = getSampleStyleSheet()
body = ParagraphStyle("body", fontName="DejaVu", fontSize=8.5, leading=12, textColor=MUTED)
small = ParagraphStyle("small", fontName="DejaVu", fontSize=7.2, leading=10, textColor=MUTED)
label = ParagraphStyle("label", fontName="DejaVu-Bold", fontSize=7.2, leading=9, textColor=MUTED, spaceAfter=3)
value = ParagraphStyle("value", fontName="DejaVu-Bold", fontSize=9.2, leading=11, textColor=INK)
right_value = ParagraphStyle("right_value", parent=value, alignment=TA_RIGHT)
section = ParagraphStyle("section", fontName="DejaVu-Bold", fontSize=10.5, leading=13, textColor=NAVY, spaceAfter=8)


def brl(value):
    formatted = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {formatted}"


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(14 * mm, 13 * mm, 196 * mm, 13 * mm)
    canvas.setFont("DejaVu-Bold", 7.5)
    canvas.setFillColor(NAVY)
    canvas.drawString(14 * mm, 8 * mm, "YGPrint")
    canvas.setFont("DejaVu", 6.8)
    canvas.setFillColor(MUTED)
    canvas.drawString(31 * mm, 8 * mm, "Dados empresariais e contatos serão configurados no sistema.")
    canvas.drawRightString(196 * mm, 8 * mm, f"erp.ygprint.com.br  |  Página {doc.page}")
    canvas.restoreState()


doc = SimpleDocTemplate(
    str(OUTPUT),
    pagesize=A4,
    leftMargin=14 * mm,
    rightMargin=14 * mm,
    topMargin=14 * mm,
    bottomMargin=20 * mm,
    title="Orçamento YGPrint YG-ORC-2026-0001",
    author="YGPrint",
)

story = []
logo = Table([[Paragraph("<font color='#FFFFFF'><b>YG</b></font>", ParagraphStyle("logo", fontName="DejaVu-Bold", fontSize=14, leading=14, alignment=1))]], colWidths=[13 * mm], rowHeights=[13 * mm])
logo.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), BLUE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("BOX", (0, 0), (-1, -1), 0, BLUE)]))
brand = Table([[logo, Paragraph("<font size='17'><b>YGPrint</b></font><br/><font color='#6B7485' size='8'>Impressões de qualidade</font>", value), Paragraph("<font color='#1769E0' size='8'><b>ORÇAMENTO</b></font><br/><font size='11'><b>YG-ORC-2026-0001</b></font>", right_value)]], colWidths=[16 * mm, 105 * mm, 61 * mm])
brand.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("BOTTOMPADDING", (0, 0), (-1, -1), 9), ("LINEBELOW", (0, 0), (-1, -1), 2.5, BLUE)]))
story.extend([brand, Spacer(1, 6 * mm)])

meta = Table([
    [Paragraph("CLIENTE", label), Paragraph("EMISSÃO", label), Paragraph("VALIDADE", label)],
    [Paragraph("Mariana Souza", value), Paragraph("24/08/2026", value), Paragraph("01/09/2026", value)],
    [Paragraph("Telefone: (81) 99942-1840", small), "", ""],
], colWidths=[102 * mm, 40 * mm, 40 * mm])
meta.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), SOFT), ("BOX", (0, 0), (-1, -1), .6, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, 0), 9), ("BOTTOMPADDING", (0, 2), (-1, 2), 9)]))
story.extend([meta, Spacer(1, 7 * mm), Paragraph("Produtos e serviços", section)])

items = [
    [Paragraph("<b>DESCRIÇÃO</b>", small), Paragraph("<b>QTD.</b>", small), Paragraph("<b>VALOR UNIT.</b>", small), Paragraph("<b>TOTAL</b>", small)],
    [Paragraph("<b>Cartão de visita</b><br/><font color='#6B7485' size='7'>Papel fotográfico 230 g - 4x0 - 9 x 5 cm</font>", body), "100", brl(0.45), brl(45)],
    [Paragraph("<b>Plastificação A4</b><br/><font color='#6B7485' size='7'>Polaseal 0,05 mm - acabamento brilho</font>", body), "2", brl(7.5), brl(15)],
]
item_table = Table(items, colWidths=[100 * mm, 18 * mm, 32 * mm, 32 * mm], repeatRows=1)
item_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, -1), "DejaVu"), ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("ALIGN", (1, 0), (1, -1), "CENTER"), ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
    ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8), ("LINEBELOW", (0, 1), (-1, -1), .5, LINE),
]))
story.extend([item_table, Spacer(1, 8 * mm)])

conditions = [
    Paragraph("Condições comerciais", section),
    Paragraph("<b>Forma de pagamento:</b> Pix", body),
    Paragraph("<b>Prazo de produção:</b> 3 dias úteis após aprovação", body),
    Paragraph("<b>Observações:</b> A produção será iniciada após a aprovação da arte e a confirmação do pagamento.", body),
]
totals = Table([
    ["Subtotal", brl(60)],
    ["Desconto", f"- {brl(5)}"],
    [Paragraph("<b>VALOR TOTAL</b>", value), Paragraph(f"<font size='12'><b>{brl(55)}</b></font>", right_value)],
], colWidths=[32 * mm, 34 * mm])
totals.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), .6, LINE), ("LINEBELOW", (0, 0), (-1, 1), .5, LINE), ("BACKGROUND", (0, 2), (-1, 2), PALE), ("FONTNAME", (0, 0), (-1, 1), "DejaVu"), ("FONTSIZE", (0, 0), (-1, 1), 8), ("TEXTCOLOR", (0, 0), (-1, 1), MUTED), ("ALIGN", (1, 0), (-1, -1), "RIGHT"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
bottom = Table([[conditions, totals]], colWidths=[110 * mm, 66 * mm], hAlign="LEFT")
bottom.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBEFORE", (0, 0), (0, 0), 2.5, BLUE), ("LEFTPADDING", (0, 0), (0, 0), 10), ("RIGHTPADDING", (0, 0), (0, 0), 10), ("LEFTPADDING", (1, 0), (1, 0), 0), ("RIGHTPADDING", (1, 0), (1, 0), 0)]))
story.extend([KeepTogether(bottom), Spacer(1, 10 * mm)])

approval = Table([[Paragraph("Ao aprovar este orçamento, o cliente declara estar de acordo com os itens, valores e condições apresentados.", small), Paragraph("<br/><br/>________________________________<br/><b>Aprovação do cliente</b>", ParagraphStyle("signature", parent=small, alignment=1))]], colWidths=[106 * mm, 70 * mm])
approval.setStyle(TableStyle([("LINEABOVE", (0, 0), (-1, -1), .5, LINE), ("TOPPADDING", (0, 0), (-1, -1), 12), ("VALIGN", (0, 0), (-1, -1), "BOTTOM")]))
story.append(approval)

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(OUTPUT)
