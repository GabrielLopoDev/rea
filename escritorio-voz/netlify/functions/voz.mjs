// Gera a fala com a ElevenLabs. Sem ELEVENLABS_API_KEY, responde 501 e o site usa a voz do navegador.
const VOZES = {
  'manolito': process.env.VOZ_MANOLITO || 'pNInz6obpgDQGcFmaJgB',
  'mercado-0': process.env.VOZ_LUCAS || 'TxGEqnHWrfWFTfGW9XjX',
  'fornecedores-0': process.env.VOZ_PAULO || 'VR6AewLTigWG4xSOukaG',
  'arte-0': process.env.VOZ_CAMILA || 'EXAVITQu4vr4xnSDxMaL',
};

export default async (req) => {
  if (req.method !== 'POST') return new Response('Use POST', { status: 405 });
  if (!process.env.APP_PIN || req.headers.get('x-pin') !== process.env.APP_PIN) return new Response('PIN inválido', { status: 401 });
  const chave = process.env.ELEVENLABS_API_KEY;
  if (!chave) return new Response('Sem voz configurada', { status: 501 });
  let corpo;
  try { corpo = await req.json(); } catch { return new Response('JSON inválido', { status: 400 }); }
  const texto = String(corpo.texto || '').slice(0, 1500);
  const voz = VOZES[corpo.quem] || VOZES.manolito;
  if (!texto.trim()) return new Response('Sem texto', { status: 400 });
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': chave, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text: texto, model_id: 'eleven_flash_v2_5', language_code: 'pt' }),
  });
  if (!r.ok) { console.error(r.status, await r.text()); return new Response('Falha na voz: ' + r.status, { status: 502 }); }
  return new Response(r.body, { headers: { 'content-type': 'audio/mpeg' } });
};

export const config = { path: '/api/voz' };
