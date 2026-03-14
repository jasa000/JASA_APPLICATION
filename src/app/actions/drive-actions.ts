'use server';

import { supabaseAdmin } from "@/lib/supabase";
import { getAllOrderImageUrls } from '@/lib/data';
import { OrderStatus } from '@/lib/types';

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
    // Supabase doesn't have a direct "usage" API via storage-js, 
    // returning a placeholder or potentially querying meta-tables if needed.
    // For now, we'll return a simple object.
    return {
      limit: 1024 * 1024 * 1024 * 5, // 5GB free tier estimate
      usage: 0, 
    };
  } catch (error: any) {
    console.error('Error fetching Supabase storage usage:', error);
    return { limit: 0, usage: 0 };
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
    const { data: supabaseFiles, error: storageError } = await supabaseAdmin.storage
      .from('jasa-documents')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (storageError) throw storageError;

    const allOrderImages = await getAllOrderImageUrls();
    
    // Create a map of public URL to status for fast lookup
    const urlToOrderStatus = new Map<string, OrderStatus>();
    allOrderImages.forEach(order => {
        if (order.productImage) {
            urlToOrderStatus.set(order.productImage, order.status);
        }
    });

    const files = supabaseFiles.map((file: any) => {
        // Construct the public URL manually for lookup
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('jasa-documents')
            .getPublicUrl(file.name);

        const orderStatus = urlToOrderStatus.get(publicUrl);
        let statusCategory: 'Active' | 'Delivered' | 'Cancelled/Rejected' | 'Unused' = 'Unused';
        
        if(orderStatus) {
            statusCategory = getOrderStatusCategory(orderStatus);
        }
        
        return {
          id: file.name,
          name: file.name,
          size: file.metadata?.size ? formatBytes(Number(file.metadata.size)) : 'N/A',
          createdTime: file.created_at || new Date().toISOString(),
          webViewLink: publicUrl,
          orderStatus: statusCategory,
          resourceType: file.metadata?.mimetype?.startsWith('image/') ? 'image' : 'raw'
        }
    });

    return { files };
  } catch (error: any) {
    console.error('Error fetching Supabase files:', error);
    return { error: 'Could not fetch files from Supabase. Check environment variables.', files: [] };
  }
}

export async function deleteDriveFileAction(fileName: string) {
  try {
    const { error } = await supabaseAdmin.storage
      .from('jasa-documents')
      .remove([fileName]);
    
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting Supabase file:', error);
    throw new Error('Could not delete file from Supabase.');
  }
}

export async function deleteDriveFilesAction(fileNames: string[]) {
    try {
        const { error } = await supabaseAdmin.storage
            .from('jasa-documents')
            .remove(fileNames);
        
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting multiple Supabase files:', error);
        throw new Error('Could not delete all selected files.');
    }
}
