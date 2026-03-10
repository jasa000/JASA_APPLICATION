
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck } from "lucide-react";

export default function TermsAndConditionsPage() {
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();

  const handleContinue = () => {
    if (agreed) {
      router.push("/signup");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="font-headline text-2xl">Terms & Conditions</CardTitle>
          <CardDescription>Please read and agree to the terms before creating an account.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 w-full rounded-md border p-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <h4 className="font-semibold text-foreground">1. Introduction & Acceptance</h4>
              <p>
                Welcome to Jasa Essentials. These Terms and Conditions are a binding legal agreement between you and Jasa Essentials. By creating an account, you confirm that you have read, understood, and agree to be bound by these terms. If you do not agree, do not register for an account.
              </p>

              <h4 className="font-semibold text-foreground">2. User Accounts</h4>
              <p>
                <strong>Eligibility:</strong> You must be at least 18 years of age to create an account. By registering, you represent that you meet this requirement.
              </p>
              <p>
                <strong>Account Creation:</strong> You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
              </p>
              <p>
                <strong>Account Security:</strong> You are responsible for safeguarding your password and for all activities that occur under your account. You agree not to disclose your password to any third party.
              </p>
              <p>
                <strong>Account Termination:</strong> We reserve the right to suspend or terminate your account at any time for any violation of these terms, without notice.
              </p>

              <h4 className="font-semibold text-foreground">3. Privacy & Data</h4>
              <p>
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, and share your personal data. By using our services, you agree to the collection and use of your information in accordance with our <a href="#" className="text-primary underline">Privacy Policy</a>. This includes data for order fulfillment, marketing communications, and service improvements. You have rights regarding your data, including access and deletion, as outlined in the policy.
              </p>

              <h4 className="font-semibold text-foreground">4. Acceptable Use Policy</h4>
              <p>
                You agree not to use the service for any unlawful purpose or to engage in any activity that is harmful, fraudulent, deceptive, or offensive. This includes but is not limited to spamming, hacking, or uploading malicious content.
              </p>

              <h4 className="font-semibold text-foreground">5. Intellectual Property</h4>
              <p>
                All content on this site, including logos, graphics, and text, is the property of Jasa Essentials and is protected by copyright and other intellectual property laws. You may not use, copy, or distribute any content without our prior written permission.
              </p>
              
              <h4 className="font-semibold text-foreground">6. Disclaimers & Limitation of Liability</h4>
              <p>
                The site and its content are provided on an "as is" basis without warranties of any kind. We do not guarantee the accuracy, completeness, or timeliness of information available from the service. Your use of the service is at your sole risk.
              </p>
              <p>
                To the fullest extent permitted by law, Jasa Essentials shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the service.
              </p>

              <h4 className="font-semibold text-foreground">7. Payments & Orders</h4>
              <p>
                All payments are processed through secure third-party payment gateways. By placing an order, you agree to our detailed <a href="#" className="text-primary underline">Shipping</a>, <a href="#" className="text-primary underline">Returns</a>, and <a href="#" className="text-primary underline">Refund</a> policies, which are linked below the registration form.
              </p>

              <h4 className="font-semibold text-foreground">8. Dispute Resolution</h4>
              <p>
                Any disputes arising out of these terms will be resolved through binding arbitration or in a small claims court, as specified in our full dispute resolution policy.
              </p>

              <h4 className="font-semibold text-foreground">9. Contact Information</h4>
              <p>
                If you have any questions about these Terms, please contact us at support@jasaessentials.com.
              </p>
            </div>
          </ScrollArea>
          <div className="mt-4 flex items-center space-x-2">
            <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} />
            <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I have read and agree to the Terms & Conditions.
            </Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleContinue} disabled={!agreed} className="w-full">
            Agree and Continue to Registration
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
