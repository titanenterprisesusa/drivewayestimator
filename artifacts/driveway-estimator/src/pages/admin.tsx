import { useListEstimates } from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function Admin() {
  const { data: estimates, isLoading } = useListEstimates();

  return (
    <div className="min-h-screen w-full bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary tracking-tight">SEAL PRO <span className="text-foreground">/ ADMIN</span></h1>
        </div>

        <div className="rounded-md border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-secondary">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Sq Ft</TableHead>
                <TableHead className="text-right">Total Price</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading estimates...</TableCell>
                </TableRow>
              ) : estimates?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No estimates found.</TableCell>
                </TableRow>
              ) : (
                estimates?.map((est) => (
                  <TableRow key={est.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(est.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <div className="font-medium">{est.customerName}</div>
                      <div className="text-xs text-muted-foreground">{est.phone}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{est.address}</TableCell>
                    <TableCell className="text-right font-mono">{est.squareFootage}</TableCell>
                    <TableCell className="text-right font-bold text-primary">${est.totalPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="text-xs space-x-2">
                        {est.hasTreeObstruction && <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded">Trees</span>}
                        {est.hasCrackFill && <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Crack Fill</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
