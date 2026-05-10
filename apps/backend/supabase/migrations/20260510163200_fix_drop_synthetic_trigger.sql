-- Fix: Remove the auto_confirm_synthetic_email trigger that was blocking
-- ALL new user signups (including OAuth/Google).
-- The trigger is no longer needed because we use admin.createUser with
-- email_confirm: true for synthetic emails in the signup server action.

begin;

-- Drop the problematic trigger
drop trigger if exists auto_confirm_synthetic_email_trigger on auth.users;

-- Drop the function too since it's unused
drop function if exists public.auto_confirm_synthetic_email();

commit;
