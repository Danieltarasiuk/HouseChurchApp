import { NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { systemCreatePendingAccount } from '@/lib/system';
import { resolveSignupChurch } from '@/lib/currentChurch';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', reason: 'invalid_body' },
      { status: 400 }
    );
  }

  try {
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required', reason: 'missing_fields' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 100 characters', reason: 'invalid_name' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'A valid email address is required', reason: 'invalid_email' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters', reason: 'weak_password' },
        { status: 400 }
      );
    }

    // Hash password and insert — use ON CONFLICT to handle race condition
    const passwordHash = await bcryptjs.hash(password, 12);

    // The church being signed up to (PR 1.2: from the subdomain).
    const churchId = await resolveSignupChurch();
    if (!churchId) {
      return NextResponse.json({ error: 'Registration failed. Please try again.', reason: 'registration_failed' }, { status: 500 });
    }

    // 'pending': nothing proves this person owns the email, so the account
    // is never linked to a member by it. An admin of that church approves
    // and links it.
    const userId = await systemCreatePendingAccount(name.trim(), email.toLowerCase().trim(), passwordHash, churchId);

    if (!userId) {
      return NextResponse.json(
        { error: 'An account with this email already exists', reason: 'email_exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.', reason: 'registration_failed' },
      { status: 500 }
    );
  }
}
