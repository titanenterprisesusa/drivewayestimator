import { useGetQrCode } from "@workspace/api-client-react";
import { TitanHeader } from "@/components/TitanHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function QrPage() {
  const { data: qr, isLoading } = useGetQrCode();

  return (
    <div className="titan-bg min-h-screen w-full flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-[480px] space-y-6">
        <TitanHeader subtitle="Share Your Estimator" />

        <Card className="border-border">
          <CardContent className="pt-8 flex flex-col items-center space-y-6">
            <p className="text-center text-sm text-muted-foreground">
              Print this QR code on door hangers, flyers, or business cards. Customers scan it to
              measure their driveway and get an instant quote.
            </p>

            <div className="bg-white p-4 rounded-xl">
              {isLoading ? (
                <div className="w-64 h-64 bg-gray-200 animate-pulse rounded-md" />
              ) : qr ? (
                <img src={qr.dataUrl} alt="QR Code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                  Failed to load QR code
                </div>
              )}
            </div>

            {qr && (
              <p className="text-xs text-muted-foreground text-center break-all">
                {qr.url}
              </p>
            )}

            <Button className="w-full h-12 text-base" onClick={() => window.print()}>
              Print QR Code
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
