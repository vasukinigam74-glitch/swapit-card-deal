import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, TrendingUp } from 'lucide-react';

export default function CarbonTracker() {
  const { user } = useAuth();
  const [totalCarbonSaved, setTotalCarbonSaved] = useState(0);
  const [totalSwaps, setTotalSwaps] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchCarbonData();
  }, [user]);

  const fetchCarbonData = async () => {
    try {
      const { data, error } = await supabase
        .from('interests')
        .select('carbon_saved_kg')
        .eq('user_id', user?.id);

      if (error) throw error;

      const total = data?.reduce((sum, item) => sum + (Number(item.carbon_saved_kg) || 0), 0) || 0;
      setTotalCarbonSaved(total);
      setTotalSwaps(data?.length || 0);
    } catch (error) {
      console.error('Error fetching carbon data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900">
        <CardContent className="p-6">
          <div className="animate-pulse h-20 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <Leaf className="w-5 h-5" />
          Environmental Impact
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-green-700 dark:text-green-400">
                {totalCarbonSaved.toFixed(1)}
              </span>
              <span className="text-lg text-green-600 dark:text-green-500">kg CO₂</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Total carbon emissions saved
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-green-200 dark:border-green-900">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-500" />
            <span className="text-sm text-muted-foreground">
              {totalSwaps} {totalSwaps === 1 ? 'swap' : 'swaps'} completed
            </span>
          </div>

          <div className="text-xs text-muted-foreground mt-4 p-3 bg-background/50 rounded-lg">
            <p className="font-medium mb-1">💡 Impact Equivalent:</p>
            {totalCarbonSaved > 0 && (
              <ul className="space-y-1">
                {totalCarbonSaved >= 10 && (
                  <li>• {Math.floor(totalCarbonSaved / 10)} trees planted</li>
                )}
                {totalCarbonSaved >= 5 && (
                  <li>• {Math.floor(totalCarbonSaved * 2)} km driven by car avoided</li>
                )}
                {totalCarbonSaved > 0 && totalCarbonSaved < 5 && (
                  <li>Keep swapping to make a bigger impact!</li>
                )}
              </ul>
            )}
            {totalCarbonSaved === 0 && (
              <p>Start swapping to track your environmental impact!</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
