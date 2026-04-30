-- 00028_enable_pgtap.sql
-- Purpose: Enable pgTAP extension for RLS regression tests.

begin;

create extension if not exists pgtap with schema extensions;

commit;
