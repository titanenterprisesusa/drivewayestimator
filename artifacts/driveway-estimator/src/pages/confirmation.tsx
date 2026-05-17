import { Link, useParams } from "wouter";
import { useGetEstimate, getGetEstimateQueryKey } from "@workspace/api-client-react";
import { TitanHeader } from "@/components/TitanHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function Confirmation() {
  const params = useParams();
  const { data: estimate, isLoading } = useGetEstimate(Number(params.id), {
    query: { enabled: !!params.id, queryKey: getGetEstimateQueryKey(Number(params.id)) },
  });

  if (isLoading)
    return (
      <div className="titan-bg min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  if (!estimate)
    return (
      <div className="titan-bg min-h-screen flex items-center justify-center text-muted-foreground">
        Estimate not found
      </div>
    );

  return (
    <div className="titan-bg min-h-screen w-full flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-[480px] space-y-6">
        <TitanHeader />

        <Card className="border-border overflow-hidden">
          <div
            className="py-8 flex flex-col items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(43 62% 30%), hsl(43 62% 18%))" }}
          >
            <CheckCircle2 className="w-14 h-14 mb-3" style={{ color: "hsl(43 62% 75%)" }} />
            <h1 className="text-2xl font-bold text-white">Request Received</h1>
          </div>

          <CardContent className="pt-8 space-y-5">
            <p className="text-lg text-center">
              Thank you, <span className="font-bold text-primary">{estimate.customerName}</span>.
            </p>
            <p className="text-muted-foreground text-center text-sm">
              We received your estimate request for{" "}
              <span className="text-foreground font-medium">{estimate.address}</span>.
            </p>

            <div className="bg-secondary rounded-md p-6 text-center space-y-1">
              <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Estimated Total
              </span>
              <span className="text-4xl font-bold text-primary">
                ${estimate.totalPrice.toFixed(2)}
              </span>
              {estimate.notes && (
                <p className="text-xs text-muted-foreground mt-2">{estimate.notes}</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground italic text-center">
              This estimate is only valid if the actual driveway size is within 10% of the measured
              area. Final pricing confirmed on-site.
            </p>

            <p className="text-sm font-medium text-center">
              We will be in touch soon to confirm your appointment.
            </p>

            <div className="pt-4 text-center space-y-1">
              <p className="text-sm font-bold text-primary">(401) 213-9589</p>
              <p className="text-xs text-muted-foreground">TitanEnterprisesUSA.com</p>
              <Link href="/" className="block text-xs text-muted-foreground hover:text-primary mt-3">
                Return to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
