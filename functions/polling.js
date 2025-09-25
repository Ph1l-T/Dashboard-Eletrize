﻿// Polling function - busca estados de todos os dispositivos usando base + token
// Formato de resposta padronizado para o frontend:
// { success:true, source:'hubitat', deviceCount:n, data:[ { id, attributes:[{ name:'switch', currentValue:'on' }, ...] }, ... ] }
export async function onRequest(context) {
  const { env } = context;

  if (!env.HUBITAT_BASE_URL || !env.HUBITAT_ACCESS_TOKEN) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Variáveis obrigatórias ausentes: HUBITAT_BASE_URL e/ou HUBITAT_ACCESS_TOKEN'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const base = env.HUBITAT_BASE_URL.replace(/\/$/, '');
    const url = `${base}/all?access_token=${env.HUBITAT_ACCESS_TOKEN}`;

    const response = await fetch(url, { cf: { cacheTtl: 0, cacheEverything: false } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const raw = await response.json();

    // Garantir que é array
    const list = Array.isArray(raw) ? raw : [];

    return new Response(JSON.stringify({
      success: true,
      source: 'hubitat',
      deviceCount: list.length,
      data: list
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
