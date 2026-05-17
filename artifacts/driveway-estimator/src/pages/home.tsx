import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateEstimate } from "@workspace/api-client-react";
import { MapDraw } from "@/components/MapDraw";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  const [squareFootage, setSquareFootage] = useState(0);
  const [hasTreeObstruction, setHasTreeObstruction] = useState(false);
  const [hasCrackFill, setHasCrackFill] = useState(false);

  const calculatePricing = () => {
    const finalSqFt = hasTreeObstruction ? Math.round(squareFootage * 1.1) : squareFootage;
    
    let basePrice = 0;
    if (finalSqFt <= 750) basePrice = finalSqFt * 0.35;
    else if (finalSqFt <= 1500) basePrice = finalSqFt * 0.32;
    else basePrice = finalSqFt * 0.28;

    let crackFillPrice = 0;
    if (hasCrackFill) {
      if (finalSqFt <= 750) crackFillPrice = 50;
      else if (finalSqFt <= 1500) crackFillPrice = 65;
      else crackFillPrice = 80;
    }

    const totalPrice = basePrice + crackFillPrice;

    return { finalSqFt, basePrice, crackFillPrice, totalPrice };
  };

  const { finalSqFt, basePrice, crackFillPrice, totalPrice } = calculatePricing();

  const handleSubmit = () => {
    createEstimate.mutate(
      {
        data: {
          ...formData,
          squareFootage: finalSqFt,
          hasTreeObstruction,
          basePrice,
          crackFillPrice: hasCrackFill ? crackFillPrice : null,
          totalPrice,
          hasCrackFill,
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
    <div className="min-h-screen w-full bg-background flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-[480px] space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary">SEAL PRO</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest">Driveway Estimator</p>
        </div>

        {/* Progress */}
        <div className="flex justify-between items-center px-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${s === step ? 'bg-primary text-primary-foreground' : s < step ? 'bg-primary/50 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {s}
              </div>
              {s < 3 && <div className={`h-1 w-16 mx-2 rounded ${s < step ? 'bg-primary/50' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Customer Info */}
        {step === 1 && (
          <Card className="border-border">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-bold mb-4">Customer Details</h2>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={formData.customerName} onChange={e => setFormData(f => ({ ...f, customerName: e.target.value }))} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 555-5555" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Service Address</Label>
                <Input id="address" value={formData.address} onChange={e => setFormData(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, City, ST" />
              </div>
              <Button 
                className="w-full mt-6" 
                onClick={() => setStep(2)}
                disabled={!formData.customerName || !formData.phone || !formData.email || !formData.address}
              >
                Next Step
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Map & Measurement */}
        {step === 2 && (
          <Card className="border-border">
            <CardContent className="pt-6 space-y-6">
              <h2 className="text-xl font-bold">Measure Driveway</h2>
              <p className="text-sm text-muted-foreground">Draw a polygon around your driveway using the tool on the map.</p>
              
              <div className="h-[400px] border border-border rounded-md overflow-hidden relative z-0">
                <MapDraw address={formData.address} onAreaCalculated={setSquareFootage} />
              </div>

              {squareFootage > 0 && (
                <div className="bg-muted p-4 rounded-md text-center">
                  <span className="block text-sm text-muted-foreground mb-1">Measured Area</span>
                  <span className="text-2xl font-bold text-primary">{squareFootage} sq ft</span>
                </div>
              )}

              <div className="bg-secondary/50 p-4 rounded-md space-y-4">
                <p className="text-xs text-muted-foreground">
                  If trees or obstructions cover part of your driveway, we'll add a 10% buffer to the estimate to account for unseen area.
                </p>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="trees" 
                    checked={hasTreeObstruction} 
                    onCheckedChange={(c) => setHasTreeObstruction(c as boolean)} 
                  />
                  <Label htmlFor="trees" className="cursor-pointer">Trees or obstructions present</Label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="outline" className="w-1/3" onClick={() => setStep(1)}>Back</Button>
                <Button className="w-2/3" onClick={() => setStep(3)} disabled={squareFootage === 0}>Calculate Price</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Pricing */}
        {step === 3 && (
          <Card className="border-border">
            <CardContent className="pt-6 space-y-6">
              <h2 className="text-xl font-bold">Estimate Summary</h2>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Area</span>
                  <span>{squareFootage} sq ft</span>
                </div>
                {hasTreeObstruction && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tree Buffer (10%)</span>
                    <span>+ {Math.round(squareFootage * 0.1)} sq ft</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total Billable Area</span>
                  <span>{finalSqFt} sq ft</span>
                </div>
              </div>

              <div className="bg-secondary/50 p-4 rounded-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="crackfill" 
                      checked={hasCrackFill} 
                      onCheckedChange={(c) => setHasCrackFill(c as boolean)} 
                    />
                    <Label htmlFor="crackfill" className="cursor-pointer font-bold">Add Crack Fill Service</Label>
                  </div>
                  <span className="text-sm">
                    {finalSqFt <= 750 ? "+$50" : finalSqFt <= 1500 ? "+$65" : "+$80"}
                  </span>
                </div>
                {finalSqFt > 1500 && hasCrackFill && (
                  <p className="text-xs text-muted-foreground ml-6">Final price confirmed on-site.</p>
                )}
              </div>

              <div className="bg-primary/10 border border-primary/20 p-6 rounded-md space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sealing (${(basePrice/finalSqFt).toFixed(2)}/sqft)</span>
                  <span>${basePrice.toFixed(2)}</span>
                </div>
                {hasCrackFill && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Crack Fill</span>
                    <span>${crackFillPrice.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="my-2 bg-primary/20" />
                <div className="flex justify-between text-xl font-bold text-primary">
                  <span>Estimated Total</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="outline" className="w-1/3" onClick={() => setStep(2)}>Back</Button>
                <Button className="w-2/3 text-lg h-12" onClick={handleSubmit} disabled={createEstimate.isPending}>
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
