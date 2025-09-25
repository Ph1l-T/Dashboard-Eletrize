// IDs de todos os dispositivos de iluminação
const ALL_LIGHT_IDS = [
  '231','232','233','234','235', // Escritório
  '236','237',                   // Projetos
  '238','239','240',             // Programação
  '241','242','243','244',       // Sinuca
  '245','246',                   // Piscina
  '248','249','250',             // Eletrize Solar
  '251','252',                   // Gourmet
  '253',                         // Home
  '254','255','256','257','258', // Funcionários
  '259','260',                   // Cinema
  '261','262','263'              // Recepção
];

// Funções de toggle para ícones nos cards da home
function toggleTelamovelIcon(el) {
    const img = el.querySelector('img');
    if (el.dataset.state === 'off') {
        img.src = 'images/icons/icon-small-telamovel-on.svg';
        el.dataset.state = 'on';
    } else {
        img.src = 'images/icons/icon-small-telamovel-off.svg';
        el.dataset.state = 'off';
    }
}

function toggleSmartglassIcon(el) {
    const img = el.querySelector('img');
    if (el.dataset.state === 'off') {
        img.src = 'images/icons/icon-small-smartglass-on.svg';
        el.dataset.state = 'on';
    } else {
        img.src = 'images/icons/icon-small-smartglass-off.svg';
        el.dataset.state = 'off';
    }
}

function toggleShaderIcon(el) {
    const img = el.querySelector('img');
    if (el.dataset.state === 'off') {
        img.src = 'images/icons/icon-small-shader-on.svg';
        el.dataset.state = 'on';
    } else {
        img.src = 'images/icons/icon-small-shader-off.svg';
        el.dataset.state = 'off';
    }
}

function toggleLightIcon(el) {
    const img = el.querySelector('img');
    const deviceIdsAttr = el.dataset.deviceIds;
    const deviceIds = deviceIdsAttr ? deviceIdsAttr.split(',') : [];

    if (el.dataset.state === 'off') {
        img.src = 'images/icons/icon-small-light-on.svg';
        el.dataset.state = 'on';
        deviceIds.forEach(id => sendHubitatCommand(id, 'on'));
    } else {
        img.src = 'images/icons/icon-small-light-off.svg';
        el.dataset.state = 'off';
        deviceIds.forEach(id => sendHubitatCommand(id, 'off'));
    }
}

function toggleTvIcon(el) {
    const img = el.querySelector('img');
    if (el.dataset.state === 'off') {
        img.src = 'images/icons/icon-small-tv-on.svg';
        el.dataset.state = 'on';
    } else {
        img.src = 'images/icons/icon-small-tv-off.svg';
        el.dataset.state = 'off';
    }
}

// Botões dos cômodos nas páginas internas
function toggleRoomControl(el) {
    const ICON_ON = 'images/icons/icon-small-light-on.svg';
    const ICON_OFF = 'images/icons/icon-small-light-off.svg';
    const img = el.querySelector('.room-control-icon');
    const isOff = (el.dataset.state || 'off') === 'off';
    const newState = isOff ? 'on' : 'off';
    const deviceId = el.dataset.deviceId;
    
    if (!deviceId) return;
    
    // Marcar comando recente para proteger contra polling
    recentCommands.set(deviceId, Date.now());
    
    // Atualizar UI imediatamente
    el.dataset.state = newState;
    if (img) img.src = newState === 'on' ? ICON_ON : ICON_OFF;
    
    // Persist locally
    setStoredState(deviceId, newState);
    
    console.log(`Enviando comando ${newState} para dispositivo ${deviceId}`);
    
    // Send to Hubitat
    sendHubitatCommand(deviceId, newState === 'on' ? 'on' : 'off')
        .then(() => {
            console.log(`✅ Comando ${newState} enviado com sucesso para dispositivo ${deviceId}`);
        })
        .catch(error => {
            console.error(`❌ Erro ao enviar comando para dispositivo ${deviceId}:`, error);
            // Em caso de erro, reverter o estado visual
            const revertState = newState === 'on' ? 'off' : 'on';
            el.dataset.state = revertState;
            if (img) img.src = revertState === 'on' ? ICON_ON : ICON_OFF;
            setStoredState(deviceId, revertState);
        });
}

function setRoomControlUI(el, state) {
    const ICON_ON = 'images/icons/icon-small-light-on.svg';
    const ICON_OFF = 'images/icons/icon-small-light-off.svg';
    const normalized = state === 'on' ? 'on' : 'off';
    
    el.dataset.state = normalized;
    
    const img = el.querySelector('.room-control-icon');
    if (img) {
        const newSrc = normalized === 'on' ? ICON_ON : ICON_OFF;
        img.src = newSrc;
    }
}

function deviceStateKey(deviceId) {
    return `deviceState:${deviceId}`;
}

function getStoredState(deviceId) {
    try {
        const key = deviceStateKey(deviceId);
        const value = localStorage.getItem(key);
        return value;
    } catch (e) {
        return null;
    }
}

function setStoredState(deviceId, state) {
    try {
        const key = deviceStateKey(deviceId);
        localStorage.setItem(key, state);
    } catch (e) {
        console.warn(`❌ Erro ao salvar estado ${deviceId}:`, e);
    }
}

