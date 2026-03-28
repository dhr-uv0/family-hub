import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET() {
  const cookieStore = await cookies()

  // Verify the requester is authenticated
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'family_hub' },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check the requester is an admin
  const { data: me } = await supabase
    .from('family_members')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (me?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Use service role key to access auth.users
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'family_hub' } }
  )

  const { data: authUsers, error: authErr } = await serviceClient.auth.admin.listUsers()
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 })
  }

  const { data: members } = await serviceClient
    .from('family_members')
    .select('user_id, name, nickname, role, color, is_active, created_at')

  const membersByUserId = Object.fromEntries(
    (members ?? []).map(m => [m.user_id, m])
  )

  const report = authUsers.users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in: u.last_sign_in_at,
    confirmed: !!u.email_confirmed_at,
    profile: membersByUserId[u.id] ?? null,
  }))

  report.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return NextResponse.json({ users: report })
}
