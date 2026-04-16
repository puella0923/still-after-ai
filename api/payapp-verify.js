/**
 * /api/payapp-verify
 * 페이앱 결제 검증 + Supabase is_paid 업데이트
 *
 * 페이앱 결제 완료 후 클라이언트가 shopkey를 전달하면
 * 서버에서 페이앱 API로 결제 상태를 검증하고 DB를 업데이트합니다.
 */

import { createClient } from '@supabase/supabase-js'

const PAYAPP_API = 'https://api.payapp.kr/oapi/apiLoad.html'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { shopkey } = req.body

  if (!shopkey) {
    return res.status(400).json({ error: 'shopkey is required' })
  }

  const PAYAPP_USER_ID = process.env.PAYAPP_USER_ID
  const PAYAPP_USER_KEY = process.env.PAYAPP_USER_KEY
  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

  if (!PAYAPP_USER_ID || !PAYAPP_USER_KEY) {
    return res.status(500).json({ error: '페이앱 설정이 없습니다.' })
  }

  try {
    // 1. 페이앱 결제 결과 조회
    const formData = new URLSearchParams({
      cmd: 'payresult',
      userid: PAYAPP_USER_ID,
      shopkey,
    })

    const response = await fetch(PAYAPP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    const text = await response.text()
    let data = {}
    try {
      data = JSON.parse(text)
    } catch {
      const params = new URLSearchParams(text)
      params.forEach((v, k) => { data[k] = v })
    }

    // result=1 이고 paycomplete=Y 이면 결제 성공
    if (data.result !== '1' || data.paycomplete !== 'Y') {
      return res.status(400).json({ error: '결제가 완료되지 않았어요.', detail: data })
    }

    // 2. memo에서 userId:personaId 추출
    const memo = data.memo || ''
    const [userId, personaId] = memo.split(':')

    if (!userId || !personaId) {
      return res.status(400).json({ error: 'memo 형식이 올바르지 않아요.' })
    }

    // 3. Supabase에 is_paid = true 업데이트
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: existing } = await supabase
      .from('user_usage')
      .select('id')
      .eq('user_id', userId)
      .eq('persona_id', personaId)
      .single()

    if (existing) {
      await supabase
        .from('user_usage')
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('persona_id', personaId)
    } else {
      await supabase
        .from('user_usage')
        .insert({ user_id: userId, persona_id: personaId, message_count: 0, is_paid: true, paid_at: new Date().toISOString() })
    }

    return res.status(200).json({ success: true, personaId })
  } catch (err) {
    console.error('[payapp-verify] error:', err)
    return res.status(500).json({ error: '결제 검증 중 오류가 발생했어요.' })
  }
}