async function fetchDeviceState(deviceId) {
    try {
        const url = urlDeviceInfo(deviceId);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Hubitat state fetch failed: ${resp.status}`);
        const data = await resp.json();
        // Maker API returns attributes array; prefer currentValue, fallback to value
        const attr = Array.isArray(data.attributes) ? data.attributes.find(a => a.name === 'switch') : null;
        const state = attr?.currentValue || attr?.value || 'off';
        return state;
    } catch (error) {
        console.error(`Error fetching state for device ${deviceId}:`, error);
        return 'off'; // fallback
    }
}

async function refreshRoomControlFromHubitat(el) {
    return;
}

function initRoomPage() {
    console.log('🏠 Inicializando página de cômodo...');
    const controls = document.querySelectorAll('.room-control[data-device-id]:not([data-no-sync="true"])');
    
    controls.forEach(el => {
        const deviceId = el.dataset.deviceId;
        // SEMPRE usar estado salvo do carregamento global
        const savedState = getStoredState(deviceId);
        const fallbackState = el.dataset.state || 'off';
        const finalState = savedState !== null ? savedState : fallbackState;
        
        console.log(`🔄 Controle ${deviceId}: salvo="${savedState}", fallback="${fallbackState}", final="${finalState}"`);
        setRoomControlUI(el, finalState);
    });
    
    // Forçar atualização de botões master também
    setTimeout(updateAllMasterButtons, 50);

    // Rename label on Sinuca page: Iluminação -> Bar (UI-only)
    try {
        const route = (window.location.hash || '').replace('#','');
        if (route === 'cafe') {
            document.querySelectorAll('.room-control-label').forEach(l => {
                const t = (l.textContent || '').trim().toLowerCase();
                if (t.startsWith('ilumin')) l.textContent = 'Bar';
            });
        }
    } catch (_) {}
}

// Normalize mis-encoded Portuguese accents across the UI
window.normalizeAccents = function normalizeAccents(root) {
    try {
        const map = new Map([
            ['Escrit��rio','Escritório'],
            ['Programa��ǜo','Programação'],
            ['Recep��ǜo','Recepção'],
            ['Refeit��rio','Refeitório'],
            ['Funcionǭrios','Funcionários'],
            ['Ilumina��o','Iluminação'],
            ['Ilumina��ǜo','Iluminação'],
            ['PainǸis','Painéis'],
            ['Armǭrio','Armário'],
            ['Reuniǜo','Reunião'],
            ['CafǸ','Café'],
        ]);
        const selector = '.page-title, .room-control-label, .room-card span';
        const scope = root || document;
        scope.querySelectorAll(selector).forEach(el => {
            const before = el.textContent || '';
            let after = before;
            map.forEach((val, key) => {
                if (after.includes(key)) after = after.replaceAll(key, val);
            });
            if (after !== before) el.textContent = after;
        });
    } catch (_) {}
};

// --- Funções para a página do Escritório ---

function toggleDevice(el, deviceType) {
    const img = el.querySelector('.control-icon');
    const stateEl = el.querySelector('.control-state');
    const currentState = el.dataset.state;
    let newState;
    let newLabel;

    const icons = {
        light: {
            on: 'images/icons/icon-small-light-on.svg',
            off: 'images/icons/icon-small-light-off.svg'
        },
        tv: {
            on: 'images/icons/icon-small-tv-on.svg',
            off: 'images/icons/icon-small-tv-off.svg'
        },
        shader: {
            on: 'images/icons/icon-small-shader-on.svg',
            off: 'images/icons/icon-small-shader-off.svg'
        }
    };

    if (!icons[deviceType]) return;

    let deviceId = el.dataset.deviceId || null;
    // Fallback por label para compatibilidade
    if (!deviceId) {
        const controlLabel = el.querySelector('.control-label')?.textContent?.trim();
        if (controlLabel === 'Pendente') {
            deviceId = '102';
        } else if (controlLabel === 'Trilho') {
            deviceId = '101';
        }
    }

    if (currentState === 'off' || currentState === 'closed') {
        newState = 'on';
        newLabel = deviceType === 'shader' ? 'Abertas' : 'ON';
        img.src = icons[deviceType].on;
        if (deviceId) sendHubitatCommand(deviceId, 'on');
    } else {
        newState = deviceType === 'shader' ? 'closed' : 'off';
        newLabel = deviceType === 'shader' ? 'Fechadas' : 'OFF';
        img.src = icons[deviceType].off;
        if (deviceId) sendHubitatCommand(deviceId, 'off');
    }

    el.dataset.state = newState;
    if (stateEl) stateEl.textContent = newLabel;
}

// (removido) setupThermostat: não utilizado após retirada da página "escritorio"


// --- Controle do Hubitat ---

// Detecta se está em produção (Cloudflare Pages) ou desenvolvimento
// VERIFICAÇÃO DE CACHE FORÇADA - DEVE SER PRIMEIRA COISA A EXECUTAR
(function() {
    console.log('🧹 VERIFICANDO NECESSIDADE DE LIMPEZA DE CACHE...');
    
    try {
        var lastCacheClear = localStorage.getItem('last_cache_clear');
        var now = Date.now();
        var oneHour = 60 * 60 * 1000; // 1 hora
        
        if (!lastCacheClear || (now - parseInt(lastCacheClear)) > oneHour) {
            console.log('🧹 Cache expirado, forçando reload completo...');
            localStorage.setItem('last_cache_clear', now.toString());
            
            // Limpar todos os caches possíveis
            if ('caches' in window) {
                caches.keys().then(function(names) {
                    names.forEach(function(name) {
                        caches.delete(name);
                    });
                });
            }
            
            // Forçar reload sem cache
            setTimeout(function() {
                location.reload(true);
            }, 100);
            return;
        }
    } catch(e) {
        console.warn('⚠️ Erro na verificação de cache:', e);
    }
})();

const isProductionOriginal = !['localhost', '127.0.0.1', '::1'].includes(location.hostname);
// TEMPORÁRIO: Forçar produção para debug mobile
const isProduction = true; 
console.log('🔍 DEBUG PRODUÇÃO (FORÇADO):', {
    hostname: location.hostname,
    isProductionOriginal: isProductionOriginal,
    isProduction: isProduction,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
});

// Detectar dispositivos móveis
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// SOLUÇÃO: Desabilitar console.log em mobile para evitar travamentos
const ENABLE_DEBUG_LOGS = true; // Logs habilitados em desktop e mobile

// Sistema de detecção de cache desatualizado para mobile (TEMPORARIAMENTE DESABILITADO)
const APP_VERSION = '1.0.0'; // 🎉 MARCO v1.0 - SISTEMA TOTALMENTE FUNCIONAL
(function() {
    if (false && isMobile) { // DESABILITADO para debug
        try {
            var lastVersion = localStorage.getItem('app_version');
            var lastLoad = localStorage.getItem('last_mobile_load');
            var now = new Date().getTime();
            
            // Só recarregar se versão realmente mudou (não por tempo)
            if (lastVersion && lastVersion !== APP_VERSION) {
                console.log('📱 Nova versão detectada - forçando reload cache');
                console.log('📱 Versão anterior:', lastVersion, 'Nova:', APP_VERSION);
                
                // Marcar que já foi recarregado para esta versão
                localStorage.setItem('app_version', APP_VERSION);
                localStorage.setItem('last_mobile_load', now.toString());
                localStorage.setItem('reload_done_' + APP_VERSION, 'true');
                
                // Limpar caches exceto os marcadores de versão
                var itemsToKeep = ['app_version', 'last_mobile_load', 'reload_done_' + APP_VERSION];
                var keysToRemove = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key && !itemsToKeep.includes(key) && !key.startsWith('reload_done_')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
                
                // Forçar reload apenas se não foi feito ainda para esta versão
                if (!localStorage.getItem('reload_done_' + APP_VERSION)) {
                    setTimeout(function() {
                        console.log('📱 Recarregando página para nova versão...');
                        window.location.reload(true);
                    }, 2000);
                    return; // Não continuar inicialização
                }
            } else {
                // Primeira vez ou mesma versão - continuar normalmente
                localStorage.setItem('app_version', APP_VERSION);
                localStorage.setItem('last_mobile_load', now.toString());
                console.log('📱 Mobile cache OK - versão', APP_VERSION);
            }
        } catch(e) {
            console.warn('📱 Erro na verificação de versão mobile:', e);
        }
    }
})();

// Função de log segura para mobile
function safeLog() {
    if (ENABLE_DEBUG_LOGS && typeof console !== 'undefined' && console.log) {
        try {
            console.log.apply(console, arguments);
        } catch (e) {
            // Silenciar se console falhar
        }
    }
}

// Sistema de debug visual para mobile (DESABILITADO - compatibilidade resolvida)
function showMobileDebug(message, type) {
    // Debug desabilitado - funcionalidade mobile estável
    return;
}

// Substituir console.log globalmente para mobile
if (!ENABLE_DEBUG_LOGS) {
    // Criar console mock silencioso para mobile
    window.console = window.console || {};
    window.console.log = function() {};
    window.console.error = function() {};
    window.console.warn = function() {};
}

// Debug mínimo apenas se necessário
if (ENABLE_DEBUG_LOGS) {
    safeLog('=== DASHBOARD ELETRIZE DEBUG ===');
    safeLog('🔍 isProduction:', isProduction, 'isMobile:', isMobile);
}

safeLog('=== AMBIENTE DETECTADO ===', {
    isProduction,
    isMobile,
    isIOS,
    userAgent: navigator.userAgent.substring(0, 60) + '...'
});
const HUBITAT_PROXY_URL = '/hubitat-proxy';
const POLLING_URL = '/polling';
// (Removido: HUBITAT_DIRECT_URL / HUBITAT_ACCESS_TOKEN do frontend por segurança)

// Função para mostrar erro ao usuário
function showErrorMessage(message) {
    // Criar modal de erro
    const errorModal = document.createElement('div');
    errorModal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 0, 0, 0.3);
        border-radius: 16px;
        padding: 20px;
        max-width: 90vw;
        z-index: 10000;
        text-align: center;
        box-shadow: 0 8px 32px rgba(255, 0, 0, 0.1);
    `;
    
    errorModal.innerHTML = `
        <h3 style="color: #e74c3c; margin-bottom: 10px;">❌ Erro de Conexão</h3>
        <p style="margin-bottom: 15px;">${message}</p>
        <button onclick="this.parentElement.remove()" style="
            background: #e74c3c;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
        ">Fechar</button>
    `;
    
    document.body.appendChild(errorModal);
    
    // Remover automaticamente após 10 segundos
    setTimeout(() => {
        if (errorModal.parentElement) {
            errorModal.remove();
        }
    }, 10000);
}

// Fallback direto desativado por segurança (CORS e exposição de token)
async function loadAllDeviceStatesDirect(deviceIds) {
    console.warn('Fallback direto desativado. Usando apenas estados locais armazenados.');
    if (!Array.isArray(deviceIds)) {
        deviceIds = typeof deviceIds === 'string' ? deviceIds.split(',').map(id => id.trim()) : [];
    }
    const devices = {};
    deviceIds.forEach(id => {
        const state = getStoredState(id) || 'off';
        updateDeviceUI(id, state, true);
        devices[id] = { state, success: false, error: 'Direct polling disabled' };
    });
    return { timestamp: new Date().toISOString(), devices, fallback: true, disabled: true };
}

// Função para testar configurações do Hubitat
async function testHubitatConnection() {
    console.log('🔧 Testando conexão com Hubitat...');
    
    try {
        // Testar com um dispositivo conhecido (231)
    const response = await fetch(`${POLLING_URL}?devices=231`);
        console.log('🔧 Status da resposta:', response.status);
        console.log('🔧 Headers da resposta:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('🔧 Conteúdo da resposta:', responseText.substring(0, 300));
        
        if (response.ok) {
            try {
                const data = JSON.parse(responseText);
                console.log('✅ Conexão OK - Dados:', data);
                return true;
            } catch (e) {
                console.error('❌ Resposta não é JSON válido:', e);
                return false;
            }
        } else {
            console.error('❌ Erro HTTP:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro na conexão:', error);
        return false;
    }
}

// Helpers de URL para endpoints comuns da API
function urlDeviceInfo(deviceId) {
    return `${HUBITAT_PROXY_URL}?device=${deviceId}`;
}

function urlSendCommand(deviceId, command, value) {
    return `${HUBITAT_PROXY_URL}?device=${deviceId}&command=${encodeURIComponent(command)}${value !== undefined ? `&value=${encodeURIComponent(value)}` : ''}`;
}

async function sendHubitatCommand(deviceId, command, value) {
    console.log(`Enviando comando: ${command} para dispositivo ${deviceId}${value !== undefined ? ` com valor ${value}` : ''}`);
    
    try {
        // Se estivermos em produção, tenta usar o proxy primeiro
        if (isProduction) {
            const proxyUrl = `${HUBITAT_PROXY_URL}?device=${deviceId}&command=${encodeURIComponent(command)}${value !== undefined ? `&value=${encodeURIComponent(value)}` : ''}`;
            
            try {
                const response = await fetch(proxyUrl);
                const text = await response.text();
                
                // Verifica se a resposta é HTML (indica que a Function não está funcionando)
                if (text.trim().startsWith('<!DOCTYPE') || text.includes('<html')) {
                    throw new Error('Function retornou HTML - fazendo fallback para API direta');
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                console.log('Comando enviado com sucesso via proxy');
                
                // Tenta parse JSON, mas aceita resposta vazia
                try {
                    return JSON.parse(text);
                } catch {
                    return null; // Comando executado mas sem resposta JSON
                }
                
            } catch (error) {
                console.log('Proxy falhou, tentando API direta:', error.message);
            }
        }
        
        throw new Error('Proxy indisponível e acesso direto desativado');
        
    } catch (error) {
        console.error('Erro ao enviar comando para o Hubitat:', error);
        throw error;
    }
}

// --- Cortinas (abrir/parar/fechar) ---
function sendCurtainCommand(deviceId, action, commandName) {
    const cmd = commandName || 'push';
    const map = { open: 1, stop: 2, close: 3 };
    const value = map[action];
    if (value === undefined) throw new Error('Ação de cortina inválida');
    return sendHubitatCommand(deviceId, cmd, value);
}

function curtainAction(el, action) {
    try {
        const id = el?.dataset?.deviceId || el.closest('[data-device-id]')?.dataset?.deviceId;
        const cmd = el?.dataset?.cmd || 'push';
        if (!id) return;
        sendCurtainCommand(id, action, cmd);
    } catch (e) {
        console.error('Falha ao acionar cortina:', e);
    }
}

// Master on/off (Home quick toggle) removido completamente

// --- Override para contornar CORS no browser ao chamar Hubitat ---
// Envia comandos em modo no-cors (resposta opaca) e, em falha, faz um GET via Image.
try {
    if (typeof sendHubitatCommand === 'function') {
        const _corsBypassSend = function(deviceId, command, value) {
            const baseUrl = urlSendCommand(deviceId, command, value);
            // Adiciona cache-buster para evitar SW/cache do navegador
            const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + `_ts=${Date.now()}`;
            console.log(`Enviando comando para o Hubitat (no-cors): ${url}`);
            try {
                return fetch(url, { mode: 'no-cors', cache: 'no-store', credentials: 'omit', redirect: 'follow', referrerPolicy: 'no-referrer', keepalive: true })
                    .then(() => null)
                    .catch(err => {
                        try {
                            const beacon = new Image();
                            beacon.referrerPolicy = 'no-referrer';
                            beacon.src = url;
                        } catch (_) { /* ignore */ }
                        console.error('Erro ao enviar comando (CORS?):', err);
                        return null;
                    });
            } catch (e) {
                try {
                    const beacon = new Image();
                    beacon.referrerPolicy = 'no-referrer';
                    beacon.src = url;
                } catch (_) { /* ignore */ }
                return Promise.resolve(null);
            }
        };
        // Sobrescreve função original
        // eslint-disable-next-line no-global-assign
        sendHubitatCommand = _corsBypassSend;
    }
} catch (_) { /* ignore */ }

// --- Polling automático de estados ---

let pollingInterval = null;
const POLLING_INTERVAL_MS = 5000; // 5 segundos - otimizado para responsividade sem sobrecarregar

// Sistema para evitar conflitos entre comandos manuais e polling
const recentCommands = new Map(); // deviceId -> timestamp do último comando
const COMMAND_PROTECTION_MS = 8000; // 8 segundos de proteção após comando manual

// Sistema de loading para botões master
function setMasterButtonLoading(button, isLoading) {
    console.log('🔄 setMasterButtonLoading chamada:', button, 'loading:', isLoading);
    
    if (isLoading) {
        button.classList.add('loading');
        button.dataset.loading = 'true';
        console.log('✅ Loading ativado - classes:', button.className);
    } else {
        button.classList.remove('loading');
        button.dataset.loading = 'false';
        console.log('❌ Loading desativado - classes:', button.className);
    }
}

function cleanupExpiredCommands() {
    const now = Date.now();
    for (const [deviceId, timestamp] of recentCommands.entries()) {
        if (now - timestamp > COMMAND_PROTECTION_MS) {
            recentCommands.delete(deviceId);
        }
    }
}

function startPolling() {
    if (pollingInterval) return; // Já está rodando
    
    // Buscar estados iniciais imediatamente
    updateDeviceStatesFromServer();
    
    // Depois iniciar polling regular
    pollingInterval = setInterval(updateDeviceStatesFromServer, POLLING_INTERVAL_MS);
    console.log('Polling iniciado - atualizando a cada', POLLING_INTERVAL_MS / 1000, 'segundos');
}

// Funções de proteção removidas para simplificar o sistema

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log('Polling parado');
    }
}

async function updateDeviceStatesFromServer() {
    try {
        // Limpar comandos antigos antes do polling
        cleanupExpiredCommands();
        
        const deviceIds = ALL_LIGHT_IDS.join(',');
        const pollingUrl = isProduction 
            ? `${POLLING_URL}?devices=${deviceIds}`
            : null; // Em dev, pular polling por enquanto
            
        console.log('🔄 POLLING DEBUG:', {
            isProduction: isProduction,
            hostname: location.hostname,
            pollingUrl: pollingUrl,
            deviceIds: deviceIds,
            isMobile: isMobile
        });
            
        if (!pollingUrl) {
            console.log('❌ POLLING BLOQUEADO - não está em produção');
            return;
        }
        
        const response = await fetch(pollingUrl);
        if (!response.ok) throw new Error(`Polling failed: ${response.status}`);
        
        const data = await response.json();

        // Normalizar se vier no formato novo { success, data:[...] }
        let devicesMap = data.devices;
        if (!devicesMap && Array.isArray(data.data)) {
            devicesMap = {};
            data.data.forEach(d => {
                if (!d || !d.id) return;
                let state = 'off';
                
                if (Array.isArray(d.attributes)) {
                    // Formato antigo: attributes é array
                    const sw = d.attributes.find(a => a.name === 'switch');
                    state = (sw?.currentValue || sw?.value || 'off');
                } else if (d.attributes && typeof d.attributes === 'object') {
                    // Formato atual: attributes é objeto
                    if (d.attributes.switch !== undefined) {
                        state = d.attributes.switch;
                    } else {
                        // Pular dispositivos sem switch (botões, sensores, etc.)
                        return;
                    }
                }
                
                devicesMap[d.id] = { state, success: true };
            });
        }
        if (!devicesMap) {
            console.warn('Formato inesperado de resposta no polling:', data);
            return;
        }

        // Atualizar UI com os novos estados (respeitando comandos pendentes)
        Object.entries(devicesMap).forEach(([deviceId, deviceData]) => {
            if (deviceData.success) {
                // Só atualizar localStorage se o estado mudou
                const currentStored = getStoredState(deviceId);
                if (currentStored !== deviceData.state) {
                    setStoredState(deviceId, deviceData.state);
                }
                
                // Atualizar UI (função já verifica se elemento está pendente)
                updateDeviceUI(deviceId, deviceData.state);
            }
        });
        
        // Atualizar todos os botões master (home e cenários)
        updateAllMasterButtons();
        if (typeof updateMasterLightToggleState === 'function') {
            updateMasterLightToggleState();
        }
        
    } catch (error) {
        console.error('Erro no polling:', error);
        
        // Se é erro de JSON (Functions não funcionam), parar polling
        if (error.message.includes('JSON.parse') || error.message.includes('unexpected character')) {
            console.error('❌ PARANDO POLLING - Cloudflare Functions não funcionam');
            stopPolling();
            return;
        }
        
        // Outros erros: tentar novamente em 10 segundos
        setTimeout(() => {
            if (pollingInterval) {
                console.log('Tentando retomar polling após erro...');
            }
        }, 10000);
    }
}

function updateDeviceUI(deviceId, state, forceUpdate = false) {
    // Verificar se o DOM está pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => updateDeviceUI(deviceId, state, forceUpdate));
        return;
    }
    
    // Verificar se há comando recente que deve ser respeitado
    if (!forceUpdate) {
        const lastCommand = recentCommands.get(deviceId);
        if (lastCommand && (Date.now() - lastCommand < COMMAND_PROTECTION_MS)) {
            return;
        }
    }
    
    // Atualizar controles de cômodo
    const roomControls = document.querySelectorAll(`[data-device-id="${deviceId}"]`);
    
    roomControls.forEach((el) => {
        if (el.classList.contains('room-control')) {
            const currentState = el.dataset.state;
            if (currentState !== state || forceUpdate) {
                setRoomControlUI(el, state);
            }
        }
    });
    
    // Atualizar botões master da home após qualquer mudança de dispositivo
    updateAllMasterButtons();
}

function updateAllMasterButtons() {
    const masterButtons = document.querySelectorAll('.room-master-btn');
    masterButtons.forEach(btn => {
        const ids = (btn.dataset.deviceIds || '').split(',').filter(Boolean);
        if (ids.length > 0) {
            const masterState = anyOn(ids) ? 'on' : 'off';
            setMasterIcon(btn, masterState, false); // não forçar se pendente
        }
    });
}

// Funções auxiliares para botões master (movidas do HTML)
function anyOn(deviceIds) {
    return (deviceIds || []).some(id => (getStoredState(id) || 'off') === 'on');
}

function setMasterIcon(btn, state, forceUpdate = false) {
    // Não atualizar se estiver com comando pendente (exceto se forçado)
    if (!forceUpdate && btn.dataset.pending === 'true') {
        console.log('🔒 Master button pendente, ignorando atualização');
        return;
    }
    
    const img = btn.querySelector('img');
    if (!img) return;
    
    const newSrc = state === 'on' ? 'images/icons/icon-small-light-on.svg' : 'images/icons/icon-small-light-off.svg';
    const currentSrc = img.src;
    
    if (!currentSrc.includes(newSrc.split('/').pop())) {
        img.src = newSrc;
        btn.dataset.state = state;
        console.log(`🎨 Master icon atualizado: ${state}`);
    }
}

function initHomeMasters() {
    document.querySelectorAll('.room-master-btn').forEach(btn => {
        const ids = (btn.dataset.deviceIds || '').split(',').filter(Boolean);
        const state = anyOn(ids) ? 'on' : 'off';
        setMasterIcon(btn, state, true); // forçar na inicialização
    });
}

// Função chamada pelo onclick dos botões master na home
function onHomeMasterClick(event, button) {
    console.log('🖱️ onHomeMasterClick chamada!', button);
    event.preventDefault();
    event.stopPropagation();
    
    // Verificar se já está carregando
    if (button.dataset.loading === 'true') {
        console.log('⏸️ Botão já está carregando, ignorando clique');
        return;
    }
    
    const deviceIds = (button.dataset.deviceIds || '').split(',').filter(Boolean);
    console.log('🔍 Device IDs encontrados:', deviceIds);
    
    if (deviceIds.length === 0) {
        console.log('❌ Nenhum device ID encontrado');
        return;
    }
    
    // Determinar comando baseado no estado atual
    const currentState = anyOn(deviceIds) ? 'on' : 'off';
    const newCommand = currentState === 'on' ? 'off' : 'on';
    console.log('🎯 Comando determinado:', currentState, '→', newCommand);
    
    // Ativar loading visual
    console.log('🔄 Ativando loading visual...');
    setMasterButtonLoading(button, true);
    
    // Atualizar UI imediatamente
    setMasterIcon(button, newCommand);
    
    // Enviar comandos para todos os dispositivos (master dos ambientes mantém comportamento original)
    const promises = deviceIds.map(deviceId => {
        // Marcar comando recente
        recentCommands.set(deviceId, Date.now());
        setStoredState(deviceId, newCommand);
        return sendHubitatCommand(deviceId, newCommand);
    });
    
    // Aguardar conclusão de todos os comandos
    Promise.allSettled(promises).finally(() => {
        // Remover loading após comandos
        setTimeout(() => {
            setMasterButtonLoading(button, false);
        }, 1000); // 1 segundo de delay para feedback visual
    });
}

// Função especial para atualizar estados após comandos master
function updateStatesAfterMasterCommand(deviceIds, command) {
    console.log(`🎯 Atualizando estados após master ${command} para:`, deviceIds);
    
    // Atualizar todos os dispositivos affected
    deviceIds.forEach(deviceId => {
        updateDeviceUI(deviceId, command, true);
    });
    
    // Forçar atualização de todos os masters
    setTimeout(() => {
        const masterButtons = document.querySelectorAll('.room-master-btn');
        masterButtons.forEach(btn => {
            const ids = (btn.dataset.deviceIds || '').split(',').filter(Boolean);
            if (ids.some(id => deviceIds.includes(id))) {
                const masterState = anyOn(ids) ? 'on' : 'off';
                setMasterIcon(btn, masterState, true); // forçar atualização
            }
        });
    }, 100);
}

// === SISTEMA DE CARREGAMENTO GLOBAL ===

// Controle da tela de loading
function showLoader() {
    try {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.classList.remove('hidden');
            loader.style.display = 'flex'; // Forçar display
            updateProgress(0, 'Iniciando carregamento...');
            console.log('📱 Loader exibido');
        } else {
            console.warn('⚠️ Elemento loader não encontrado');
        }
    } catch (error) {
        console.error('❌ Erro ao mostrar loader:', error);
    }
}

