import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateEstimate } from "@workspace/api-client-react";
import { MapDraw } from "@/components/MapDraw";
import { TitanHeader } from "@/components/TitanHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Titan Enterprises HQ: 821 Post Road, Warwick, RI 02888
const HQ_LAT = 41.7065;
const HQ_LNG = -71.4538;

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Home() {
  const [, setLocation] = useLocation();
  const createEstimate = useCreateEstimate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
  });

  // Raw area from polygon draw
  const [rawSqFt, setRawSqFt] = useState(0);
  // Geocoded customer coords (set when map geocodes the address)
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hasCrackFill, setHasCrackFill] = useState(false);

  // Always apply 10% buffer to the drawn area
  const adjustedSqFt = rawSqFt > 0 ? Math.round(rawSqFt * 1.1) : 0;

  // Travel premium: $2/mile if 20+ miles from HQ
  const distanceMiles =
    customerCoords ? haversineMiles(HQ_LAT, HQ_LNG, customerCoords.lat, customerCoords.lng) : 0;
  const travelMiles = distanceMiles >= 20 ? Math.round(distanceMiles) : 0;
  const travelPremium = travelMiles > 0 ? travelMiles * 2 : 0;

  const calculatePricing = () => {
    let basePrice = 0;
    if (adjustedSqFt <= 750) basePrice = adjustedSqFt * 0.35;
    else if (adjustedSqFt <= 1500) basePrice = adjustedSqFt * 0.32;
    else basePrice = adjustedSqFt * 0.28;

    let crackFillPrice = 0;
    if (hasCrackFill) {
      if (adjustedSqFt <= 750) crackFillPrice = 50;
      else if (adjustedSqFt <= 1500) crackFillPrice = 65;
      else crackFillPrice = 80;
    }

    const totalPrice = basePrice + crackFillPrice + travelPremium;
    return { basePrice, crackFillPrice, totalPrice };
  };

  const { basePrice, crackFillPrice, totalPrice } = calculatePricing();

  const rateLabel =
    adjustedSqFt <= 750
      ? "$0.35/sq ft"
      : adjustedSqFt <= 1500
      ? "$0.32/sq ft"
      : "$0.28/sq ft";

  const handleAreaCalculated = (sqFt: number, lat: number, lng: number) => {
    setRawSqFt(sqFt);
    if (lat !== 0 && lng !== 0) {
      setCustomerCoords({ lat, lng });
    }
  };

  const handleSubmit = () => {
    const travelNote =
      travelPremium > 0
        ? `Travel premium: $${travelPremium.toFixed(2)} (${travelMiles} mi @ $2/mi)`
        : null;

    createEstimate.mutate(
      {
        data: {
          ...formData,
          squareFootage: adjustedSqFt,
          hasTreeObstruction: false,
          basePrice,
          crackFillPrice: hasCrackFill ? crackFillPrice : null,
          totalPrice,
          hasCrackFill,
          notes: travelNote,
        },
      },
      {
        onSuccess: (data) => {
          setLocation(`/confirmation/${data.id}`);
        },
      }
    );
  };

  return (
    <div className="titan-bg min-h-screen w-full flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-[480px] space-y-6">

        <TitanHeader subtitle="Driveway Estimator" />

        {/* Progress */}
        <div className="flex items-center">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex items-center ${s < 3 ? "flex-1" : ""}`}>
              <div
                className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  s === step
                    ? "bg-primary border-primary text-black"
                    : s < step
                    ? "bg-primary/30 border-primary/50 text-primary"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-0.5 transition-colors ${
                    s < step ? "bg-primary/60" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Customer Info */}
        {step === 1 && (
          <Card className="border-border">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-bold mb-2">Customer Details</h2>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  data-testid="input-name"
                  value={formData.customerName}
                  onChange={(e) => setFormData((f) => ({ ...f, customerName: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  data-testid="input-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Service Address</Label>
                <Input
                  id="address"
                  data-testid="input-address"
                  value={formData.address}
                  onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main St, City, ST"
                />
              </div>
              <Button
                data-testid="button-next-step-1"
                className="w-full mt-4"
                onClick={() => setStep(2)}
                disabled={
                  !formData.customerName || !formData.phone || !formData.email || !formData.address
                }
              >
                Next Step
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Map & Measurement */}
        {step === 2 && (
          <Card className="border-border">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-bold">Measure Your Driveway</h2>
              <p className="text-sm text-muted-foreground">
                Use the draw tool (polygon icon) on the map to trace the outline of your driveway.
                Zoom in for the best accuracy.
              </p>

              <div className="h-[420px] border border-border rounded-md overflow-hidden relative z-0">
                <MapDraw address={formData.address} onAreaCalculated={handleAreaCalculated} />
              </div>

              {rawSqFt > 0 && (
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-md text-center">
                  <span className="block text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                    Measured Area
                  </span>
                  <span className="text-3xl font-bold text-primary" data-testid="text-square-footage">
                    {adjustedSqFt.toLocaleString()} sq ft
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="w-1/3"
                  data-testid="button-back-step-2"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  className="w-2/3"
                  data-testid="button-next-step-2"
                  onClick={() => setStep(3)}
                  disabled={rawSqFt === 0}
                >
                  Calculate Price
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Pricing */}
        {step === 3 && (
          <Card className="border-border">
            <CardContent className="pt-6 space-y-5">
              <h2 className="text-xl font-bold">Estimate Summary</h2>

              <div className="bg-card border border-border rounded-md p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Area</span>
                  <span className="font-semibold">{adjustedSqFt.toLocaleString()} sq ft</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-semibold">{rateLabel}</span>
                </div>
                {travelPremium > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Distance from Warwick, RI</span>
                    <span className="font-semibold">{travelMiles} miles</span>
                  </div>
                )}
              </div>

              {/* Crack Fill */}
              <div className="bg-secondary/40 border border-border p-4 rounded-md space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="crackfill"
                      data-testid="checkbox-crack-fill"
                      checked={hasCrackFill}
                      onCheckedChange={(c) => setHasCrackFill(c as boolean)}
                    />
                    <Label htmlFor="crackfill" className="cursor-pointer font-bold text-base">
                      Add Crack Fill Service
                    </Label>
                  </div>
                  <span className="text-primary font-bold text-sm">
                    +{adjustedSqFt <= 750 ? "$50" : adjustedSqFt <= 1500 ? "$65" : "$80"}
                  </span>
                </div>
                {adjustedSqFt > 1500 && hasCrackFill && (
                  <p className="text-xs text-muted-foreground ml-8">
                    Estimated — final price confirmed on-site.
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-primary/10 border border-primary/30 p-5 rounded-md space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Driveway Sealing</span>
                  <span data-testid="text-base-price">${basePrice.toFixed(2)}</span>
                </div>
                {hasCrackFill && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Crack Fill</span>
                    <span>${crackFillPrice.toFixed(2)}</span>
                  </div>
                )}
                {travelPremium > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Travel Premium ({travelMiles} mi)
                    </span>
                    <span data-testid="text-travel-premium">${travelPremium.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="bg-primary/20" />
                <div className="flex justify-between text-2xl font-bold text-primary">
                  <span>Estimated Total</span>
                  <span data-testid="text-total-price">${totalPrice.toFixed(2)}</span>
                </div>

                {/* Disclaimer */}
                <p className="text-xs text-muted-foreground italic leading-relaxed pt-1 border-t border-border/50">
                  This estimate is only valid if the actual driveway size is within 10% of the
                  measured area. Final pricing confirmed on-site.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="w-1/3"
                  data-testid="button-back-step-3"
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button
                  className="w-2/3 h-12 text-base"
                  data-testid="button-submit"
                  onClick={handleSubmit}
                  disabled={createEstimate.isPending}
                >
                  {createEstimate.isPending ? "Submitting..." : "Request Service"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
