

export type Product = {
  id: string;
  name: string;
  brandIds?: string[];
  authorIds?: string[];
  productTypeIds?: string[];
  description: string;
  category: 'stationary' | 'books' | 'electronics';
  price: number;
  discountPrice?: number;
  rating?: number;
  createdAt: string | null; // Changed to string for serialization
  imageNames?: string[];
};

export type XeroxDocument = {
    id: string; // Unique identifier for this cart item instance
    file: File | null;
    pageCount: number;
    price: number; // The calculated price for this single document configuration
    config: {
        paperType: string;
        colorOption: string;
        formatType: string;
        pageCount: number;
        printRatio: string;
        bindingType: string;
        laminationType: string;
        quantity: number;
        message: string;
    }
}

export type CartItem = {
    id: string; // This will be product.id or xeroxDocument.id
    type: 'stationary' | 'books' | 'electronics' | 'xerox';
    quantity: number;
    price: number; // Price per single unit at the time of adding
    // One of the following will be present
    product?: Product;
    xerox?: XeroxDocument;
};


export type DBCartItem = {
    id: string;
    type: 'stationary' | 'books' | 'electronics' | 'xerox';
    quantity: number;
    price: number | null;
    // For products
    productId: string | null;
    // For xerox
    xeroxConfig: XeroxDocument['config'] | null;
    xeroxFile: { name: string; type: string; pageCount: number } | null;
}

export type StoredXeroxJob = {
    id: string;
    fileDetails: { name: string; type: string; url: string; };
    pageCount: number; // This was missing
    price: number;
    config: {
        paperType: string;
        colorOption: string;
        formatType: string;
        pageCount: number;
        printRatio: string;
        bindingType: string;
        laminationType: string;
        quantity: number;
        message: string;
    };
};


export type Category = {
    id: string;
    name: string;
    href: string;
    icon: string;
    image: {
        src: string;
        alt: string;
        width: number;
        height: number;
        hint?: string;
    }
}

export const USER_ROLES = ['user', 'admin', 'seller', 'employee'] as const;
export type UserRole = typeof USER_ROLES[number];

export type Address = {
    type: 'Home' | 'Work';
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
};

export type UserProfile = {
  uid: string;
  shortId: string;
  name: string;
  email: string;
  roles: UserRole[];
  canManageProducts?: boolean; // New permission for employees
  mobile?: string;
  altMobiles?: { value: string }[];
  addresses?: Address[];
  userLocation?: UserLocation | null;
  cart?: DBCartItem[];
  createdAt: any; // Firestore timestamp can be complex, using 'any' for simplicity
}

export type Post = {
  id: string;
  content: string;
  authorId: string;
  isActive: boolean;
  createdAt: number; // Using number for timestamp (milliseconds)
};

export const SHOP_SERVICES = ['stationary', 'books', 'electronics', 'xerox'] as const;
export type ShopService = typeof SHOP_SERVICES[number];

export type Shop = {
  id:string;
  name: string;
  address: string;
  mobileNumbers?: string[];
  ownerIds: string[];
  employeeIds?: string[];
  ownerNames?: string[];
  employeeNames?: string[];
  services: ShopService[];
  locations?: string[];
  notes?: string;
  createdAt: any;
};

export type UserLocation = {
  name: string;
  pincode: string;
};
    
export type Brand = {
  id: string;
  name: string;
  category: 'stationary' | 'electronics';
  createdAt: any;
};

export type Author = {
  id: string;
  name: string;
  createdAt: any;
};

export type ProductType = {
  id: string;
  name: string;
  category: 'stationary' | 'books' | 'electronics';
  createdAt: any;
};

export type OrderStatus = 
  | "Pending Confirmation" 
  | "Processing" 
  | "Packed"
  | "Shipped" 
  | "Out for Delivery"
  | "Pending Delivery Confirmation"
  | "Delivered" 
  | "Cancelled" 
  | "Rejected"
  | "Return Requested"
  | "Return Approved"
  | "Out for Pickup"
  | "Picked Up"
  | "Pending Return Confirmation"
  | "Return Rejected"
  | "Return Completed"
  | "Replacement Confirmed"
  | "Pending Replacement Confirmation"
  | "Replacement Completed";