function hideLoader() {
    try {
        const loader = document.getElementById('global-loader');
        if (loader) {
            const delay = 500; // Tempo padrão para desktop e mobile
            setTimeout(() => {
                loader.classList.add('hidden');
                // Esconder completamente após transição
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 500);
                console.log('📱 Loader escondido');
            }, delay);
        }
    } catch (error) {
        console.error('❌ Erro ao esconder loader:', error);
    }
}

function updateProgress(percentage, text) {
    try {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const loaderText = document.querySelector('.loader-text');
        
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
        
        if (progressText) {
            progressText.textContent = Math.round(percentage) + '%';
        }
        
        if (loaderText && text) {
            loaderText.textContent = text;
        }
        
        // Log para debug mobile
        console.log(`📊 Progresso: ${percentage}% - ${text || 'Carregando...'}`);
        
    } catch (error) {
        console.warn('⚠️ Erro ao atualizar progresso:', error);
    }
}

// Carregamento global de todos os estados dos dispositivos
async function loadAllDeviceStatesGlobally() {
    console.log('🌍 Iniciando carregamento global de estados...');
    console.log('🌍 ALL_LIGHT_IDS disponível:', !!ALL_LIGHT_IDS, 'Length:', ALL_LIGHT_IDS ? ALL_LIGHT_IDS.length : 'undefined');
    console.log('🌍 DEBUG CARREGAMENTO:', {
        isProduction: isProduction,
        hostname: location.hostname,
        isMobile: isMobile,
        userAgent: navigator.userAgent.substring(0, 100)
    });
    
    // Mobile e desktop usam EXATAMENTE o mesmo carregamento
    console.log('🌍 Carregamento universal (desktop e mobile idênticos)');
    
    if (!isProduction) {
        console.log('💻 MODO DESENVOLVIMENTO ATIVO - carregando do localStorage');
        console.log('💻 ISSO PODE SER O PROBLEMA NO MOBILE!');
        console.log('📋 Dispositivos a carregar:', ALL_LIGHT_IDS.length);
        updateProgress(20, 'Modo DEV - Estados salvos...');
        
        // Simular carregamento para melhor UX (mobile-friendly)
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
            // Fallback se Promise.resolve falhar
            console.warn('Promise fallback ativo');
        }
        
        let loadedCount = 0;
        ALL_LIGHT_IDS.forEach((deviceId, index) => {
            let storedState = 'off';
            try {
                storedState = getStoredState(deviceId) || 'off';
                updateDeviceUI(deviceId, storedState, true); // forceUpdate = true
                loadedCount++;
            } catch (e) {
                console.warn(`❌ Erro ao processar ${deviceId}:`, e);
            }
            
            const progress = 20 + ((index + 1) / ALL_LIGHT_IDS.length) * 80;
            updateProgress(progress, `Dispositivo ${index + 1}/${ALL_LIGHT_IDS.length}...`);
        });
        
        console.log(`✅ Carregamento completo: ${loadedCount}/${ALL_LIGHT_IDS.length} dispositivos`);
        updateProgress(100, 'Carregamento concluído!');
        return true;
    }
    
    try {
        console.log('🌍 MODO PRODUÇÃO ATIVO - buscando do servidor');
        updateProgress(10, 'Conectando com servidor...');
        
        const deviceIds = ALL_LIGHT_IDS.join(',');
        console.log(`📡 Buscando estados de ${ALL_LIGHT_IDS.length} dispositivos no servidor...`);
        console.log('📡 URL será:', `${POLLING_URL}?devices=${deviceIds}`);
        
        updateProgress(30, 'Enviando solicitação...');
        
        // Configurações otimizadas para mobile
        const fetchOptions = {
            method: 'GET',
            cache: 'default',
            mode: 'cors'
        };
        
        // Timeout mais longo para mobile (compatível com browsers antigos)
        let controller, timeoutId;
        const timeout = 10000; // 10s padrão para desktop e mobile
        
        // Verificar se AbortController é suportado
        if (typeof AbortController !== 'undefined') {
            controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), timeout);
            fetchOptions.signal = controller.signal;
        } else {
            console.warn('⚠️ AbortController não suportado - sem timeout');
        }
        
        const requestUrl = `${POLLING_URL}?devices=${deviceIds}`;
        console.log('📡 Fazendo fetch para:', requestUrl);
        
        const response = await fetch(requestUrl, fetchOptions);
        if (timeoutId) clearTimeout(timeoutId);
        
        console.log('📡 Resposta recebida, status:', response.status);
        updateProgress(50, 'Recebendo dados...');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let data;
        let responseText = '';
        try {
            console.log('📡 Parseando resposta JSON...');
            
            // Debug: Capturar o texto da resposta primeiro
            responseText = await response.text();
            console.log('📡 Resposta recebida (texto):', responseText.substring(0, 500)); // Primeiros 500 chars
            
            if (!responseText) {
                throw new Error('Resposta vazia do servidor');
            }
            
            // Verificar se é HTML (Functions não estão funcionando)
            if (responseText.trim().startsWith('<!DOCTYPE html') || responseText.trim().startsWith('<html')) {
                console.error('❌ CRÍTICO: Cloudflare Functions não estão funcionando!');
                console.error('❌ O servidor está retornando HTML em vez de executar as Functions.');
                console.error('❌ Implementando fallback automático para API direta do Hubitat...');
                
                // FALLBACK AUTOMÁTICO: Usar API direta do Hubitat
                console.log('🔄 Tentando API direta do Hubitat como fallback...');
                updateProgress(60, 'Usando API direta como fallback...');
                
                try {
                    const fallbackData = await loadAllDeviceStatesDirect(ALL_LIGHT_IDS);
                    console.log('✅ Fallback bem-sucedido:', fallbackData);
                    
                    // Processar dados do fallback
                    const deviceEntries = Object.entries(fallbackData.devices);
                    let processedCount = 0;
                    
                    deviceEntries.forEach(([deviceId, deviceData]) => {
                        if (deviceData.success) {
                            setStoredState(deviceId, deviceData.state);
                            updateDeviceUI(deviceId, deviceData.state, true);
                            console.log(`✅ Device ${deviceId}: ${deviceData.state} (direto)`);
                        } else {
                            const storedState = getStoredState(deviceId) || 'off';
                            updateDeviceUI(deviceId, storedState, true);
                            console.log(`⚠️ Device ${deviceId}: usando estado salvo "${storedState}"`);
                        }
                        
                        processedCount++;
                        const progress = 60 + (processedCount / deviceEntries.length) * 35;
                        updateProgress(progress, `Processando ${processedCount}/${deviceEntries.length}...`);
                    });
                    
                    updateProgress(100, 'Carregamento via API direta concluído!');
                    
                    // Forçar atualização dos botões master
                    setTimeout(() => {
                        updateAllMasterButtons();
                        console.log('🔄 Botões master atualizados após fallback');
                    }, 100);
                    
                    console.log('✅ Fallback automático concluído com sucesso');
                    return true;
                    
                } catch (fallbackError) {
                    console.error('❌ Fallback também falhou:', fallbackError);
                    
                    // Último recurso: usar estados salvos
                    console.log('📦 Usando estados salvos como último recurso...');
                    ALL_LIGHT_IDS.forEach(deviceId => {
                        const storedState = getStoredState(deviceId) || 'off';
                        updateDeviceUI(deviceId, storedState, true);
                    });
                    
                    throw new Error('Functions não funcionam e API direta também falhou - usando estados salvos');
                }
            }
            
            // Tentar parsear o JSON
            data = JSON.parse(responseText);
            console.log('📡 JSON parseado com sucesso');
        } catch (jsonError) {
            console.error('❌ Erro ao parsear JSON:', jsonError);
            console.error('❌ Conteúdo da resposta que falhou:', responseText?.substring(0, 200));
            throw new Error(`Resposta inválida do servidor: ${jsonError.message}`);
        }
        console.log('📡 Estados recebidos:', data);

        // Normalização do formato de resposta:
        // Formato antigo esperado: { devices: { id: { state, success } } }
        // Novo formato (Cloudflare Function refatorada): { success:true, data:[ { id, attributes:[{name:'switch', currentValue:'on'}] } ] }
        if (!data.devices) {
            try {
                if (Array.isArray(data.data)) {
                    console.log('🔄 Normalizando', data.data.length, 'dispositivos do formato novo...');
                    const mapped = {};
                    data.data.forEach((d, index) => {
                        if (!d || !d.id) {
                            console.warn(`⚠️ Dispositivo ${index} inválido:`, d);
                            return;
                        }
                        
                        let state = 'off';
                        
                        if (Array.isArray(d.attributes)) {
                            // Formato antigo: attributes é array de objetos
                            const sw = d.attributes.find(a => a.name === 'switch');
                            if (sw) {
                                state = (sw?.currentValue || sw?.value || 'off');
                            }
                        } else if (d.attributes && typeof d.attributes === 'object') {
                            // Formato atual: attributes é objeto direto com propriedades
                            if (d.attributes.switch !== undefined) {
                                state = d.attributes.switch;
                                console.log(`📋 Device ${d.id}: switch=${state}`);
                            } else {
                                console.log(`🔘 Device ${d.id}: não é lâmpada (sem atributo 'switch'), pulando...`);
                                return; // Pular dispositivos sem switch (botões, sensores, etc.)
                            }
                        } else {
                            console.warn(`⚠️ Device ${d.id}: attributes inválido:`, d.attributes);
                        }
                        
                        mapped[d.id] = { state, success: true };
                    });
                    data.devices = mapped;
                    console.log('🔄 Resposta normalizada para formato devices (', Object.keys(mapped).length, 'dispositivos )');
                    console.log('🔍 Estados finais mapeados:', mapped);
                } else {
                    throw new Error('Formato de resposta inesperado: falta campo devices e data[]');
                }
            } catch (normError) {
                console.error('❌ Falha ao normalizar resposta:', normError);
                throw normError;
            }
        }

        updateProgress(70, 'Processando estados...');

        // Processar dispositivos com progresso
        const deviceEntries = Object.entries(data.devices || {});
        console.log(`🔍 Processando ${deviceEntries.length} dispositivos...`);
        let processedCount = 0;
        
        deviceEntries.forEach(([deviceId, deviceData]) => {
            if (deviceData.success) {
                setStoredState(deviceId, deviceData.state);
                updateDeviceUI(deviceId, deviceData.state, true); // forceUpdate = true
                console.log(`✅ Device ${deviceId}: ${deviceData.state}`);
            } else {
                console.warn(`⚠️ Falha no device ${deviceId}:`, deviceData.error);
                // Usar estado salvo como fallback
                const storedState = getStoredState(deviceId) || 'off';
                updateDeviceUI(deviceId, storedState, true); // forceUpdate = true
            }
            
            processedCount++;
            const progress = 70 + (processedCount / deviceEntries.length) * 25;
            updateProgress(progress, `Aplicando estado ${processedCount}/${deviceEntries.length}...`);
        });
        
        updateProgress(95, 'Finalizando sincronização...');
        
        // Forçar atualização de todos os botões master após carregamento
        setTimeout(() => {
            updateAllMasterButtons();
            console.log('🔄 Botões master atualizados após carregamento global');
        }, 100);
        
        updateProgress(100, 'Estados carregados com sucesso!');
        console.log('✅ Carregamento global concluído com sucesso');
        return true;
        
    } catch (error) {
        console.error('❌ Erro no carregamento global:', error);
        
        // Tentar diagnóstico automático da conexão
        try {
            console.log('🔧 Executando diagnóstico da conexão...');
            const connectionTest = await testHubitatConnection();
            if (!connectionTest) {
                showErrorMessage('Falha na conexão com Hubitat. Verifique se as configurações foram alteradas no painel do Cloudflare.');
            }
        } catch (diagError) {
            console.error('Erro no diagnóstico:', diagError);
        }
        
        // Tratamento universal de erro (desktop e mobile idênticos)
        if (error.name === 'AbortError') {
            console.warn('⏱️ Timeout de rede detectado');
            updateProgress(60, 'Timeout - usando backup...');
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.warn('🌐 Problema de conectividade');
            updateProgress(60, 'Sem rede - modo offline...');
        } else {
            console.warn('❌ Erro no carregamento:', error.message);
            updateProgress(60, 'Erro - usando backup...');
        }
        
        // Fallback para localStorage
        ALL_LIGHT_IDS.forEach((deviceId, index) => {
            const storedState = getStoredState(deviceId) || 'off';
            updateDeviceUI(deviceId, storedState, true); // forceUpdate = true
            
            const progress = 60 + ((index + 1) / ALL_LIGHT_IDS.length) * 35;
            updateProgress(progress, `Carregando backup ${index + 1}/${ALL_LIGHT_IDS.length}...`);
        });
        
        const offlineMsg = 'Carregamento concluído (modo offline)';
        updateProgress(100, offlineMsg);
        return false;
    }
}

