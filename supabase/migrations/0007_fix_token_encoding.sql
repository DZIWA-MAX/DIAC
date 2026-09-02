-- =====================================================================
-- Fix: `encode(..., 'base64url')` is not valid on Postgres 17.
--
-- `shares.token` (0001) and `vpn_profiles.token` (0006) both default to
--   encode(gen_random_bytes(24), 'base64url')
-- but base64url only became a recognised encoding in Postgres 18.
-- Supabase runs 17, so every INSERT that relies on either default fails
-- with 22023 "unrecognized encoding".
--
-- Creating the table succeeded because a column DEFAULT is not evaluated
-- until a row is inserted — which is why the migrations applied cleanly
-- and the breakage only showed up when the feature was exercised. The
-- practical effect: creating a share link has never worked, and neither
-- has creating a VPN profile.
--
-- The replacement builds the same URL-safe alphabet on any supported
-- version: standard base64, then '+' -> '-', '/' -> '_', and '=' dropped
-- (translate deletes characters with no counterpart in the shorter TO
-- string). 24 random bytes still give 32 characters of token.
-- =====================================================================

alter table public.shares
  alter column token
  set default translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_');

alter table public.vpn_profiles
  alter column token
  set default translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_');
