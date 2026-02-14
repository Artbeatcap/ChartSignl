-- Account deletion requests table for email-verified deletion flow
-- Run this in the Supabase SQL Editor

CREATE TYPE public.deletion_request_status AS ENUM ('pending', 'completed');

CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  reason TEXT,
  status public.deletion_request_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_deletion_requests_token ON public.deletion_requests(token);
CREATE INDEX idx_deletion_requests_email ON public.deletion_requests(email);
CREATE INDEX idx_deletion_requests_status ON public.deletion_requests(status);
CREATE INDEX idx_deletion_requests_expires_at ON public.deletion_requests(expires_at);

-- RLS: enable but do not grant any policies to anon/authenticated.
-- Backend uses service role and bypasses RLS, so only the API can read/write.
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- No policies: no row is visible to anon or authenticated roles.
-- Service role (backend) bypasses RLS and can perform all operations.
