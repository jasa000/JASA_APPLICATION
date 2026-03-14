import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from 'cloudinary';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * API Route to handle file uploads to Cloudinary.
 * Supports files up to 100MB using chunked uploading.
 */
export async function POST(req: NextRequest) {
    let tempFilePath = "";
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Convert the File object to a Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Create a safe temporary file path
        const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${safeName}`);

        // Write to local disk temporarily to allow Cloudinary to read it as a stream
        await fs.writeFile(tempFilePath, buffer);

        // Determine if it's an image or other file type
        const isImage = file.type.startsWith('image/');
        const resourceType = isImage ? 'image' : 'raw';

        // Use upload_large for chunked uploading (crucial for files > 10MB)
        const uploadResponse = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_large(tempFilePath, {
                folder: "jasa_documents",
                resource_type: resourceType,
                public_id: file.name.replace(/\.[^/.]+$/, ""),
                use_filename: true,
                unique_filename: true,
                chunk_size: 6000000, // 6MB chunks
            }, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            });
        }) as any;

        // Clean up the temporary file
        await fs.unlink(tempFilePath).catch(() => {});

        return NextResponse.json({
            success: true,
            fileId: uploadResponse.public_id,
            url: uploadResponse.secure_url,
        }, { status: 200 });

    } catch (e: any) {
        console.error('CRITICAL UPLOAD ERROR:', e);
        // Ensure cleanup on error
        if (tempFilePath) {
            await fs.unlink(tempFilePath).catch(() => {});
        }
        return NextResponse.json({ 
            error: "Upload failed", 
            details: e.message || "Internal server error during upload process."
        }, { status: 500 });
    }
}
