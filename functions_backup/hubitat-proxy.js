﻿// Hubitat Proxy - envia comandos para dispositivos
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const device = url.searchParams.get('device');
  const command = url.searchParams.get('command');
  const value = url.searchParams.get('value');

  if (!device || !command) {
    return new Response(JSON.stringify({
      error: 'Parâmetros obrigatórios: device e command'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Verifica se as variáveis de ambiente estão configuradas
  if (!env.HUBITAT_BASE_URL || !env.HUBITAT_ACCESS_TOKEN) {
    return new Response(JSON.stringify({
      error: 'Variáveis HUBITAT_BASE_URL ou HUBITAT_ACCESS_TOKEN não configuradas'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    let cmdUrl = `${env.HUBITAT_BASE_URL}/${device}/${encodeURIComponent(command)}`;
    if (value) cmdUrl += `/${encodeURIComponent(value)}`;
    cmdUrl += `?access_token=${env.HUBITAT_ACCESS_TOKEN}`;

    const response = await fetch(cmdUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: true, text };
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
