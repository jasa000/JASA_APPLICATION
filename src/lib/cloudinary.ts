
'use server';
import { v2 as cloudinary } from 'cloudinary';
import { getAllProductImageUrls, getAllHomepageImageUrls, getAllPaperSampleImageUrls } from './data';

// Configuration must be at the top, before any other cloudinary calls
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function getCloudinaryUsage() {
  try {
    const result = await cloudinary.api.usage();
    return result;
  } catch (error) {
    console.error('Error fetching Cloudinary usage:', error);
    throw new Error('Could not fetch Cloudinary usage data.');
  }
}

export async function getAllCloudinaryImages() {
  try {
    const { resources } = await cloudinary.search
      .expression('resource_type:image')
      .sort_by('created_at', 'desc')
      .max_results(500)
      .execute();

    // Fetch all used image URLs efficiently
    const [productImageUrls, homepageImageUrls, paperSampleImageUrls] = await Promise.all([
      getAllProductImageUrls(),
      getAllHomepageImageUrls(),
      getAllPaperSampleImageUrls(),
    ]);

    const usedUrls = new Set([
        ...productImageUrls, 
        ...homepageImageUrls,
        ...paperSampleImageUrls
    ]);

    const images = resources.map((resource: any) => ({
      id: resource.public_id,
      url: resource.secure_url,
      createdAt: resource.created_at,
      bytes: resource.bytes,
      isUsed: usedUrls.has(resource.secure_url),
    }));

    return images;
  } catch (error) {
    console.error('Error fetching Cloudinary images:', error);
    throw new Error('Could not fetch images from Cloudinary.');
  }
}


export async function deleteCloudinaryImage(publicId: string) {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting Cloudinary image:', error);
        throw new Error('Could not delete image from Cloudinary.');
    }
}

export async function deleteCloudinaryImages(publicIds: string[]) {
    try {
        const result = await cloudinary.api.delete_resources(publicIds);
        return result;
    } catch (error) {
        console.error('Error deleting multiple Cloudinary images:', error);
        throw new Error('Could not delete images from Cloudinary.');
    }
}

export async function unsignedUpload(file: string, preset: string) {
    try {
        const result = await cloudinary.uploader.upload(file, {
            upload_preset: preset,
        });
        return result;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error('Image upload failed.');
    }
}