// Verificar compatibilidade com mobile
function checkMobileCompatibility() {
    const issues = [];
    const warnings = [];
    
    // APIs críticas (falha total se não existirem)
    if (typeof fetch === 'undefined') {
        issues.push('Fetch API não suportada');
    }
    
    if (typeof Promise === 'undefined') {
        issues.push('Promises não suportadas');
    }
    
    // APIs opcionais (warnings apenas)
    if (typeof MutationObserver === 'undefined') {
        warnings.push('MutationObserver não suportado (usar fallback)');
    }
    
    if (typeof AbortController === 'undefined') {
        warnings.push('AbortController não suportado (sem timeout)');
    }
    
    if (typeof localStorage === 'undefined') {
        warnings.push('LocalStorage não suportado (sem persistência)');
    }
    
    // Testar localStorage funcionamento
    try {
        const testKey = '__test_ls__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
    } catch (e) {
        warnings.push('LocalStorage bloqueado (modo privado?)');
    }
    
    if (warnings.length > 0) {
        console.warn('⚠️ Avisos de compatibilidade:', warnings);
    }
    
    if (issues.length > 0) {
        console.error('❌ Problemas críticos detectados:', issues);
        return false;
    }
    
    console.log('✅ Compatibilidade mobile verificada');
    return true;
}

