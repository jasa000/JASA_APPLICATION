
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

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);

    try {
        // Stream the file to a temporary location
        const readableStream = file.stream();
        const writeStream = fs.createWriteStream(tempFilePath);
        
        await new Promise((resolve, reject) => {
            Readable.fromWeb(readableStream as any).pipe(writeStream)
                .on('finish', resolve)
                .on('error', reject);
        });

        // Determine resource type based on file extension
        const isImage = file.type.startsWith('image/');
        const resourceType = isImage ? 'image' : 'raw';

        // Upload to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(tempFilePath, {
            folder: "jasa_documents",
            resource_type: resourceType,
            public_id: file.name.replace(/\.[^/.]+$/, ""), // Use original name without extension as base ID
            use_filename: true,
            unique_filename: true,
        });

        if (!uploadResponse.secure_url) {
            throw new Error("Cloudinary upload failed to return a URL.");
        }

        return NextResponse.json({
            success: true,
            fileId: uploadResponse.public_id,
            url: uploadResponse.secure_url,
        }, { status: 200 });

    } catch (e: any) {
        console.error('Error in POST /api/upload:', e);
        return NextResponse.json({ error: "Upload failed", details: e.message }, { status: 500 });
    } finally {
        // Clean up the temporary file
        try {
            if (fs.existsSync(tempFilePath)) {
                await fs.promises.unlink(tempFilePath);
            }
        } catch (unlinkError) {
            console.error("Failed to delete temporary file:", tempFilePath, unlinkError);
        }
    }
}
