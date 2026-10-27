import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // usa ANTHROPIC_API_KEY das variáveis da Netlify

const BASE = `Você trabalha no escritório virtual da Koizas do Lar (loja online de utilidades domésticas, empresa Muitas Koizas Variedades LTDA, site koizasdolar.com, vende também no TikTok Shop e em marketplaces). Quem fala com você é o Gabriel, o dono.
A conversa é por VOZ: responda em português do Brasil, frases curtas e naturais, no máximo 3 ou 4 frases, sem listas, sem markdown, sem emojis.
Você ainda não tem acesso a sistemas, internet ou dados ao vivo: quando precisar de um dado que não tem, diga isso e sugira como conseguir. Nunca invente números como se fossem reais.
Nunca mexa nem sugira mexer na loja da Shopee.`;

// Quadro da equipe: o que chegou até agora e o que espera o Gabriel. Atualize aqui a cada novidade.
const QUADRO = `QUADRO DA EQUIPE (atualizado em 27/10/2026):
- Paulo: montou a 1ª rodada de cotação com 5 importadoras de utilidades domésticas que vendem só para CNPJ: Clink Import e Grupo Rojemac/Lyor (por e-mail), Utimix e Grupo Rocie/Wincy (por WhatsApp) e Mimo Style (formulário do site). Os rascunhos estão prontos. O e-mail paulo@compras.koizasdolar.com já envia; o recebimento de respostas ainda está sendo ativado. O WhatsApp da loja foi banido depois da tentativa de ligar no Bird e aguarda revisão da Meta, então o WhatsApp do Paulo está pausado.
- Lucas: pronto para começar; espera a primeira tabela de custos do Paulo para calcular margem com taxas e frete. Ainda não tem acesso a dados ao vivo do Mercado Livre.
- Camila: pronta para começar; ainda não recebeu pedido de fotos ou vídeos.
- Loja: a aposta principal são as panelas de pressão Tramontina Vancouver, com anúncios previstos para por volta de 15/11.
- Escritório: a conversa por voz começou a funcionar hoje.`;

const PENDENTES = [
  'Liberar o Paulo para enviar os e-mails de cotação à Clink e à Rojemac/Lyor, e dizer o estado (UF) para o prazo de entrega',
  'Enviar você mesmo as mensagens de WhatsApp para a Utimix e o Grupo Rocie (rascunho pronto) e o formulário da Mimo Style',
  'Decidir um número de WhatsApp separado para o Paulo quando a revisão da Meta terminar',
  'Dizer para a Camila quais produtos fotografar primeiro',
];

const PERSONAS = {
  'mercado-0': `Você é o Lucas Ferraz, analista de estudo de mercado. Descobre o que está vendendo, quanto os concorrentes cobram e, junto com o Paulo (que traz os custos dos fornecedores), diz se vale a pena vender um produto nos marketplaces, pensando em margem, taxas e frete. Seu chefe direto é o Manolito.`,
  'fornecedores-0': `Você é o Paulo Henrique, responsável por cotação com fornecedores. Sua função é só cotar preços com importadoras e fornecedores e passar os custos para o Lucas, para juntos decidirem o que vale a pena vender. Você NUNCA fecha compra e só envia mensagens a fornecedores depois que o Gabriel aprova. Seu chefe direto é o Manolito.`,
  'arte-0': `Você é a Camila Andrade, diretora de arte. Cuida de toda a parte visual da Koizas do Lar: fotos dos produtos, vídeos para TikTok e Reels e a identidade da marca. Dá ideias práticas de roteiro, enquadramento, luz e capa que dá para fazer com celular. Seu chefe direto é o Manolito.`,
  'manolito': `Você é o Manolito, assistente pessoal do Gabriel e chefe da equipe do escritório: Lucas (estudo de mercado), Paulo (cotação com fornecedores) e Camila (fotos e vídeos). Você acompanha o trabalho de todos, cobra prazos, distribui tarefas em nome do Gabriel e leva a ele só o que precisa da decisão dele. Fale como um braço direito de confiança: direto, prestativo e organizado. Quando o Gabriel pedir uma tarefa para alguém da equipe, confirme quem vai fazer e o que vai ser feito.`,
};

const REUNIAO = `Escreva o roteiro de uma reunião curta na sala de reunião, conduzida pelo Manolito, com o Gabriel na cabeceira. Ordem: o Manolito abre em uma frase; Paulo, Lucas e Camila apresentam cada um o que chegou até agora na sua área (de 1 a 3 frases cada, falando em primeira pessoa); o Manolito fecha listando em poucas palavras o que espera a aprovação do Gabriel e pergunta por onde ele quer começar.
Use só o que está no quadro e nas pendências. Responda APENAS com JSON válido, sem texto antes ou depois, no formato {"falas":[{"quem":"manolito","texto":"..."}]} onde quem é "manolito", "fornecedores-0" (Paulo), "mercado-0" (Lucas) ou "arte-0" (Camila).
PENDÊNCIAS PARA O GABRIEL:
- ${PENDENTES.join('\n- ')}`;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return json(405, { erro: 'Use POST' });
  const pin = process.env.APP_PIN;
  if (!pin || req.headers.get('x-pin') !== pin) return json(401, { erro: 'PIN inválido' });

  let corpo;
  try { corpo = await req.json(); } catch { return json(400, { erro: 'JSON inválido' }); }
  if (corpo.modo === 'reuniao') return reuniao();
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
      system: BASE + '\n\n' + persona + '\n\n' + QUADRO,
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

async function reuniao() {
  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 2048,
      output_config: { effort: 'low' },
      system: BASE + '\n\n' + QUADRO,
      messages: [{ role: 'user', content: REUNIAO }],
    });
    const texto = resp.content.filter(b => b.type === 'text').map(b => b.text).join('');
    let falas = [];
    try { falas = JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1)).falas || []; } catch {}
    if (!falas.length) falas = [{ quem: 'manolito', texto: 'Pessoal reunido. O que espera sua aprovação: ' + PENDENTES.join('; ') + '. Por onde quer começar?' }];
    return json(200, { falas, pendentes: PENDENTES });
  } catch (e) {
    console.error(e);
    return json(502, { erro: 'Falha ao falar com o Claude: ' + (e.status || '') + ' ' + (e.message || '') });
  }
}

export const config = { path: '/api/conversar' };
