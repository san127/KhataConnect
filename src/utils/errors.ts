// Turn Supabase / network errors into messages a shopkeeper can act on.
export function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e ?? '');
  const lower = msg.toLowerCase();
  if (lower.includes('network request failed') || lower.includes('failed to fetch')) return 'No internet connection. Please check your network and try again.';
  if (lower.includes('invalid login credentials')) return 'Incorrect email/phone or password.';
  if (lower.includes('email not confirmed')) return 'Please verify your email first. Check your inbox for the link.';
  if (lower.includes('user already registered')) return 'An account with these details already exists. Try logging in.';
  if (lower.includes('token has expired') || lower.includes('otp_expired')) return 'That code has expired. Request a new one.';
  if (lower.includes('invalid') && lower.includes('token')) return 'That code is not valid. Check it and try again.';
  if (lower.includes('rate limit') || lower.includes('too many')) return 'Too many attempts. Please wait a minute and try again.';
  if (lower.includes('duplicate key')) return 'This already exists.';
  if (lower.includes('row-level security')) return 'You do not have permission to do that.';
  // Postgres RAISE EXCEPTION messages from our RPCs are already readable.
  return msg || 'Something went wrong. Please try again.';
}
