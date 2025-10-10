'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

type FormState = { error?: string | null }

export async function signup(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = createClient()

  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Email dan password wajib diisi.' }
  if (password.length < 6) return { error: 'Password minimal 6 karakter.' }

  const { error } = await (await supabase).auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
    },
  })

  if (error) {
    if (error.message.includes('User already registered')) {
      return { error: 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.' }
    }
    
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect(`/register/sent?email=${encodeURIComponent(email)}`)
}