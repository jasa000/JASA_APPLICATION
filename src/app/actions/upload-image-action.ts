
'use server';

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary within the server action
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function uploadImageAction(
  base64Image: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // For server-side actions, it's more robust to use a standard authenticated upload
    // rather than relying on unsigned presets which can have configuration issues.
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: "jasa_essentials" // Optional: organize uploads in a specific folder
    });
    
    return { success: true, url: result.secure_url };
  } catch (error: any) {
    console.error('Upload action error:', error.message);
    return { success: false, error: error.message };
  }
}
