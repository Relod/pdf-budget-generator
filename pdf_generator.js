const PDFWriter = require('./utils/PDFWriter');

// --- Constantes de Design ---
const TEXT_COLOR_DARK = '#2C3E50';
const HEADER_TABLE_BG = '#F37021';
const BORDER_COLOR = '#EAEAEA';
const ROW_DARK_COLOR = '#F8F9F9';
const FONT_REGULAR = 'Roboto-Regular';
const FONT_BOLD = 'Roboto-Bold';
const BRAND_COLOR = '#F37021';

function generatePdf(data, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFWriter({ margin: 40, size: 'A4', autoFirstPage: false });
            const stream = require('fs').createWriteStream(outputPath);
            doc.pipe(stream);

            // --- GERAÇÃO DA PRIMEIRA PÁGINA ---
            doc.addPage();
            generateFirstPageContent(doc, data);
            
            // --- GERAÇÃO DA SEGUNDA PÁGINA ---
            generateSecondPageContent(doc);

            doc.end();
            stream.on('finish', () => resolve());
            stream.on('error', (err) => reject(err));
        } catch(error) {
            reject(error);
        }
    });
}

function generateFirstPageContent(doc, data) {
    doc.y = 115; // Posição inicial do conteúdo, abaixo do header
    const leftColX = doc.page.margins.left;
    const rightColX = doc.page.width / 2 + 30;
    const maxLeftWidth = doc.page.width / 2 - 50;

    // --- DEFEITO APRESENTADO ---
    doc.fillColor(TEXT_COLOR_DARK).font(FONT_BOLD).fontSize(11).text('Defeito Apresentado:', leftColX, doc.y);
    const defeitoText = data.defeito || 'Não informado';
    const defeitoHeight = doc.heightOfString(defeitoText, { width: maxLeftWidth });
    doc.font(FONT_REGULAR).fontSize(10).text(defeitoText, leftColX, doc.y + 15, { width: maxLeftWidth });
    let leftContentBottom = doc.y + 15 + defeitoHeight;

    // --- CAUSA DO DEFEITO ---
    doc.font(FONT_BOLD).fontSize(11).text('Causa do Defeito (Pré-Orçamento):', leftColX, leftContentBottom + 15);
    const causaText = data.causa || 'Não informado';
    const causaHeight = doc.heightOfString(causaText, { width: maxLeftWidth });
    doc.font(FONT_REGULAR).fontSize(10).text(causaText, leftColX, leftContentBottom + 30, { width: maxLeftWidth });
    leftContentBottom += 30 + causaHeight;

    // --- INFORMAÇÕES DA DIREITA (OS E DATA) ---
    const rightColY = 115;
    doc.fillColor(TEXT_COLOR_DARK).font(FONT_BOLD).fontSize(11).text('Número da O.S.', rightColX, rightColY);
    doc.font(FONT_REGULAR).fontSize(10).text(data.os || 'Não informado', rightColX, rightColY + 15);
    doc.font(FONT_BOLD).fontSize(11).text('Data de Emissão', rightColX, rightColY + 40);
    doc.font(FONT_REGULAR).fontSize(10).text(new Date().toLocaleDateString('pt-BR'), rightColX, rightColY + 55);

    // Ajusta a posição Y para a próxima seção (tabelas)
    // Usa a maior altura entre as duas colunas
    doc.y = Math.max(leftContentBottom, rightColY + 80) + 20;
    
    // --- TABELAS DE PEÇAS E MÃO DE OBRA ---
    const pecasRows = Object.entries(data.pecas || {}).map(([desc, value]) => ["1", desc, `R$ ${parseFloat(value).toFixed(2)}`, `R$ ${parseFloat(value).toFixed(2)}`]);
    const moRows = Object.entries(data.mao_obra || {}).map(([desc, value]) => ["1", desc, `R$ ${parseFloat(value).toFixed(2)}`, `R$ ${parseFloat(value).toFixed(2)}`]);

    // Verifica se há espaço suficiente antes de adicionar as tabelas
    const estimatedTableHeight = (pecasRows.length + moRows.length) * 30 + 100;
    
    if (doc.y + estimatedTableHeight > doc.page.height - 150) {
        // Se não houver espaço, cria uma nova página
        doc.addPage();
        doc.y = 115; // Reinicia a posição Y na nova página
    }

    if (pecasRows.length > 0) generateTable(doc, 'Peças', ['QTD', 'DESCRIÇÃO', 'R$ UNIT.', 'TOTAL'], pecasRows);
    if (moRows.length > 0) generateTable(doc, 'Mão de Obra', ['QTD', 'DESCRIÇÃO', 'R$ UNIT.', 'TOTAL'], moRows);
    
    generatePaymentInfo(doc, data);
}

