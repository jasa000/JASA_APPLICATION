'use server';

import { v2 as cloudinary } from 'cloudinary';
import { getAllOrderImageUrls } from '@/lib/data';
import { OrderStatus } from '@/lib/types';

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Helper to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export async function getDriveUsageAction() {
  try {
    const result = await cloudinary.api.usage();
    // Some plans return storage in different levels, normalizing here
    const storage = result.storage || { usage: 0, limit: 0 };
    return {
      limit: storage.limit,
      usage: storage.usage,
    };
  } catch (error: any) {
    console.error('Error fetching Cloudinary usage:', error);
    throw new Error('Could not fetch Cloudinary usage data.');
  }
}

const getOrderStatusCategory = (status: OrderStatus): 'Active' | 'Delivered' | 'Cancelled/Rejected' => {
    const activeStatuses: OrderStatus[] = [
        "Pending Confirmation", 
        "Processing", 
        "Packed", 
        "Shipped", 
        "Out for Delivery", 
        "Pending Delivery Confirmation",
        "Return Requested", 
        "Return Approved", 
        "Out for Pickup", 
        "Picked Up", 
        "Pending Return Confirmation",
        "Replacement Confirmed",
        "Pending Replacement Confirmation"
    ];
    const deliveredStatuses: OrderStatus[] = ["Delivered", "Return Completed", "Replacement Completed"];
    
    if (activeStatuses.includes(status)) return 'Active';
    if (deliveredStatuses.includes(status)) return 'Delivered';
    return 'Cancelled/Rejected';
};

export async function getDriveFilesAction(): Promise<{ error?: string; files: any[] }> {
  try {
    // Fetch resources from 'jasa_documents' folder for both raw and image types
    // Admin API is used here which has better search/filter capabilities for management
    const [rawResources, imageResources, allOrderImages] = await Promise.all([
      cloudinary.api.resources({ 
        type: 'upload', 
        prefix: 'jasa_documents/', 
        resource_type: 'raw',
        max_results: 500 
      }),
      cloudinary.api.resources({ 
        type: 'upload', 
        prefix: 'jasa_documents/', 
        resource_type: 'image',
        max_results: 500 
      }),
      getAllOrderImageUrls()
    ]);
    
    // Create a map of URL to status for fast lookup
    const urlToOrderStatus = new Map<string, OrderStatus>();
    allOrderImages.forEach(order => {
        if (order.productImage) {
            urlToOrderStatus.set(order.productImage, order.status);
        }
    });

    const allResources = [...(rawResources.resources || []), ...(imageResources.resources || [])];

    const files = allResources.map((resource: any) => {
        const orderStatus = urlToOrderStatus.get(resource.secure_url);
        let statusCategory: 'Active' | 'Delivered' | 'Cancelled/Rejected' | 'Unused' = 'Unused';
        
        if(orderStatus) {
            statusCategory = getOrderStatusCategory(orderStatus);
        }
        
        return {
          id: resource.public_id,
          name: resource.filename || resource.public_id.split('/').pop() || 'Untitled',
          size: resource.bytes ? formatBytes(Number(resource.bytes)) : 'N/A',
          createdTime: resource.created_at || new Date().toISOString(),
          webViewLink: resource.secure_url,
          orderStatus: statusCategory,
          resourceType: resource.resource_type // 'image' or 'raw'
        }
    });

    // Sort by most recent first
    files.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());

    return { files };
  } catch (error: any) {
    console.error('Error fetching Cloudinary files:', error);
    return { error: 'Could not fetch files from Cloudinary. Check environment variables.', files: [] };
  }
}

export async function deleteDriveFileAction(publicId: string, resourceType: string = 'raw') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting Cloudinary file:', error);
    throw new Error('Could not delete file from Cloudinary.');
  }
}

export async function deleteDriveFilesAction(fileIds: string[]) {
    try {
        // Individual deletion is safer for mixed resource types in a single action
        await Promise.all(fileIds.map(async id => {
            // We try both types if we don't track them explicitly in the selection
            // In a more complex app, we'd pass the resourceType from the UI
            await cloudinary.uploader.destroy(id, { resource_type: 'raw' });
            await cloudinary.uploader.destroy(id, { resource_type: 'image' });
        }));
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting multiple Cloudinary files:', error);
        throw new Error('Could not delete all selected files.');
    }
}