// Observador para sincronizar novos elementos no DOM
function setupDomObserver() {
    // Verificar se MutationObserver está disponível
    if (typeof MutationObserver === 'undefined') {
        console.warn('⚠️ MutationObserver não disponível - usando fallback');
        // Fallback: verificar mudanças periodicamente
        setInterval(() => {
            syncAllVisibleControls();
        }, 5000);
        return;
    }
    
    try {
        const observer = new MutationObserver((mutations) => {
        let needsUpdate = false;
        
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Verificar se adicionou controles de dispositivos
                    const controls = node.querySelectorAll ? 
                        node.querySelectorAll('.room-control[data-device-id], .room-master-btn[data-device-ids]') :
                        [];
                    
                    if (controls.length > 0 || node.matches?.('.room-control[data-device-id], .room-master-btn[data-device-ids]')) {
                        needsUpdate = true;
                        console.log('🔍 Novos controles adicionados ao DOM, sincronizando estados...');
                    }
                }
            });
        });
        
        if (needsUpdate) {
            // Aguardar um pouco para DOM estar estável
            setTimeout(() => {
                syncAllVisibleControls();
            }, 50);
        }
    });
    
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('👁️ Observador DOM configurado para sincronização automática');
        
    } catch (error) {
        console.error('❌ Erro ao configurar MutationObserver:', error);
        console.warn('📱 Usando fallback para compatibilidade mobile');
        
        // Fallback: verificar mudanças a cada 5 segundos
        setInterval(() => {
            syncAllVisibleControls();
        }, 5000);
    }
}

