'use server';

import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';

export async function uploadImageAction(
  base64Image: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Extract format and base64 data
    const matches = base64Image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image format');
    }

    const extension = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `${uuidv4()}.${extension}`;

    // Upload to Supabase Storage 'jasa-essentials' bucket
    const { data, error } = await supabaseAdmin.storage
      .from('jasa-essentials')
      .upload(fileName, buffer, {
        contentType: `image/${extension}`,
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('jasa-essentials')
      .getPublicUrl(data.path);
    
    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Upload action error:', error.message);
    return { success: false, error: error.message };
  }
}
