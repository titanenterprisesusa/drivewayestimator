import { Link, useParams } from "wouter";
import { useGetEstimate } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function Confirmation() {
  const params = useParams();
  const { data: estimate, isLoading } = useGetEstimate(Number(params.id), {
    query: { enabled: !!params.id }
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!estimate) return <div className="min-h-screen flex items-center justify-center">Estimate not found</div>;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center py-16 px-4">
      <div className="w-full max-w-[480px]">
        <Card className="border-border text-center overflow-hidden">
          <div className="bg-primary py-8 flex flex-col items-center justify-center">
            <CheckCircle2 className="w-16 h-16 text-primary-foreground mb-4" />
            <h1 className="text-2xl font-bold text-primary-foreground">Request Received</h1>
          </div>
          <CardContent className="pt-8 space-y-6">
            <p className="text-lg">
              Thank you, <span className="font-bold">{estimate.customerName}</span>.
            </p>
            <p className="text-muted-foreground">
              We have received your driveway sealing estimate request for <span className="text-foreground font-medium">{estimate.address}</span>.
            </p>
            
            <div className="bg-secondary p-6 rounded-md">
              <span className="block text-sm text-muted-foreground uppercase tracking-wider mb-2">Estimated Total</span>
              <span className="text-4xl font-bold text-primary">${estimate.totalPrice.toFixed(2)}</span>
            </div>

            <p className="text-sm font-medium">We'll be in touch soon to confirm your appointment.</p>
            
            <div className="pt-4">
              <Link href="/" className="text-primary hover:underline text-sm font-bold uppercase tracking-wider">
                Return to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