// Sincronizar todos os controles visíveis com estados salvos
function syncAllVisibleControls(forceMasterUpdate = false) {
    console.log('🔄 Sincronizando todos os controles visíveis...');
    
    // Sincronizar controles de cômodo
    const roomControls = document.querySelectorAll('.room-control[data-device-id]');
    let updatedControls = 0;
    
    roomControls.forEach(el => {
        const deviceId = el.dataset.deviceId;
        const savedState = getStoredState(deviceId);
        const currentState = el.dataset.state;
        
        if (savedState && currentState !== savedState) {
            console.log(`🔄 Sincronizando controle ${deviceId}: ${currentState} → ${savedState}`);
            setRoomControlUI(el, savedState);
            updatedControls++;
        }
    });
    
    // Atualizar botões master (forçar se necessário)
    const masterButtons = document.querySelectorAll('.room-master-btn');
    masterButtons.forEach(btn => {
        const ids = (btn.dataset.deviceIds || '').split(',').filter(Boolean);
        if (ids.length > 0) {
            const masterState = anyOn(ids) ? 'on' : 'off';
            setMasterIcon(btn, masterState, forceMasterUpdate);
        }
    });
    
    console.log(`✅ Sincronização completa: ${updatedControls} controles atualizados`);
}

// Comandos de debug globais
window.debugEletrize = {
    forcePolling: updateDeviceStatesFromServer,
    reloadStates: loadAllDeviceStatesGlobally,
    syncControls: syncAllVisibleControls,
    showLoader: showLoader,
    hideLoader: hideLoader,
    checkDevice: (deviceId) => {
        const stored = getStoredState(deviceId);
        console.log(`Device ${deviceId}: stored=${stored}`);
    },
    checkAllDevices: () => {
        console.log('📋 Estados de todos os dispositivos:');
        ALL_LIGHT_IDS.forEach(deviceId => {
            const stored = getStoredState(deviceId);
            console.log(`  ${deviceId}: ${stored}`);
        });
    },
    testSetState: (deviceId, state) => {
        console.log(`🧪 Testando setState(${deviceId}, ${state})`);
        setStoredState(deviceId, state);
        updateDeviceUI(deviceId, state, true);
        console.log(`✅ Teste completo`);
    },
    clearAllStates: () => {
        console.log('🗑️ Limpando todos os estados salvos...');
        ALL_LIGHT_IDS.forEach(deviceId => {
            try {
                localStorage.removeItem(deviceStateKey(deviceId));
            } catch (e) {}
        });
        console.log('✅ Estados limpos');
    },
    checkProtectedCommands: () => {
        console.log('🛡️ Comandos protegidos:');
        if (recentCommands.size === 0) {
            console.log('  ✅ Nenhum comando protegido');
            return;
        }
        const now = Date.now();
        recentCommands.forEach((timestamp, deviceId) => {
            const remaining = Math.max(0, COMMAND_PROTECTION_MS - (now - timestamp));
            const status = remaining > 0 ? '🔒 ATIVO' : '🔓 EXPIRADO';
            console.log(`  ${status} ${deviceId}: ${Math.ceil(remaining/1000)}s restantes`);
        });
    },
    testMasterLoading: () => {
        console.log('🔄 Testando loading nos botões master...');
        const masters = document.querySelectorAll('.room-master-btn');
        const scenes = document.querySelectorAll('.scene-control-card');
        
        console.log('Botões master encontrados:', masters.length);
        console.log('Botões de cenário encontrados:', scenes.length);
        
        // Testar botões master da home
        masters.forEach((btn, index) => {
            console.log(`Testando botão master ${index + 1}:`, btn);
            setTimeout(() => {
                setMasterButtonLoading(btn, true);
                setTimeout(() => {
                    setMasterButtonLoading(btn, false);
                }, 3000);
            }, index * 200);
        });
        
        // Testar botão de cenários também
        scenes.forEach((btn, index) => {
            setTimeout(() => {
                setMasterButtonLoading(btn, true);
                setTimeout(() => {
                    setMasterButtonLoading(btn, false);
                }, 3000);
            }, (masters.length + index) * 200);
        });
    },
    checkMasterButtons: () => {
        console.log('🏠 Status dos botões master:');
        document.querySelectorAll('.room-master-btn').forEach((btn, index) => {
            const ids = (btn.dataset.deviceIds || '').split(',').filter(Boolean);
            const route = btn.dataset.route || 'unknown';
            const pending = btn.dataset.pending === 'true';
            const currentState = btn.dataset.state || 'unknown';
            const calculatedState = anyOn(ids) ? 'on' : 'off';
            const consistent = currentState === calculatedState;
            
            console.log(`  ${index + 1}. ${route}: ${currentState} (calc: ${calculatedState}) ${consistent ? '✅' : '❌'} ${pending ? '⏳' : '🔓'}`);
        });
    },
    fixMasterButtons: () => {
        console.log('🔧 Corrigindo todos os botões master...');
        document.querySelectorAll('.room-master-btn').forEach(btn => {
            btn.dataset.pending = 'false';
            const ids = (btn.dataset.deviceIds || '').split(',').filter(Boolean);
            const state = anyOn(ids) ? 'on' : 'off';
            setMasterIcon(btn, state, true);
        });
        console.log('✅ Botões master corrigidos!');
    },
    mobileInfo: () => {
        console.log('📱 Informações do dispositivo móvel:');
        console.log('  isMobile:', isMobile);
        console.log('  isIOS:', isIOS);
        console.log('  isProduction:', isProduction);
        console.log('  User Agent:', navigator.userAgent);
        console.log('  App Version:', APP_VERSION);
        try {
            console.log('  Última carga:', new Date(parseInt(localStorage.getItem('last_mobile_load') || '0')));
            console.log('  Versão cache:', localStorage.getItem('app_version'));
        } catch(e) {
            console.log('  localStorage indisponível');
        }
    },
    // Debug do Ar Condicionado

    clearMobileCache: () => {
        console.log('🧹 Limpando cache mobile...');
        try {
            localStorage.removeItem('app_version');
            localStorage.removeItem('last_mobile_load');
            localStorage.removeItem('app_cache_version');
            sessionStorage.clear();
            console.log('✅ Cache mobile limpo! Recarregue a página.');
        } catch(e) {
            console.error('❌ Erro ao limpar cache:', e);
        }
    },
    forceMobileReload: () => {
        console.log('🔄 Forçando recarga mobile com limpeza de cache...');
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch(e) {}
        setTimeout(() => {
            window.location.reload(true);
        }, 1000);
    },
    checkMobileCache: () => {
        console.log('🔍 Status do cache mobile:');
        try {
            const version = localStorage.getItem('app_version');
            const lastLoad = localStorage.getItem('last_mobile_load');
            const now = new Date().getTime();
            
            console.log('  App Version atual:', APP_VERSION);
            console.log('  Versão em cache:', version);
            console.log('  Cache válido:', version === APP_VERSION);
            
            if (lastLoad) {
                const age = Math.floor((now - parseInt(lastLoad)) / 60000); // minutos
                console.log('  Idade do cache:', age, 'minutos');
                console.log('  Cache expirado:', age > 60);
            } else {
                console.log('  Primeira carga detectada');
            }
        } catch(e) {
            console.error('  Erro na verificação:', e);
        }
        console.log('  Screen:', `${screen.width}x${screen.height}`);
        console.log('  Viewport:', `${window.innerWidth}x${window.innerHeight}`);
        console.log('  Connection:', navigator.connection ? 
            `${navigator.connection.effectiveType} (${navigator.connection.downlink}Mbps)` : 
            'Não disponível');
        checkMobileCompatibility();
    },
    testMobileApi: async () => {
        console.log('🧪 Testando APIs para mobile...');
        try {
            const testUrl = isProduction ? '/functions/polling?devices=366' : '#test';
            // Configurar timeout compatível
            const fetchConfig = { 
                method: 'GET',
                cache: 'no-cache'
            };
            
            // Adicionar timeout se AbortController for suportado
            if (typeof AbortController !== 'undefined') {
                const testController = new AbortController();
                setTimeout(() => testController.abort(), 5000);
                fetchConfig.signal = testController.signal;
            }
            
            const response = await fetch(testUrl, fetchConfig);
            console.log('✅ Fetch test:', response.status, response.statusText);
        } catch (error) {
            console.error('❌ Fetch test failed:', error);
        }
    }
};

