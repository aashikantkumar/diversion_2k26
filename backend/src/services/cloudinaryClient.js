// ============================================
// CLOUDINARY CLIENT — Image Upload to Cloud CDN
// ============================================
// Purpose: Upload AI-generated images to Cloudinary for permanent CDN-backed URLs.
// Flow: Buffer → Cloudinary upload → Returns { url, publicId, ... }

const cloudinary = require("cloudinary").v2;
const config = require("../config");

// Configure Cloudinary
cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image buffer to Cloudinary.
 * 
 * @param {Buffer} imageBuffer - The PNG image buffer
 * @param {object} options - Upload options
 * @param {string} options.folder - Cloudinary folder (e.g., "neuroadapt/adhd")
 * @param {string} options.publicId - Custom public ID for the image
 * @param {string[]} [options.tags] - Tags for organization
 * @returns {Promise<{url: string, secureUrl: string, publicId: string, width: number, height: number, format: string, bytes: number}>}
 */
async function uploadImage(imageBuffer, options = {}) {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: options.folder || "neuroadapt",
            public_id: options.publicId || undefined,
            resource_type: "image",
            tags: options.tags || [],
            overwrite: true,
        };

        // Upload via stream from buffer
        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error("   ❌ Cloudinary upload error:", error.message);
                    return reject(error);
                }
                console.log(`   ☁️  Cloudinary upload: ${result.secure_url} (${(result.bytes / 1024).toFixed(1)} KB)`);
                resolve({
                    url: result.url,
                    secureUrl: result.secure_url,
                    publicId: result.public_id,
                    width: result.width,
                    height: result.height,
                    format: result.format,
                    bytes: result.bytes,
                });
            }
        );

        // Write buffer to the upload stream
        uploadStream.end(imageBuffer);
    });
}

/**
 * Upload a generated educational image to Cloudinary with proper naming.
 * 
 * @param {Buffer} imageBuffer - PNG image buffer from HuggingFace
 * @param {string} topic - Lesson topic (e.g., "Solar System")
 * @param {string} mode - Learning mode (adhd, dyslexia, dyscalculia, simplified)
 * @returns {Promise<object>} Cloudinary result with URL
 */
async function uploadGeneratedImage(imageBuffer, topic, mode) {
    // Clean topic name for use as public_id
    const cleanTopic = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const timestamp = Date.now();
    const publicId = `${cleanTopic}_${mode}_${timestamp}`;

    return uploadImage(imageBuffer, {
        folder: `neuroadapt/${mode}`,
        publicId,
        tags: ["neuroadapt", mode, cleanTopic, "ai-generated"],
    });
}

/**
 * Delete an image from Cloudinary by public ID.
 */
async function deleteImage(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === "ok";
    } catch (error) {
        console.error("Cloudinary delete error:", error.message);
        return false;
    }
}

/**
 * Upload a generated video buffer to Cloudinary.
 * Uses resource_type: "video" so CDN can stream it.
 *
 * @param {Buffer} videoBuffer - Raw mp4 / webm binary
 * @param {string} topic       - Lesson topic (used in public ID)
 * @param {string} mode        - Learning mode (dyslexia | adhd | dyscalculia | simplified)
 * @returns {Promise<{url:string, publicId:string, bytes:number, duration:number|undefined}>}
 */
async function uploadGeneratedVideo(videoBuffer, topic, mode) {
    const sanitized = topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 50);
    const timestamp = Date.now();
    const publicId = `neuroadapt/videos/${mode}/${sanitized}_${timestamp}`;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "video",
                public_id: publicId,
                folder: `neuroadapt/videos/${mode}`,
                format: "mp4",
                overwrite: false,
                tags: ["neuroadapt", "generated", mode],
            },
            (error, result) => {
                if (error) return reject(new Error(`Cloudinary video upload error: ${error.message}`));
                resolve({
                    url:      result.secure_url,
                    publicId: result.public_id,
                    bytes:    result.bytes,
                    duration: result.duration, // seconds (Cloudinary calculates this)
                    width:    result.width,
                    height:   result.height,
                });
            }
        );
        uploadStream.end(videoBuffer);
    });
}

/**
 * Delete a video from Cloudinary by public ID.
 */
async function deleteVideo(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
        return result.result === "ok";
    } catch (error) {
        console.error("Cloudinary video delete error:", error.message);
        return false;
    }
}

/**
 * Check if Cloudinary is configured.
 */
function isConfigured() {
    return !!(config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET);
}

module.exports = {
    uploadImage,
    uploadGeneratedImage,
    deleteImage,
    uploadGeneratedVideo,
    deleteVideo,
    isConfigured,
    cloudinary,
};