export type OrderTracking = {
  ordered: string; // ISO date string
  confirmed: string | null;
  packed: string | null;
  shipped: string | null;
  outForDelivery?: string | null;
  delivered: string | null;
  // Return tracking
  returnRequested?: string | null;
  returnApproved?: string | null;
  outForPickup?: string | null;
  pickedUp?: string | null;
  returnCompleted?: string | null;
  replacementConfirmed?: string | null;
  replacementCompleted?: string | null;
  expectedDelivery: string | null;
}

export type Order = {
  id: string;
  groupId: string; // New field to group orders from the same checkout
  userId: string;
  customerName: string; // Denormalized
  customerShortId: string; // Denormalized
  customerEmail: string; // Denormalized
  sellerId: string;
  shopName: string; // Denormalized
  productId?: string; // Optional for Xerox orders
  productName: string;
  productImage: string | null;
  quantity: number;
  price: number; // Price per item at time of order
  deliveryCharge: number;
  isDeliveryFeePaid?: boolean;
  shippingAddress: Address;
  mobile: string;
  altMobiles?: { value: string }[];
  status: OrderStatus;
  category: "stationary" | "books" | "electronics" | "xerox";
  rejectionReason?: string;
  cancellationReason?: string;
  returnReason?: string;
  returnType?: 'refund' | 'replacement';
  tracking: OrderTracking;
  xeroxConfig?: XeroxDocument['config'];
  createdAt: any;
};

export type Notification = {
  id: string;
  userId: string;
  orderId: string;
  title: string;
  message: string;
  sellerMobileNumbers: string[];
  isRead: boolean;
  createdAt: any;
}

export type Banner = {
  id: string;
  title: string;
  cta: string;
  href: string;
  imageUrl: string;
  isVisible: boolean;
};

export type HomepageContent = {
    isWelcomeVisible: boolean;
    welcomeImageUrl?: string;
    categoryImages: {
        stationary?: string;
        books?: string;
        xerox?: string;
        electronics?: string;
    };
    banners: Banner[];
};

export type XeroxService = {
  id: string;
  name: string;
  price: number;
  order: number;
  discountPrice?: number | null;
  unit?: string;
  createdAt: any;
};

// Types for Xerox Order Form Configuration
export type XeroxOptionType = 'paperType' | 'bindingType' | 'laminationType';

export const XEROX_OPTION_TYPES: XeroxOptionType[] = ['paperType', 'bindingType', 'laminationType'];


export type XeroxOption = {
  id: string;
  name: string;
  price?: number;
  priceBwFront?: number;
  priceBwBoth?: number;
  priceColorFront?: number;
  priceColorBoth?: number;
  order?: number;
  createdAt: any;
  // Fields for paperType dependency
  colorOptionIds?: string[];
  formatTypeIds?: string[];
  printRatioIds?: string[];
  bindingTypeIds?: string[];
  laminationTypeIds?: string[];
};

export type DeliveryChargeRule = {
    id: string; // For unique key in React
    from: number;
    to: number | null; // null represents infinity
    charge: number;
};

export type OrderSettings = {
    itemDeliveryRules: DeliveryChargeRule[];
    xeroxDeliveryRules: DeliveryChargeRule[];
};

export type Pincode = {
  pincode: string;
  areaName: string;
};

export type PincodeDistrict = {
  id: string;
  districtName: string;
  pincodes: Pincode[];
  isActive: boolean;
};

export type PaperSample = {
    id: string;
    name: string;
    description: string;
    imageUrls: string[];
    primaryImageIndex?: number;
    createdAt: any;
}

export type ContactInfo = {
  startYear?: number;
  address: string;
  phone: string;
  email: string;
  instagram?: string;
  youtube?: string;
  whatsapp?: string;
};

export type Query = {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  message: string;
  createdAt: any;
};
