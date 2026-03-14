import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';

/**
 * API Route to handle file uploads to Supabase Storage.
 * Supports files up to 100MB.
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const fileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
        
        // Upload to Supabase Storage 'jasa-documents' bucket
        const { data, error } = await supabaseAdmin.storage
            .from('jasa-documents')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            throw error;
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('jasa-documents')
            .getPublicUrl(data.path);

        return NextResponse.json({
            success: true,
            fileId: data.path,
            url: publicUrl,
        }, { status: 200 });

    } catch (e: any) {
        console.error('CRITICAL UPLOAD ERROR:', e);
        return NextResponse.json({ 
            error: "Upload failed", 
            details: e.message || "Internal server error during upload process."
        }, { status: 500 });
    }
}
