import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";
import path from "path";
import os from "os";
import { Readable } from "stream";

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export const config = {
  api: {
    bodyParser: false, // Disable body parser to handle large streams manually if needed
  },
};

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Create a safe filename for temporary storage
        const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${safeName}`);

        // Stream the file to a temporary location to save memory
        const readableStream = file.stream();
        const writeStream = fs.createWriteStream(tempFilePath);
        
        try {
            await new Promise((resolve, reject) => {
                Readable.fromWeb(readableStream as any).pipe(writeStream)
                    .on('finish', resolve)
                    .on('error', reject);
            });

            // Determine resource type based on file extension
            const isImage = file.type.startsWith('image/');
            const resourceType = isImage ? 'image' : 'raw';

            // Upload to Cloudinary using upload_large for files up to 100MB
            const uploadResponse = await cloudinary.uploader.upload_large(tempFilePath, {
                folder: "jasa_documents",
                resource_type: resourceType,
                public_id: file.name.replace(/\.[^/.]+$/, ""), // Base ID from filename
                use_filename: true,
                unique_filename: true,
                chunk_size: 6000000, // 6MB chunks for standard gateway limits
            });

            if (!uploadResponse.secure_url) {
                throw new Error("Cloudinary upload failed to return a secure URL.");
            }

            return NextResponse.json({
                success: true,
                fileId: uploadResponse.public_id,
                url: uploadResponse.secure_url,
            }, { status: 200 });

        } finally {
            // Clean up the temporary file regardless of success or failure
            if (fs.existsSync(tempFilePath)) {
                await fs.promises.unlink(tempFilePath).catch(err => console.error("Temp file cleanup failed:", err));
            }
        }

    } catch (e: any) {
        console.error('Error in POST /api/upload:', e);
        return NextResponse.json({ 
            error: "Upload failed", 
            details: e.message,
            hint: "If the file is very large, ensure your server limits allow the request body size."
        }, { status: 500 });
    }
}
