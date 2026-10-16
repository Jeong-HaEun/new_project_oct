import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (key) {
    let isPublic = key.startsWith('sb_publishable_')
    try {
      isPublic ||=
        JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString())
          .role === 'anon'
    } catch {
      /* JWT가 아니면 publishable 접두어로만 판정한다. */
    }
    if (!isPublic)
      throw new Error(
        'Supabase publishable 또는 anon 키만 사용하세요. 비공개 키는 빌드할 수 없습니다.',
      )
  }
  return {
    base: './',
    plugins: [react(), tailwindcss()],
  }
})
