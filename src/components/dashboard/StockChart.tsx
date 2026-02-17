import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useProducts } from "@/hooks/useProducts"; // Adjust this path to where your hook is located
import { Loader2 } from "lucide-react";

export function StockChart() {
  // 1. Fetch real data using your hook
  const { data: products, isLoading } = useProducts();

  // 2. Transform data: Group by category name and sum the quantity
  const chartData = products
    ? Object.values(
        products.reduce(
          (acc, product) => {
            // Use category name if it exists, otherwise "Uncategorized"
            const categoryName = product.category?.name || "Uncategorized";

            if (!acc[categoryName]) {
              acc[categoryName] = { name: categoryName, stock: 0 };
            }

            acc[categoryName].stock += product.quantity;
            return acc;
          },
          {} as Record<string, { name: string; stock: number }>,
        ),
      )
    : [];

  if (isLoading) {
    return (
      <Card>
        <div className="h-[300px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Stock by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {/* 3. Pass the transformed 'chartData' to the chart */}
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
