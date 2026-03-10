
"use client";

import { cn } from "@/lib/utils";
import { Package, ShieldCheck, Truck, Home, Undo2, CheckCircle, RefreshCw, XCircle } from "lucide-react";
import type { Order } from "@/lib/types";

type OrderTrackerProps = {
  trackingInfo: Order['tracking'];
  status: Order['status'];
  orderType?: 'refund' | 'replacement';
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const formatTime = (dateString?: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function OrderTracker({ trackingInfo, status, orderType }: OrderTrackerProps) {
  if (!trackingInfo) return null;

  const isCancelled = status === 'Cancelled' || status === 'Rejected';

  const standardSteps = [
    { id: "ordered", label: "Confirmed", icon: isCancelled ? XCircle : ShieldCheck, date: trackingInfo.confirmed },
    { id: "packed", label: "Packed", icon: isCancelled ? XCircle : Package, date: trackingInfo.packed },
    { id: "shipped", label: "Shipped", icon: isCancelled ? XCircle : Truck, date: trackingInfo.shipped },
    { id: "delivered", label: "Delivered", icon: isCancelled ? XCircle : Home, date: trackingInfo.delivered },
  ];

  const returnSteps = [
    { id: "requested", label: "Return Requested", icon: Undo2, date: trackingInfo.returnRequested },
    { id: "approved", label: "Approved", icon: ShieldCheck, date: trackingInfo.returnApproved },
    { id: "pickup", label: "Out for Pickup", icon: Truck, date: trackingInfo.outForPickup },
    { id: "returned", label: "Completed", icon: CheckCircle, date: trackingInfo.returnCompleted },
  ];
  
  const replacementSteps = [
    { id: "requested", label: "Replacement Requested", icon: RefreshCw, date: trackingInfo.returnRequested },
    { id: "approved", label: "Confirmed", icon: ShieldCheck, date: trackingInfo.replacementConfirmed },
    { id: "packed", label: "Packed", icon: Package, date: trackingInfo.packed },
    { id: "shipped", label: "Shipped", icon: Truck, date: trackingInfo.shipped },
    { id: "delivered", label: "Completed", icon: Home, date: trackingInfo.replacementCompleted },
  ];

  let steps;
  let journeyTitle = 'Order Journey';
  if (orderType === 'replacement') {
    steps = replacementSteps;
    journeyTitle = 'Replacement Journey';
  } else if (orderType === 'refund' || (trackingInfo.returnRequested && orderType !== 'replacement')) {
    steps = returnSteps;
    journeyTitle = 'Return Journey';
  } else {
    steps = standardSteps;
  }
  
  let activeStepIndex = -1;
  for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].date) {
          activeStepIndex = i;
          break;
      }
  }
  
  if (isCancelled) {
    activeStepIndex = steps.length - 1;
  }

  return (
    <div className="py-4 px-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-md font-semibold">{journeyTitle}</h3>
        {!trackingInfo.returnRequested && trackingInfo.expectedDelivery && !trackingInfo.delivered && !isCancelled && (
            <p className="text-sm text-muted-foreground">
                Expected by: <span className="font-medium text-foreground">{formatDate(trackingInfo.expectedDelivery)}</span>
            </p>
        )}
      </div>

      <div className="relative flex items-start justify-between">
        <div className="absolute left-0 top-5 h-1 w-full -translate-y-1/2 bg-muted"></div>
        <div 
          className={cn(
            "absolute left-0 top-5 h-1 -translate-y-1/2 transition-all duration-500",
            isCancelled ? "bg-red-500" : "bg-green-600"
          )}
          style={{ width: activeStepIndex >= 0 ? `${(activeStepIndex / (steps.length - 1)) * 100}%` : "0%" }}
        ></div>

        {steps.map((step, index) => {
          const isCompleted = isCancelled || index <= activeStepIndex;
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center w-20">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isCompleted 
                    ? (isCancelled ? "border-red-500 bg-red-500 text-white" : "border-green-600 bg-green-600 text-white") 
                    : "border-muted-foreground bg-background text-muted-foreground"
                )}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <p className={cn(
                "mt-2 text-center text-xs font-semibold", 
                isCompleted 
                    ? (isCancelled ? "text-red-500" : "text-green-600")
                    : "text-muted-foreground"
              )}>
                {isCancelled ? "Cancelled" : step.label}
              </p>
               {step.date && !isCancelled ? (
                    <div className="text-center text-xs text-muted-foreground">
                        <p>{formatDate(step.date)}</p>
                        <p>{formatTime(step.date)}</p>
                    </div>
                ) : (
                   <div className="h-8"></div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