// Versão ultra-básica para browsers problemáticos
function initUltraBasicMode() {
    try {
        showMobileDebug('🚨 Inicializando modo ultra-básico...', 'info');
        
        // Esconder loader de forma mais segura
        var loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.display = 'none';
            showMobileDebug('✅ Loader escondido em modo básico', 'success');
        }
        
        // Definir estados básicos sem usar localStorage (pode falhar no mobile)
        var processedDevices = 0;
        ALL_LIGHT_IDS.forEach(function(deviceId) {
            try {
                var controls = document.querySelectorAll('[data-device-id="' + deviceId + '"]');
                controls.forEach(function(control) {
                    if (control.classList.contains('room-control')) {
                        control.dataset.state = 'off';
                        var img = control.querySelector('.room-control-icon');
                        if (img) {
                            img.src = 'images/icons/icon-small-light-off.svg';
                        }
                        processedDevices++;
                    }
                });
            } catch (e) {
                showMobileDebug('Erro no dispositivo ' + deviceId + ': ' + e.message, 'error');
            }
        });
        
        showMobileDebug('✅ Modo ultra-básico ativo - ' + processedDevices + ' dispositivos processados', 'success');
        
        // Verificar elementos básicos
        var controls = document.querySelectorAll('.room-control');
        var masters = document.querySelectorAll('.room-master-btn');
        showMobileDebug('🔍 Encontrados ' + controls.length + ' controles e ' + masters.length + ' masters', 'info');
        
        return true; // Sucesso
        
    } catch (error) {
        showMobileDebug('❌ ERRO CRÍTICO no modo ultra-básico: ' + error.message, 'error');
        return false; // Falha
    }
}

