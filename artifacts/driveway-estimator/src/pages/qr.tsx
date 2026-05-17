import { useGetQrCode } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function QrPage() {
  const { data: qr, isLoading } = useGetQrCode();

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center py-16 px-4">
      <div className="w-full max-w-[480px] space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-primary">SEAL PRO</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest">Share Your Estimator</p>
        </div>

        <Card className="border-border">
          <CardContent className="pt-8 flex flex-col items-center space-y-8">
            <p className="text-center font-medium">
              Print this QR code on door hangers, flyers, or business cards. Customers can scan it to measure their driveway and get an instant quote.
            </p>

            <div className="bg-white p-4 rounded-xl">
              {isLoading ? (
                <div className="w-64 h-64 bg-gray-200 animate-pulse rounded-md" />
              ) : qr ? (
                <img src={qr.dataUrl} alt="QR Code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed">
                  Failed to load QR code
                </div>
              )}
            </div>

            <Button 
              className="w-full h-12 text-lg" 
              onClick={() => window.print()}
            >
              Print QR Code
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
