import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSwapCredits } from '@/hooks/useSwapCredits';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Pencil, Trash2, MapPin, Coins, TrendingUp, Gift, Info } from 'lucide-react';
import { ValueEstimate } from '@/components/ValueEstimate';
import { formatDatabaseError } from '@/lib/errorHandler';

interface Item {
  id: string;
  title: string;
  category: string;
  description: string | null;
  price: number;
  is_donation: boolean;
  photo_url: string | null;
  city: string | null;
  status: string;
  estimated_value: number | null;
}

const MyItems = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { credits, loading: creditsLoading } = useSwapCredits();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchMyItems();
  }, [user, navigate]);

  const fetchMyItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load your items');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Item deleted');
      fetchMyItems();
    } catch (error: unknown) {
      toast.error(formatDatabaseError(error, 'Failed to delete item'));
    }
  };

  const toggleStatus = async (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const { error } = await supabase
        .from('items')
        .update({ status: newStatus })
        .eq('id', itemId);

      if (error) throw error;
      toast.success(`Item ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchMyItems();
    } catch (error: unknown) {
      toast.error(formatDatabaseError(error, 'Failed to update item'));
    }
  };

  const activeItems = items.filter(item => item.status === 'active').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-4 pt-20 md:pt-24">
      <Navigation />
      <div className="container max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Items</h1>
          <Button onClick={() => navigate('/create')}>
            Create Listing
          </Button>
        </div>

        {/* Swap Credits Card */}
        <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              {/* Credits Display */}
              <div className="flex-1 p-5 border-b sm:border-b-0 sm:border-r border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/20">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Swap Credits</p>
                    <p className="text-3xl font-bold text-primary">
                      {creditsLoading ? '...' : credits}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex-1 p-5 border-b sm:border-b-0 sm:border-r border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-secondary">
                    <TrendingUp className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Active Listings</p>
                    <p className="text-3xl font-bold">{activeItems}</p>
                  </div>
                </div>
              </div>
              
              {/* How to earn */}
              <div className="flex-1 p-5 bg-muted/30">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">How to earn credits:</p>
                    <p>Complete a swap by accepting or having your offer accepted. Both parties earn +1 credit!</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">You haven't listed any items yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                List items to earn Swap Credits when you complete trades!
              </p>
              <Button onClick={() => navigate('/create')}>
                Create Your First Listing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="h-48 bg-muted relative">
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl">📦</span>
                    </div>
                  )}
                  <Badge
                    className="absolute top-2 right-2"
                    variant={item.status === 'active' ? 'default' : 'secondary'}
                  >
                    {item.status}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-2 line-clamp-1">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">{item.category}</Badge>
                      <Badge variant={item.is_donation ? 'default' : 'secondary'}>
                        {item.is_donation ? 'Free' : `₹${item.price}`}
                      </Badge>
                      <ValueEstimate 
                        itemId={item.id} 
                        currentValue={item.estimated_value}
                        compact
                      />
                    </div>
                  </div>
                  {item.city && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>{item.city}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleStatus(item.id, item.status)}
                    >
                      {item.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyItems;
