// ============================================
// MULTER CONFIG — Member 3's Middleware
// ============================================
// Owner: MEMBER 3 (Data Plumber)
// Purpose: Handle PDF file uploads via multipart/form-data

const multer = require("multer");
const path = require("path");

// Store uploaded files in memory (buffer) for immediate processing
// No need to save to disk in a hackathon — process and discard
const storage = multer.memoryStorage();

// File filter: only accept PDFs
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF files are allowed!"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
});

module.exports = upload;
