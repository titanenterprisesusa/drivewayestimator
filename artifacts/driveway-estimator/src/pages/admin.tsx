import { useListEstimates } from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TitanHeader } from "@/components/TitanHeader";
import { format } from "date-fns";

export default function Admin() {
  const { data: estimates, isLoading } = useListEstimates();

  return (
    <div className="titan-bg min-h-screen w-full p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col items-center mb-8">
          <TitanHeader subtitle="Estimate Records" />
        </div>

        <div className="rounded-md border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-secondary">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Sq Ft</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading estimates...
                  </TableCell>
                </TableRow>
              ) : estimates?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No estimates found.
                  </TableCell>
                </TableRow>
              ) : (
                estimates?.map((est) => (
                  <TableRow key={est.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(est.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{est.customerName}</div>
                      <div className="text-xs text-muted-foreground">{est.phone}</div>
                      <div className="text-xs text-muted-foreground">{est.email}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{est.address}</TableCell>
                    <TableCell className="text-right font-mono">{est.squareFootage}</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      ${est.totalPrice.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        {est.hasCrackFill && (
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded block w-fit">
                            Crack Fill
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px]">
                      {est.notes ?? "—"}
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
