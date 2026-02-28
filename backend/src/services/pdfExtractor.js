// ============================================
// PDF EXTRACTOR — Member 3's Service
// ============================================
// Owner: MEMBER 3 (Data Plumber)
// Purpose: Extract raw text from uploaded PDF files

const pdfParse = require("pdf-parse");

/**
 * Extract text content from a PDF buffer
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
    } catch (error) {
        console.error("PDF Extraction Error:", error.message);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
}

module.exports = { extractTextFromPDF };
