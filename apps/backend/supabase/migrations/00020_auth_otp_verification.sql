-- Migration: 00020_auth_otp_verification.sql
-- Description: Table and functions for handling custom OTP verification (password setup/change)

-- Create OTP table in private schema for security
CREATE TABLE IF NOT EXISTS private.otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('set_password', 'change_password')),
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for cleanup and lookup
CREATE INDEX IF NOT EXISTS idx_otp_verifications_user_purpose ON private.otp_verifications(user_id, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON private.otp_verifications(expires_at);

-- Function to clean up expired OTPs (can be called by a cron job)
CREATE OR REPLACE FUNCTION private.cleanup_expired_otps()
RETURNS VOID AS $$
BEGIN
    DELETE FROM private.otp_verifications WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate and save OTP
CREATE OR REPLACE FUNCTION private.create_otp_verification(
    p_user_id UUID,
    p_email TEXT,
    p_purpose TEXT
)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
BEGIN
    -- Delete any existing unexpired OTP for this user and purpose
    DELETE FROM private.otp_verifications 
    WHERE user_id = p_user_id AND purpose = p_purpose;

    -- Generate a 6-digit random code
    v_code := lpad(floor(random() * 1000000)::text, 6, '0');

    -- Insert new verification record (valid for 10 minutes)
    INSERT INTO private.otp_verifications (user_id, email, code, purpose, expires_at)
    VALUES (p_user_id, p_email, v_code, p_purpose, NOW() + INTERVAL '10 minutes');

    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify OTP
CREATE OR REPLACE FUNCTION private.verify_otp(
    p_user_id UUID,
    p_purpose TEXT,
    p_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT * INTO v_record 
    FROM private.otp_verifications
    WHERE user_id = p_user_id 
      AND purpose = p_purpose 
      AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check attempts to prevent brute force
    IF v_record.attempts >= 5 THEN
        DELETE FROM private.otp_verifications WHERE id = v_record.id;
        RETURN FALSE;
    END IF;

    IF v_record.code = p_code THEN
        -- Success: delete the OTP so it can't be reused
        DELETE FROM private.otp_verifications WHERE id = v_record.id;
        RETURN TRUE;
    ELSE
        -- Failure: increment attempts
        UPDATE private.otp_verifications 
        SET attempts = attempts + 1 
        WHERE id = v_record.id;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