function generateSecondPageContent(doc) {
    doc.addPage();
    doc.y = 115;
    
    const observacoes = [
        'Programas essenciais como navegadores, leitores de PDF, pacote Office e WinRAR são instalados.',
        'Sistemas específicos e apps de nuvem devem ser providenciados pelo cliente.',
        'O backup cobre documentos, fotos e downloads. Arquivos em nuvem não são incluídos.',
        'Reparo de carcaça não garante aparência estética original.',
        'Caso de falha no reparo de placa, não será cobrado.'
    ];
    
    const prazos = [
        'Tempo de entrega para peças: 5 a 7 dias.',
        'Tempo de realização de serviço: 1 a 2 dias úteis.'
    ];
    
    doc.fillColor(TEXT_COLOR_DARK).font(FONT_BOLD).fontSize(12).text('Observações e Prazos');
    doc.moveDown(0.7);
    doc.font(FONT_REGULAR).fontSize(10).list([...observacoes, ...prazos], { 
        bulletRadius: 2, 
        textIndent: 15, 
        paragraphGap: 8 
    });
}

function generateTable(doc, title, headers, rows) {
    doc.moveDown();
    const startX = doc.page.margins.left;
    const colWidths = [40, 312, 80, 80];

    doc.font(FONT_BOLD).fontSize(12).fillColor(TEXT_COLOR_DARK).text(title, startX);
    let tableY = doc.y + 5;

    doc.rect(startX, tableY, colWidths.reduce((a,b)=>a+b), 25).fill(HEADER_TABLE_BG);
    doc.fillColor('#FFFFFF').font(FONT_BOLD).fontSize(10);
    let currentX = startX;
    headers.forEach((header, i) => { 
        doc.text(header, currentX + 10, tableY + 8, { width: colWidths[i] - 20 }); 
        currentX += colWidths[i]; 
    });
    tableY += 25;

    doc.font(FONT_REGULAR).fontSize(10);
    rows.forEach((row, i) => {
        const rowColor = i % 2 ? ROW_DARK_COLOR : '#FFFFFF';
        const rowHeight = Math.max(25, doc.heightOfString(row[1], { width: colWidths[1] - 20 }) + 12);
        doc.rect(startX, tableY, colWidths.reduce((a,b)=>a+b), rowHeight).fill(rowColor);
        doc.fillColor(TEXT_COLOR_DARK);
        currentX = startX;
        row.forEach((cell, j) => { 
            doc.text(cell, currentX + 10, tableY + 8, { 
                width: colWidths[j] - 20, 
                align: j > 1 ? 'right' : 'left' 
            }); 
            currentX += colWidths[j]; 
        });
        doc.moveTo(startX, tableY + rowHeight)
           .lineTo(startX + colWidths.reduce((a,b)=>a+b), tableY + rowHeight)
           .strokeColor(BORDER_COLOR)
           .stroke();
        tableY += rowHeight;
    });
    doc.y = tableY;
}

function generatePaymentInfo(doc, data) {
    // --- 1. CÁLCULOS INICIAIS ---
    const valorVista = parseFloat(data.valor_total) || 0;
    const valorCartao = Object.values(data.pecas || {}).reduce((s, v) => s + parseFloat(v), 0) + 
                        Object.values(data.mao_obra || {}).reduce((s, v) => s + parseFloat(v), 0);

    // --- 2. PREVENÇÃO DE QUEBRA DE PÁGINA ---
    if (doc.y > 600) {
        doc.addPage();
        doc.y = 115;
    }

    // --- 3. POSICIONAMENTO E DIMENSÕES DO BLOCO ---
    const paymentBoxWidth = 280;
    const paymentBoxX = doc.page.width - doc.page.margins.right - paymentBoxWidth;
    let paymentY = doc.y + 25;
    const initialPaymentY = paymentY;

    // --- 4. TÍTULO DO BLOCO ---
    doc.font(FONT_BOLD).fontSize(16).fillColor(TEXT_COLOR_DARK).text('Resumo Financeiro', paymentBoxX, paymentY);
    paymentY += 25;
    
    // --- 5. LINHA SEPARADORA ---
    doc.moveTo(paymentBoxX, paymentY).lineTo(paymentBoxX + paymentBoxWidth, paymentY).strokeColor(BRAND_COLOR).stroke();
    paymentY += 10;
    
    // --- 6. TOTAL NO CARTÃO ---
    doc.font(FONT_BOLD).fontSize(12);
    doc.text('Total no Cartão:', paymentBoxX, paymentY);
    doc.text(`R$ ${valorCartao.toFixed(2)}`, paymentBoxX, paymentY, { align: 'right' });
    doc.font(FONT_REGULAR).fontSize(8).text(`em até ${data.parcelas || 1}x vezes`, paymentBoxX, paymentY + 12, { align: 'right'});
    paymentY += 25;
    
    // --- 7. TOTAL NO DINHEIRO/PIX ---
    doc.font(FONT_BOLD).fontSize(12);
    doc.text('Total no dinheiro/pix:', paymentBoxX, paymentY);
    doc.text(`R$ ${valorVista.toFixed(2)}`, paymentBoxX, paymentY, { align: 'right' });
    paymentY += 25;

    // --- 8. BORDA EXTERNA DO BLOCO ---
    const boxHeight = (paymentY + 30) - initialPaymentY + 10;
    doc.rect(paymentBoxX - 10, initialPaymentY - 10, paymentBoxWidth + 20, boxHeight)
       .strokeColor(BRAND_COLOR)
       .stroke();
}

module.exports = { generatePdf };