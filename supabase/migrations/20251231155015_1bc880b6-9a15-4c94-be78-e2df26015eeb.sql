-- Add swap_credits column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS swap_credits integer NOT NULL DEFAULT 0;

-- Create function to check if user has enough credits
CREATE OR REPLACE FUNCTION public.has_swap_credits(_user_id uuid, _required integer DEFAULT 1)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT swap_credits >= _required FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- Create function to add swap credits (called when swap completes)
CREATE OR REPLACE FUNCTION public.add_swap_credit(_user_id uuid, _amount integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET swap_credits = swap_credits + _amount 
  WHERE id = _user_id;
END;
$$;

-- Create function to deduct swap credit (called when claiming an item)
CREATE OR REPLACE FUNCTION public.deduct_swap_credit(_user_id uuid, _amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credits integer;
BEGIN
  SELECT swap_credits INTO current_credits FROM public.profiles WHERE id = _user_id;
  
  IF current_credits >= _amount THEN
    UPDATE public.profiles 
    SET swap_credits = swap_credits - _amount 
    WHERE id = _user_id;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Create trigger to award credits when a swap is completed
-- When an offer status changes to 'accepted', both parties get +1 credit
CREATE OR REPLACE FUNCTION public.handle_swap_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auction_owner_id uuid;
BEGIN
  -- Only process when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Get the auction owner
    SELECT user_id INTO auction_owner_id 
    FROM public.items 
    WHERE id = NEW.auction_listing_id;
    
    -- Award +1 credit to the offerer (they gave their item)
    PERFORM public.add_swap_credit(NEW.offerer_user_id, 1);
    
    -- Award +1 credit to the auction owner (they gave their item)
    PERFORM public.add_swap_credit(auction_owner_id, 1);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_swap_completion ON public.offers;
CREATE TRIGGER on_swap_completion
  AFTER UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_swap_completion();