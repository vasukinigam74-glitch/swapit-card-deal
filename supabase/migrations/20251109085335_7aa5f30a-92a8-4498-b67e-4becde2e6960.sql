-- Create function to calculate carbon savings based on item category (if not exists)
CREATE OR REPLACE FUNCTION public.calculate_carbon_savings(item_category text)
RETURNS numeric AS $$
BEGIN
  RETURN CASE 
    WHEN item_category = 'Electronics' THEN 50
    WHEN item_category = 'Furniture' THEN 40
    WHEN item_category = 'Clothing' THEN 10
    WHEN item_category = 'Books' THEN 2
    WHEN item_category = 'Sports' THEN 15
    WHEN item_category = 'Vehicles' THEN 100
    WHEN item_category = 'Home & Garden' THEN 20
    ELSE 5
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger function to automatically calculate carbon savings when interest is created
CREATE OR REPLACE FUNCTION public.set_carbon_savings()
RETURNS TRIGGER AS $$
DECLARE
  item_cat text;
BEGIN
  -- Get the category of the item
  SELECT category INTO item_cat
  FROM public.items
  WHERE id = NEW.item_id;
  
  -- Calculate and set carbon savings
  NEW.carbon_saved_kg = calculate_carbon_savings(item_cat);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS calculate_interest_carbon ON public.interests;

-- Create trigger
CREATE TRIGGER calculate_interest_carbon
BEFORE INSERT ON public.interests
FOR EACH ROW
EXECUTE FUNCTION public.set_carbon_savings();