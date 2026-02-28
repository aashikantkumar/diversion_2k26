// ============================================
// SMART CHUNKER — Overlap Chunking + Metadata
// ============================================
// Purpose: Split lesson text into semantically meaningful chunks
//          with configurable overlap so no context is lost at boundaries.
//
// Improvements over original chunker.js:
//   - Configurable overlap (default 100 chars)
//   - Section heading detection
//   - Character offset tracking (for source attribution)
//   - Metadata per chunk (section name, position)
//
// The original chunker.js is KEPT for transform route (3000-char chunks).
// This chunker is specifically designed for RAG retrieval (smaller chunks).

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_OVERLAP = 100;

/**
 * @typedef {Object} ChunkWithMeta
 * @property {string} text       - Chunk content
 * @property {number} index      - Position in document (0-based)
 * @property {number} charStart  - Character offset start
 * @property {number} charEnd    - Character offset end
 * @property {string} section    - Detected section heading
 * @property {object} metadata   - Extra info
 */

/**
 * Detect if a line is a section heading.
 * Matches: ALL CAPS lines, numbered headings (1. Introduction), markdown (#)
 */
function detectHeading(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 120) return null;

    // ALL CAPS line (at least 3 words)
    if (/^[A-Z\s\d:,\-]+$/.test(trimmed) && trimmed.split(/\s+/).length >= 2) {
        return trimmed;
    }
    // Numbered heading: "1. Introduction" or "Chapter 2:"
    if (/^\d+[\.\)]\s+\w/.test(trimmed)) {
        return trimmed;
    }
    // Markdown heading
    if (/^#{1,4}\s+/.test(trimmed)) {
        return trimmed.replace(/^#+\s*/, "");
    }

    return null;
}

/**
 * Smart chunk text with overlap and metadata.
 *
 * @param {string} text       - Raw document text
 * @param {object} options
 * @param {number} options.chunkSize  - Max chars per chunk (default 500)
 * @param {number} options.overlap    - Overlap chars between chunks (default 100)
 * @param {string} options.lessonId   - Lesson identifier for metadata
 * @returns {ChunkWithMeta[]}
 */
function smartChunk(text, options = {}) {
    const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
    const overlap = options.overlap || DEFAULT_OVERLAP;
    const lessonId = options.lessonId || null;

    if (!text || text.trim().length === 0) return [];
    if (text.length <= chunkSize) {
        return [{
            text: text.trim(),
            index: 0,
            charStart: 0,
            charEnd: text.length,
            section: "",
            metadata: { lessonId, totalChunks: 1 },
        }];
    }

    const paragraphs = text.split(/\n\n+/);
    const chunks = [];
    let currentText = "";
    let currentSection = "";
    let charOffset = 0;

    for (const para of paragraphs) {
        // Check if this paragraph is a heading
        const heading = detectHeading(para);
        if (heading) {
            currentSection = heading;
        }

        // If adding this paragraph exceeds chunk size
        if (currentText.length + para.length + 2 > chunkSize && currentText.trim()) {
            // Save current chunk
            const chunkText = currentText.trim();
            chunks.push({
                text: chunkText,
                index: chunks.length,
                charStart: charOffset - currentText.length,
                charEnd: charOffset,
                section: currentSection,
                metadata: { lessonId },
            });

            // Start new chunk with overlap from end of previous
            if (overlap > 0 && chunkText.length > overlap) {
                // Take overlap from the end of previous chunk
                const overlapText = chunkText.slice(-overlap);
                currentText = overlapText + "\n\n" + para;
            } else {
                currentText = para;
            }
        } else {
            currentText += (currentText ? "\n\n" : "") + para;
        }

        charOffset += para.length + 2; // +2 for \n\n
    }

    // Push the last chunk
    if (currentText.trim()) {
        chunks.push({
            text: currentText.trim(),
            index: chunks.length,
            charStart: charOffset - currentText.length,
            charEnd: charOffset,
            section: currentSection,
            metadata: { lessonId },
        });
    }

    // Handle very long paragraphs that exceed chunkSize
    const finalChunks = [];
    for (const chunk of chunks) {
        if (chunk.text.length <= chunkSize * 1.5) {
            chunk.metadata.totalChunks = chunks.length;
            finalChunks.push(chunk);
        } else {
            // Split oversized chunk by sentences
            const sentences = chunk.text.match(/[^.!?]+[.!?]+/g) || [chunk.text];
            let sentenceChunk = "";

            for (const sentence of sentences) {
                if (sentenceChunk.length + sentence.length > chunkSize) {
                    if (sentenceChunk.trim()) {
                        finalChunks.push({
                            text: sentenceChunk.trim(),
                            index: finalChunks.length,
                            charStart: chunk.charStart,
                            charEnd: chunk.charEnd,
                            section: chunk.section,
                            metadata: { lessonId },
                        });
                    }
                    sentenceChunk = sentence;
                } else {
                    sentenceChunk += sentence;
                }
            }
            if (sentenceChunk.trim()) {
                finalChunks.push({
                    text: sentenceChunk.trim(),
                    index: finalChunks.length,
                    charStart: chunk.charStart,
                    charEnd: chunk.charEnd,
                    section: chunk.section,
                    metadata: { lessonId },
                });
            }
        }
    }

    // Update totalChunks in all metadata
    for (const c of finalChunks) {
        c.metadata.totalChunks = finalChunks.length;
        c.index = finalChunks.indexOf(c);
    }

    return finalChunks;
}

module.exports = { smartChunk, detectHeading, DEFAULT_CHUNK_SIZE, DEFAULT_OVERLAP };
