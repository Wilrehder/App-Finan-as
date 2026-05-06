-- 1. Create recurring_transactions table
CREATE TABLE public.recurring_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for recurring_transactions
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recurring transactions"
    ON public.recurring_transactions FOR ALL
    USING (auth.uid() = user_id);

-- 2. Add recurring_id to existing transactions table
ALTER TABLE public.transactions
ADD COLUMN recurring_id UUID REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;
