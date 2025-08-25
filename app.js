const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generatePdf } = require('./pdf_generator');

const app = express();
const port = process.env.PORT || 10000;

// --- CONFIGURAÇÃO DE DIRETÓRIOS E ARQUIVOS ---
const UPLOAD_DIR = './uploads';
const DATA_DIR = './data';
const METADATA_FILE = path.join(DATA_DIR, 'metadata.json');
const PLANILHA_FILE = path.join(DATA_DIR, 'planilha.json');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- CONFIGURAÇÃO DO EXPRESS ---
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 
app.use('/data', express.static('data'));
app.use('/contents', express.static('contents'));

// --- FUNÇÕES AUXILIARES PARA LEITURA/ESCRITA DE DADOS ---
function readMetadata() {
    if (!fs.existsSync(METADATA_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(METADATA_FILE)); } catch (error) { return []; }
}

function writeMetadata(data) {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2));
}

function readPlanilha() {
    if (!fs.existsSync(PLANILHA_FILE)) {
        return {
            planilhaData: [],
            finalizadosData: [],
            rejeitadosData: [],
            nextId: 1
        };
    }
    try {
        return JSON.parse(fs.readFileSync(PLANILHA_FILE));
    } catch (error) {
        return { planilhaData: [], finalizadosData: [], rejeitadosData: [], nextId: 1 };
    }
}

function writePlanilha(data) {
    fs.writeFileSync(PLANILHA_FILE, JSON.stringify(data, null, 2));
}

// --- ROTAS DA APLICAÇÃO ---
app.get('/', (req, res) => {
    res.render('index');
});

app.post('/generate', upload.single('imagem'), (req, res) => {
    try {
        const data = req.body;
        data.pecas = JSON.parse(data.pecas_json || '{}');
        data.mao_obra = JSON.parse(data.mao_obra_json || '{}');
        if (req.file) data.imagem_path = req.file.path;

        const timestamp = Math.floor(Date.now() / 1000);
        const pdfFilename = `orcamento_${data.os}_${timestamp}.pdf`;
        const pdfPath = path.join(DATA_DIR, pdfFilename);

        generatePdf(data, pdfPath)
            .then(() => {
                // Salva metadados para o histórico (isso continua)
                const metadata = readMetadata();
                const newEntry = { os: data.os, defeito: data.defeito, date: new Date().toISOString(), pdfFile: pdfFilename, imageFile: data.imagem_path || null };
                metadata.push(newEntry);
                writeMetadata(metadata);
                
                // O BLOCO DE CÓDIGO QUE ADICIONAVA A LINHA NA PLANILHA FOI REMOVIDO DAQUI.

                res.json({ success: true, file: pdfFilename });
            })
            .catch(err => {
                console.error("Erro ao gerar PDF:", err);
                res.status(500).json({ success: false, error: `Falha ao gerar o PDF: ${err.message}` });
            });
    } catch (error) {
        console.error("Erro na rota /generate:", error);
        res.status(500).json({ success: false, error: "Erro interno do servidor." });
    }
});

app.get('/delete/:os/:file', (req, res) => {
    const fileToDelete = req.params.file;
    let metadata = readMetadata();
    const entryToDelete = metadata.find(b => b.pdfFile === fileToDelete);
    if (entryToDelete) {
        const pdfPath = path.join(DATA_DIR, entryToDelete.pdfFile);
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        if (entryToDelete.imageFile && fs.existsSync(entryToDelete.imageFile)) fs.unlinkSync(entryToDelete.imageFile);
        const updatedMetadata = metadata.filter(b => b.pdfFile !== fileToDelete);
        writeMetadata(updatedMetadata);
    }
    res.redirect('/history');
});

app.get('/history', (req, res) => {
    const budgets = readMetadata().sort((a, b) => new Date(b.date) - new Date(a.date));
    res.render('history', { budgets });
});

// --- ROTAS PARA A PLANILHA ---
app.get('/planilha', (req, res) => {
    res.render('planilha');
});

app.get('/api/planilha', (req, res) => {
    const data = readPlanilha();
    res.json(data);
});

app.post('/api/planilha', (req, res) => {
    try {
        writePlanilha(req.body);
        res.json({ success: true, message: 'Planilha salva com sucesso.' });
    } catch (error) {
        console.error("Erro ao salvar planilha:", error);
        res.status(500).json({ success: false, error: 'Erro ao salvar dados.' });
    }
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(port, () => {
    console.log(`Aplicação iniciada com sucesso na porta ${port}`);
});