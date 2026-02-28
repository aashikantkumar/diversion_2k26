// ============================================
// TEXT CHUNKER — Member 2's Utility
// ============================================
// Owner: MEMBER 2 (AI/Logic Engineer)
// Purpose: Split long text into manageable sections for Gemini API

/**
 * Split text into chunks of approximately maxChars characters
 * Tries to break at paragraph boundaries, then sentence boundaries
 * @param {string} text - Raw text to split
 * @param {number} maxChars - Maximum characters per chunk (default: 3000)
 * @returns {string[]} - Array of text chunks
 */
function chunkText(text, maxChars = 3000) {
    if (!text || text.length <= maxChars) {
        return [text];
    }

    const chunks = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = "";

    for (const para of paragraphs) {
        // If adding this paragraph exceeds the limit
        if (currentChunk.length + para.length + 2 > maxChars) {
            // Save current chunk if it has content
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
            }

            // If the paragraph itself is too long, split by sentences
            if (para.length > maxChars) {
                const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
                currentChunk = "";

                for (const sentence of sentences) {
                    if (currentChunk.length + sentence.length > maxChars) {
                        if (currentChunk.trim()) {
                            chunks.push(currentChunk.trim());
                        }
                        currentChunk = sentence;
                    } else {
                        currentChunk += sentence;
                    }
                }
            } else {
                currentChunk = para;
            }
        } else {
            currentChunk += (currentChunk ? "\n\n" : "") + para;
        }
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

module.exports = { chunkText };
