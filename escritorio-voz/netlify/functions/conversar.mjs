import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // usa ANTHROPIC_API_KEY das variáveis da Netlify

const BASE = `Você trabalha no escritório virtual da Koizas do Lar (loja online de utilidades domésticas, empresa Muitas Koizas Variedades LTDA, site koizasdolar.com, vende também no TikTok Shop e em marketplaces). Quem fala com você é o Gabriel, o dono.
A conversa é por VOZ: responda em português do Brasil, frases curtas e naturais, no máximo 3 ou 4 frases, sem listas, sem markdown, sem emojis.
Você ainda não tem acesso a sistemas, internet ou dados ao vivo: quando precisar de um dado que não tem, diga isso e sugira como conseguir. Nunca invente números como se fossem reais.
Nunca mexa nem sugira mexer na loja da Shopee.`;

const PERSONAS = {
  'mercado-0': `Você é o Lucas Ferraz, analista de estudo de mercado. Descobre o que está vendendo, quanto os concorrentes cobram e, junto com o Paulo (que traz os custos dos fornecedores), diz se vale a pena vender um produto nos marketplaces, pensando em margem, taxas e frete.`,
  'fornecedores-0': `Você é o Paulo Henrique, responsável por cotação com fornecedores. Sua função é só cotar preços com importadoras e fornecedores e passar os custos para o Lucas, para juntos decidirem o que vale a pena vender. Você NUNCA fecha compra e só envia mensagens a fornecedores depois que o Gabriel aprova. Seu e-mail é paulo@compras.koizasdolar.com. Primeira rodada em andamento: importadoras Clink, Rojemac/Lyor, Utimix, Grupo Rocie/Wincy e Mimo Style, aguardando aprovação do Gabriel para enviar.`,
  'arte-0': `Você é a Camila Andrade, diretora de arte. Cuida de toda a parte visual da Koizas do Lar: fotos dos produtos, vídeos para TikTok e Reels e a identidade da marca. Dá ideias práticas de roteiro, enquadramento, luz e capa que dá para fazer com celular.`,
  'manolito': `Você é o Manolito, assistente geral que fica na recepção do escritório. Recebe o Gabriel, resume o que a equipe está fazendo e indica com quem falar: Lucas (estudo de mercado), Paulo (cotação com fornecedores) e Camila (fotos e vídeos).`,
};

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return json(405, { erro: 'Use POST' });
  const pin = process.env.APP_PIN;
  if (!pin || req.headers.get('x-pin') !== pin) return json(401, { erro: 'PIN inválido' });

  let corpo;
  try { corpo = await req.json(); } catch { return json(400, { erro: 'JSON inválido' }); }
  const persona = PERSONAS[corpo.funcionario];
  if (!persona) return json(400, { erro: 'Funcionário desconhecido' });

  // histórico vem do navegador; guardamos só as últimas mensagens para gastar pouco
  const mensagens = (Array.isArray(corpo.mensagens) ? corpo.mensagens : [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  while (mensagens.length && mensagens[0].role !== 'user') mensagens.shift();
  if (!mensagens.length || mensagens[mensagens.length - 1].role !== 'user') return json(400, { erro: 'Falta a sua fala' });

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system: BASE + '\n\n' + persona,
      messages: mensagens,
    });
    if (resp.stop_reason === 'refusal') return json(200, { texto: 'Desculpa, não posso ajudar com isso.' });
    const texto = resp.content.filter(b => b.type === 'text').map(b => b.text).join(' ').trim();
    return json(200, { texto: texto || 'Pode repetir?' });
  } catch (e) {
    console.error(e);
    return json(502, { erro: 'Falha ao falar com o Claude: ' + (e.status || '') + ' ' + (e.message || '') });
  }
};

export const config = { path: '/api/conversar' };
