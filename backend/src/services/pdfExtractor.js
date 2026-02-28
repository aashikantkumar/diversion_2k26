// ============================================
// PDF EXTRACTOR — Member 3's Service
// ============================================
// Owner: MEMBER 3 (Data Plumber)
// Purpose: Extract raw text from uploaded PDF files

const pdfParse = require("pdf-parse");
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

/**
 * Fallback: write buffer to a temp file and use pdftotext CLI
 */
async function extractWithPdftotext(pdfBuffer) {
    const tmpFile = path.join(os.tmpdir(), `upload_${Date.now()}.pdf`);
    try {
        fs.writeFileSync(tmpFile, pdfBuffer);
        const text = execSync(`pdftotext "${tmpFile}" -`, { encoding: "utf8" });
        return {
            text: text.trim(),
            numPages: 1,
            info: { title: null, author: null, subject: null },
        };
    } finally {
        try { fs.unlinkSync(tmpFile); } catch (_) {}
    }
}

/**
 * Extract text content from a PDF buffer
 * Tries pdf-parse first; falls back to pdftotext CLI if that fails.
 * @param {Buffer} pdfBuffer - The PDF file as a Buffer (from multer memory storage)
 * @returns {object} - { text, numPages, info }
 */
async function extractTextFromPDF(pdfBuffer) {
    try {
        const data = await pdfParse(pdfBuffer);
        return {
            text: data.text.trim(),
            numPages: data.numpages,
            info: {
                title: data.info?.Title || null,
                author: data.info?.Author || null,
                subject: data.info?.Subject || null,
            },
        };
    } catch (primaryError) {
        console.warn(`   ⚠️  pdf-parse failed (${primaryError.message}), trying pdftotext fallback...`);
        try {
            const result = await extractWithPdftotext(pdfBuffer);
            console.log(`   ✅ pdftotext fallback succeeded`);
            return result;
        } catch (fallbackError) {
            console.error("PDF Extraction Error:", fallbackError.message);
            throw new Error(`Failed to extract text from PDF: ${primaryError.message}`);
        }
    }
}

module.exports = { extractTextFromPDF };
