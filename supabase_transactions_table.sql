-- Supabase SQL: Create a 'transactions' table for Razorpay payments
create table if not exists public.transactions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.profiles(id) on delete set null,
    order_id text not null,
    payment_id text,
    plan text not null,
    status text not null,
    created_at timestamp with time zone default timezone('utc', now())
);

-- Index for fast lookup
create index if not exists idx_transactions_order_id on public.transactions(order_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);

-- Optionally, add a foreign key to your users table (profiles)
-- If you use a different user table, update the reference above accordingly.
