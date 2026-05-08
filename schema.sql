-- 1. Create recurring_transactions table
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionando a coluna de dia útil
ALTER TABLE public.recurring_transactions
ADD COLUMN IF NOT EXISTS is_business_day BOOLEAN DEFAULT false;

-- Enable RLS for recurring_transactions
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recurring transactions"
    ON public.recurring_transactions FOR ALL
    USING (auth.uid() = user_id);

-- 2. Add recurring_id to existing transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS recurring_id UUID REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;

-- 3. Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount DECIMAL NOT NULL,
    deadline DATE NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);

-- 4. Create goal_deposits table
CREATE TABLE IF NOT EXISTS public.goal_deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL,
    deposit_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.goal_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own goal deposits" ON public.goal_deposits FOR ALL USING (
    auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id)
);