// Função de inicialização simplificada para mobile COM POLLING ATIVO
function initSimpleMode() {
    console.log('📱 Inicializando modo simples com polling...');
    
    try {
        console.log('📱 Tentando mostrar loader...');
        showLoader();
        
        console.log('📱 Atualizando progresso...');
        updateProgress(10, 'Modo simples com polling ativo...');
        
        console.log('📱 Processando', ALL_LIGHT_IDS.length, 'dispositivos...');
        
        // Carregar estados básicos
        for (var i = 0; i < ALL_LIGHT_IDS.length; i++) {
            var deviceId = ALL_LIGHT_IDS[i];
            var progress = 10 + ((i + 1) / ALL_LIGHT_IDS.length) * 70; // Deixar 20% para polling
            
            console.log('📱 Processando device', deviceId, '- progresso:', progress + '%');
            updateProgress(progress, 'Carregando ' + (i + 1) + '/' + ALL_LIGHT_IDS.length + '...');
            
            try {
                updateDeviceUI(deviceId, 'off', true);
            } catch (e) {
                console.error('❌ Erro no device', deviceId + ':', e);
            }
        }
        
        console.log('📱 Configurando polling para modo simples...');
        updateProgress(85, 'Ativando sincronização...');
        
        // Configurar observador DOM simplificado
        try {
            setupDomObserver();
            console.log('✅ Observador DOM configurado no modo simples');
        } catch (e) {
            console.warn('⚠️ Observador DOM falhou no modo simples:', e);
        }
        
        // Sincronizar controles visíveis
        updateProgress(90, 'Sincronizando controles...');
        setTimeout(function() {
            try {
                syncAllVisibleControls();
                console.log('✅ Controles sincronizados no modo simples');
            } catch (e) {
                console.warn('⚠️ Sincronização falhou:', e);
            }
        }, 300);
        
        // IMPLEMENTAR POLLING NO MODO SIMPLES
        updateProgress(95, 'Iniciando polling...');
        setTimeout(function() {
            if (isProduction) {
                console.log('🔄 Iniciando polling em modo simples...');
                try {
                    startPolling(); // Ativar polling completo mesmo no modo simples
                    console.log('✅ Polling ativo no modo simples');
                } catch (e) {
                    console.error('❌ Erro ao iniciar polling no modo simples:', e);
                }
            } else {
                console.log('💻 Modo desenvolvimento - polling não iniciado no modo simples');
            }
            
            updateProgress(100, 'Modo simples com polling ativo!');
            
            setTimeout(function() {
                console.log('📱 Escondendo loader...');
                hideLoader();
                console.log('✅ Modo simples com polling completo ativo');
            }, 1000);
        }, 2000); // Aguardar 2s para estabilizar antes do polling
        
    } catch (error) {
        console.error('❌ ERRO CRÍTICO no modo simples:', error);
        console.error('❌ Erro stack:', error.stack);
        console.error('❌ Erro linha:', error.lineNumber || 'desconhecida');
        
        // Ativar modo ultra-básico como fallback
        console.log('🚨 Ativando modo ultra-básico...');
        initUltraBasicMode();
    }
}

// Tratamento de erros globais para debug mobile
window.onerror = function(message, source, lineno, colno, error) {
    console.error('🚨 ERRO GLOBAL DETECTADO:');
    console.error('📍 Mensagem:', message);
    console.error('📍 Arquivo:', source);
    console.error('📍 Linha:', lineno);
    console.error('📍 Coluna:', colno);
    console.error('📍 Erro:', error);
    
    // Tentar ativar modo ultra-básico
    setTimeout(function() {
        console.log('🚨 Tentando recuperação automática...');
        try {
            initUltraBasicMode();
        } catch (e) {
            console.error('💥 Falha na recuperação:', e);
        }
    }, 1000);
    
    return false; // Não impedir outros handlers
};

// Capturar promises rejeitadas
window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 PROMISE REJEITADA:', event.reason);
    console.error('🚨 Promise:', event.promise);
});

console.log('Script carregado, configurando DOMContentLoaded...');

// Função de inicialização unificada (mobile e desktop idênticos)  
// Função de inicialização unificada (mobile e desktop idênticos)
function initializeApp() {
    console.log('DASHBOARD ELETRIZE INICIALIZANDO');
    console.log('Mobile detectado:', isMobile);
    
    // Marcar que a inicialização foi iniciada
    window.initializationStarted = true;
    
    // Debug visual para mobile
    showMobileDebug('DASHBOARD ELETRIZE INICIALIZANDO', 'info');
    
    // Envolver tudo em try-catch para capturar qualquer erro
    try {
        console.log('Iniciando carregamento (comportamento unificado)...');
        showLoader();
        
        // Timeout padrão para desktop e mobile (comportamento idêntico)
        var initDelay = 500;
        console.log('Delay de inicialização: ' + initDelay + 'ms (universal)');
        
        // Aguardar um pouco para UI carregar e então iniciar carregamento
        setTimeout(function() {
            console.log('Iniciando carregamento principal...');
            
            try {
                // Carregamento global de todos os estados (usando Promise)
                loadAllDeviceStatesGlobally().then(function(success) {
                    console.log('Carregamento global concluído, success:', success);
                    
                    // Delay final padrão para desktop e mobile
                    var finalDelay = 800;
                    setTimeout(function() {
                        // Esconder loader
                        hideLoader();
                        
                        // Configurar observador DOM
                        setupDomObserver();
                        
                        // Sincronizar controles já existentes
                        var syncDelay = 100;
                        setTimeout(syncAllVisibleControls, syncDelay);
                        
                        // Iniciar polling se estiver em produção
                        if (isProduction) {
                            var pollingDelay = 3000;
                            console.log('✅ INICIANDO POLLING em ' + (pollingDelay/1000) + ' segundos (universal)', {
                                isProduction: isProduction,
                                hostname: location.hostname,
                                isMobile: isMobile
                            });
                            setTimeout(startPolling, pollingDelay);
                        } else {
                            console.log('❌ POLLING NÃO INICIADO - não está em produção:', {
                                isProduction: isProduction,
                                hostname: location.hostname,
                                isMobile: isMobile
                            });
                        }
                        
                        console.log('Aplicação totalmente inicializada!');
                        showMobileDebug('App totalmente inicializada!', 'success');
                        
                        // Marcar que a inicialização foi concluída
                        window.appFullyInitialized = true;
                    }, finalDelay);
                    
                }).catch(function(error) {
                    console.error('Erro no carregamento global:', error);
                    showMobileDebug('Erro no carregamento: ' + error.message, 'error');
                    hideLoader();
                    
                    // Fallback para modo básico
                    setTimeout(function() {
                        try {
                            initUltraBasicMode();
                        } catch (ultraError) {
                            console.error('Falha total na recuperação:', ultraError);
                            updateProgress(100, 'Erro crítico - recarregue a página');
                            setTimeout(function() { hideLoader(); }, 3000);
                        }
                    }, 1000);
                });
                
            } catch (loadError) {
                console.error('Erro crítico na inicialização:', loadError);
                showMobileDebug('ERRO CRÍTICO: ' + loadError.message, 'error');
                
                // Modo de emergência
                try {
                    initUltraBasicMode();
                } catch (emergencyError) {
                    console.error('Falha no modo de emergência:', emergencyError);
                    updateProgress(100, 'Erro crítico - recarregue a página');
                    setTimeout(hideLoader, 3000);
                }
            }
        }, initDelay);
        
    } catch (mainError) {
        console.error('ERRO CRITICO NA INICIALIZACAO PRINCIPAL:', mainError);
        showMobileDebug('ERRO PRINCIPAL: ' + mainError.message, 'error');
        
        // Último recurso - modo ultra-básico
        try {
            initUltraBasicMode();
        } catch (finalError) {
            console.error('FALHA TOTAL:', finalError);
            showMobileDebug('FALHA TOTAL: ' + finalError.message, 'error');
        }
    }
}

// Inicialização global da aplicação
window.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded executado, chamando initializeApp...');
    initializeApp();
});

// Fallback se DOMContentLoaded não funcionar
setTimeout(function() {
    if (!window.initializationStarted) {
        console.log('Fallback: DOMContentLoaded não executou, forçando inicialização...');
        initializeApp();
    }
}, 2000);

// Parar polling quando a página é fechada
window.addEventListener('beforeunload', stopPolling);

// Funções de debug disponíveis globalmente
window.testHubitatConnection = testHubitatConnection;
window.showErrorMessage = showErrorMessage;
