const PDFDocument = require('pdfkit');
const fs = require('fs');

// --- PALETA DE CORES E FONTES ---
const BRAND_COLOR = '#F37021';
const BRAND_COLOR_LIGHT = '#FDB813';
const TEXT_COLOR_DARK = '#2C3E50';
const TEXT_COLOR_LIGHT = '#FFFFFF';
const TEXT_COLOR_MEDIUM = '#7F8C8D';
const BORDER_COLOR = '#EAEAEA';
const FONT_REGULAR = 'Roboto-Regular';
const FONT_BOLD = 'Roboto-Bold';

class PDFWriter extends PDFDocument {
    constructor(options) {
        super(options);

        this.registerFont(FONT_REGULAR, 'fonts/Roboto-Regular.ttf');
        this.registerFont(FONT_BOLD, 'fonts/Roboto-Bold.ttf');
        
        // Este evento garante que o header e footer sejam adicionados a CADA PÁGINA
        this.on('pageAdded', () => {
            this._generateHeader();
            this._generateFooter();
        });
    }

    _generateHeader() {
        this.save();
        if (fs.existsSync('./contents/logo.png')) {
            this.image('./contents/logo.png', this.page.margins.left, 25, { width: 140 });
        }
        this.fillColor(TEXT_COLOR_DARK)
           .font(FONT_BOLD).fontSize(14).text('TELETÉCNICO - SOLUÇÕES EM INFORMÁTICA', 250, 35, { align: 'right' })
           .font(FONT_REGULAR).fontSize(9).fillColor(TEXT_COLOR_MEDIUM)
           .text('CNPJ: 03.379.570/0001-22 | Rua Sao Paulo, Nº 1050', { align: 'right' })
           .text('CENTRO, DIVINÓPOLIS - MG | CEP: 35500-006', { align: 'right' })
           .text(`Whatsapp: (37) 3112-0073 | Email: teletecnico@financeiro.com.br`, { align: 'right' });

        const grad = this.linearGradient(this.page.margins.left, 90, this.page.width - this.page.margins.right, 93);
        grad.stop(0, BRAND_COLOR).stop(1, BRAND_COLOR_LIGHT);
        this.rect(this.page.margins.left, 90, this.page.width - this.page.margins.left * 2, 3).fill(grad);
        this.restore();
    }

    _generateFooter() {
        this.save();
        const bottom = this.page.height - this.page.margins.bottom;
        this.moveTo(this.page.margins.left, bottom)
            .lineTo(this.page.width - this.page.margins.right, bottom)
            .strokeColor(BORDER_COLOR).stroke();
            
        this.font(FONT_REGULAR).fontSize(8).fillColor("#AAAAAA")
            .text('Orçamento válido por 7 dias. Agradecemos a preferência!', this.page.margins.left, bottom + 10, { align: 'center', lineBreak: false });
        this.text(`Página ${this.page.number}`, this.page.margins.left, bottom + 10, { align: 'right', lineBreak: false });
        this.restore();
    }
}

module.exports = PDFWriter;