/**
 * /api/payapp-init
 * 페이앱 결제 요청 생성 API
 *
 * 설정 필요 (Vercel 환경변수):
 *   PAYAPP_USER_ID  — 페이앱 가맹점 아이디
 *   PAYAPP_USER_KEY — 페이앱 사용자 인증키 (payapp.kr 마이페이지 → API 정보)
 *   SUPABASE_SERVICE_KEY — 서버사이드 Supabase key
 */

const PAYAPP_API = 'https://api.payapp.kr/oapi/apiLoad.html'
const PRODUCT_NAME = 'Still After 무제한 대화'
const PRODUCT_PRICE = 19900  // 원

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { personaId, userId, userPhone } = req.body

  if (!personaId || !userId) {
    return res.status(400).json({ error: 'personaId and userId are required' })
  }

  const PAYAPP_USER_ID = process.env.PAYAPP_USER_ID
  const PAYAPP_USER_KEY = process.env.PAYAPP_USER_KEY

  if (!PAYAPP_USER_ID || !PAYAPP_USER_KEY) {
    return res.status(500).json({ error: '페이앱 설정이 필요합니다. 환경변수를 확인해주세요.' })
  }

  try {
    // 페이앱 결제 요청
    const formData = new URLSearchParams({
      cmd: 'payrequest',
      userid: PAYAPP_USER_ID,
      goodname: PRODUCT_NAME,
      price: String(PRODUCT_PRICE),
      recvphone: userPhone || '',
      memo: `${userId}:${personaId}`,  // 결제 확인용 메모 (userId:personaId)
      redirectpay: '1',               // 결제 완료 후 리다이렉트 방식
    })

    const response = await fetch(PAYAPP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    const text = await response.text()

    // 페이앱은 JSON 또는 쿼리스트링 형태로 응답
    let data = {}
    try {
      data = JSON.parse(text)
    } catch {
      const params = new URLSearchParams(text)
      params.forEach((v, k) => { data[k] = v })
    }

    if (data.result !== '1') {
      console.error('[payapp-init] 결제 요청 실패:', data)
      return res.status(400).json({ error: '결제 요청에 실패했어요.', detail: data })
    }

    return res.status(200).json({
      shopkey: data.shopkey,
      payurl: data.payurl,
    })
  } catch (err) {
    console.error('[payapp-init] error:', err)
    return res.status(500).json({ error: '결제 처리 중 오류가 발생했어요.' })
  }
}
