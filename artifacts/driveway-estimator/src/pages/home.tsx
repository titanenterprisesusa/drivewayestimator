import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useCreateEstimate } from "@workspace/api-client-react";
import { MapDraw } from "@/components/MapDraw";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { TitanHeader } from "@/components/TitanHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { loadGoogleMapsScript, fetchMapsApiKey } from "@/lib/maps";
import { apiUrl } from "@/lib/api-base";

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

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5;
}

function getBufferMultiplier(rawSqFt: number): number {
  if (rawSqFt <= 1000) return 1.20;
  if (rawSqFt <= 1500) return 1.15;
  return 1.10;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const createEstimate = useCreateEstimate();

  useEffect(() => {
    fetchMapsApiKey().then((key) => {
      if (key) loadGoogleMapsScript(key).catch(() => {});
    });
  }, []);

  const promoCode = useMemo(() => new URLSearchParams(window.location.search).get("promo"), []);
  const hasPromo = promoCode !== null;

  const [step, setStep] = useState(1);
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [leadSaving, setLeadSaving] = useState(false);
  const leadSavedRef = useRef(false);

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zip: "",
  });

  const address = [formData.street, formData.city, formData.state, formData.zip].filter(Boolean).join(", ");

  const [rawSqFt, setRawSqFt] = useState(0);
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hasCrackFill, setHasCrackFill] = useState(false);

  const adjustedSqFt = rawSqFt > 0 ? Math.round(rawSqFt * getBufferMultiplier(rawSqFt)) : 0;

  const distanceMiles =
    customerCoords ? haversineMiles(HQ_LAT, HQ_LNG, customerCoords.lat, customerCoords.lng) : 0;
  const travelPremium =
    distanceMiles > 10 ? Math.ceil((distanceMiles - 10) / 10) * 25 : 0;

  const getSealRate = (sqFt: number): number => {
    if (sqFt <= 750)    return 0.35;
    if (sqFt <= 1500)   return 0.32;
    if (sqFt <= 2500)   return 0.28;
    if (sqFt <= 5000)   return 0.25;
    if (sqFt <= 7500)   return 0.22;
    if (sqFt <= 10000)  return 0.20;
    if (sqFt <= 15000)  return 0.19;
    if (sqFt <= 25000)  return 0.18;
    if (sqFt <= 50000)  return 0.16;
    if (sqFt <= 100000) return 0.15;
    return 0.14;
  };

  const calculatePricing = () => {
    const rate = getSealRate(adjustedSqFt);
    const sealingRaw = adjustedSqFt * rate;

    let crackFillPrice = 0;
    if (hasCrackFill) {
      if (adjustedSqFt <= 750) crackFillPrice = 50;
      else if (adjustedSqFt <= 1500) crackFillPrice = 65;
      else {
        crackFillPrice = 80 + Math.ceil(Math.max(0, adjustedSqFt - 2000) / 200) * 10;
      }
    }

    const minimum = hasCrackFill ? 300 : 250;
    const serviceSubtotalBeforeDiscount = Math.max(minimum, sealingRaw + crackFillPrice);

    const promoFloor = hasPromo ? Math.max(225, minimum * 0.85) : minimum;
    const discountedSubtotal = hasPromo
      ? Math.max(promoFloor, serviceSubtotalBeforeDiscount * 0.85)
      : serviceSubtotalBeforeDiscount;
    const discountAmount = serviceSubtotalBeforeDiscount - discountedSubtotal;

    const rawTotal = discountedSubtotal + travelPremium;
    const totalPrice = roundToFive(rawTotal);
    const basePrice = discountedSubtotal - crackFillPrice + (totalPrice - rawTotal);
    return { basePrice, crackFillPrice, discountAmount, totalPrice, serviceSubtotalBeforeDiscount };
  };

  const { basePrice, crackFillPrice, discountAmount, totalPrice } = calculatePricing();

  const rateLabel = (() => {
    if (adjustedSqFt === 0) return `$${getSealRate(0).toFixed(2)}/sq ft`;
    return `$${(basePrice / adjustedSqFt).toFixed(2)}/sq ft`;
  })();

  const handleAreaCalculated = (sqFt: number, lat: number, lng: number) => {
    setRawSqFt(sqFt);
    if (lat !== 0 && lng !== 0) setCustomerCoords({ lat, lng });
  };

  // Capture the lead when leaving step 1 — fire-and-forget, never blocks navigation
  const handleStep1Next = async () => {
    setStep(2);
    if (leadSavedRef.current) return;
    leadSavedRef.current = true;
    setLeadSaving(true);
    try {
      await fetch(apiUrl("/api/leads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.customerName,
          phone: formData.phone,
          email: formData.email,
          address,
          marketingConsent,
        }),
      });
    } catch {
      // Silent — lead capture should never disrupt the user flow
    } finally {
      setLeadSaving(false);
    }
  };

  const handleSubmit = () => {
    const travelNote =
      travelPremium > 0
        ? `Travel premium: $${travelPremium.toFixed(2)} (${Math.round(distanceMiles)} mi, $25/10mi)`
        : null;

    createEstimate.mutate(
      {
        data: {
          customerName: formData.customerName,
          phone: formData.phone,
          email: formData.email,
          address,
          squareFootage: adjustedSqFt,
          hasTreeObstruction: false,
          basePrice,
          crackFillPrice: hasCrackFill ? crackFillPrice : null,
          totalPrice,
          hasCrackFill,
          notes: travelNote,
          marketingConsent,
          promoCode,
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
                <Label htmlFor="street">Street Address</Label>
                <AddressAutocomplete
                  id="street"
                  value={formData.street}
                  onChange={(val) => setFormData((f) => ({ ...f, street: val }))}
                  onPlaceSelected={(street, city, state, zip) =>
                    setFormData((f) => ({ ...f, street, city, state, zip }))
                  }
                  placeholder="123 Main St"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  data-testid="input-city"
                  value={formData.city}
                  onChange={(e) => setFormData((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Warwick"
                />
              </div>
              <div className="flex gap-3">
                <div className="space-y-2 w-1/2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    data-testid="input-state"
                    value={formData.state}
                    onChange={(e) => setFormData((f) => ({ ...f, state: e.target.value }))}
                    placeholder="RI"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2 w-1/2">
                  <Label htmlFor="zip">Zip Code</Label>
                  <Input
                    id="zip"
                    data-testid="input-zip"
                    value={formData.zip}
                    onChange={(e) => setFormData((f) => ({ ...f, zip: e.target.value }))}
                    placeholder="02888"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Marketing consent — pre-checked, user must manually uncheck */}
              <div className="flex items-start gap-3 pt-1 pb-1">
                <Checkbox
                  id="marketing-consent"
                  checked={marketingConsent}
                  onCheckedChange={(v) => setMarketingConsent(Boolean(v))}
                  className="mt-0.5 shrink-0"
                />
                <label
                  htmlFor="marketing-consent"
                  className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                >
                  I consent to receive promotional communications, service updates, and marketing
                  materials from Titan Enterprises via email or phone. You may withdraw consent at
                  any time by contacting us directly.
                </label>
              </div>

              <Button
                data-testid="button-next-step-1"
                className="w-full mt-2"
                onClick={handleStep1Next}
                disabled={
                  leadSaving ||
                  !formData.customerName || !formData.phone || !formData.email ||
                  !formData.street || !formData.city || !formData.state || !formData.zip
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
                Zoom in on your driveway, then click to place points around its outline. Click the
                first point — or tap <strong className="text-foreground">Close Shape</strong> — to
                finish. You can drag any corner to adjust.
              </p>

              <div className="h-[420px] border border-border rounded-md overflow-hidden relative z-0">
                <MapDraw address={address} onAreaCalculated={handleAreaCalculated} />
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
                    <span className="font-semibold">{Math.round(distanceMiles)} miles</span>
                  </div>
                )}
              </div>

              {/* Crack Fill */}
              <div className="bg-secondary/40 border border-border p-4 rounded-md space-y-2">
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
                    {adjustedSqFt <= 750
                      ? "+$50"
                      : adjustedSqFt <= 1500
                      ? "+$65"
                      : `+$${80 + Math.ceil(Math.max(0, adjustedSqFt - 2000) / 200) * 10}`}
                  </span>
                </div>
                {adjustedSqFt > 1500 && hasCrackFill && (
                  <p className="text-xs text-muted-foreground ml-8 leading-relaxed">
                    Crack fill is an estimate only. Final cost will be confirmed on-site via a
                    measurement process, with a minimum of the estimated amount above, up to
                    $1.20 per linear foot.
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-primary/10 border border-primary/30 p-5 rounded-md space-y-3">
                {hasPromo && (
                  <div className="flex items-center justify-between bg-primary/20 border border-primary/50 rounded px-3 py-2">
                    <span className="text-primary font-bold text-sm">🏷️ Mailer Promo — 15% Off Applied</span>
                    <span className="text-primary font-bold text-sm">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
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
                      Travel Premium ({Math.round(distanceMiles)} mi)
                    </span>
                    <span data-testid="text-travel-premium">${travelPremium.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="bg-primary/20" />
                <div className="flex justify-between text-2xl font-bold text-primary">
                  <span>Estimated Total</span>
                  <span data-testid="text-total-price">${totalPrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground italic leading-relaxed pt-1 border-t border-border/50">
                  This estimate is only valid if the actual driveway size is within 10% of the
                  measured area. Final pricing confirmed on-site.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
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
