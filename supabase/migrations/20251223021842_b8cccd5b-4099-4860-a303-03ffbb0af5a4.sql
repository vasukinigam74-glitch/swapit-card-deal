-- Add cash_amount column to offers table for hybrid offers (item + money)
ALTER TABLE public.offers ADD COLUMN cash_amount numeric DEFAULT 0;