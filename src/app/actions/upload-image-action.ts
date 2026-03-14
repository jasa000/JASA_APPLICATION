
'use server';

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary for non-Xerox images
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Uploads an image to Cloudinary.
 * Used for products, banners, and homepage content.
 */
export async function uploadImageAction(
  base64Image: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Basic validation
    if (!base64Image.startsWith('data:image')) {
      throw new Error('Invalid image format. Expected base64 data URI.');
    }

    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'jasa_essentials',
      resource_type: 'image',
    });
    
    return { success: true, url: result.secure_url };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error.message);
    return { success: false, error: error.message };
  }
}
