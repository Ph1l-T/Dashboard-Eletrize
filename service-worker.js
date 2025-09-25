// 🚀 ELETRIZE PWA - SERVICE WORKER AVANÇADO v2.0
const CACHE_VERSION = '2025.09.25';
const CACHE_NAME = `eletrize-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `eletrize-runtime-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

console.log('� SERVICE WORKER: Inicializando versão avançada', CACHE_VERSION);

// Assets essenciais para funcionamento offline
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/scenes.js',
  '/fonts-raleway.css',
  '/images/icons/Eletrize.svg',
  '/images/icons/icon-home.svg',
  '/images/icons/icon-scenes.svg'
];

// Assets que podem ser cacheados sob demanda
const CACHEABLE_ORIGINS = [
  self.location.origin
];

// Detectar capabilities do dispositivo
const capabilities = {
  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  hasNotifications: 'Notification' in self,
  hasBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
  hasShare: 'share' in navigator
};
console.log('📱 Service Worker - Capabilities:', capabilities);

// 📦 INSTALAÇÃO
self.addEventListener('install', (event) => {
  console.log('🔧 SW: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 SW: Cacheando assets essenciais');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('✅ SW: Assets cacheados, ativando imediatamente');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ SW: Erro na instalação:', error);
      })
  );
});

// 🔄 ATIVAÇÃO
self.addEventListener('activate', (event) => {
  console.log('🔄 SW: Ativando...');
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then((keys) => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME && key !== RUNTIME_CACHE)
            .map(key => {
              console.log('🗑️ SW: Removendo cache antigo:', key);
              return caches.delete(key);
            })
        );
      }),
      // Tomar controle imediato
      self.clients.claim()
    ]).then(() => {
      console.log('✅ SW: Ativado e no controle');
    })
  );
});

// 🌐 ESTRATÉGIAS DE CACHE INTELIGENTES
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Só interceptar requests GET do mesmo origin
  if (request.method !== 'GET' || !CACHEABLE_ORIGINS.includes(url.origin)) {
    return;
  }

  // Nunca cachear APIs externas (Hubitat, etc.)
  if (isExternalAPI(url)) {
    return;
  }

  // Estratégias baseadas no tipo de recurso
  if (isNavigationRequest(request)) {
    event.respondWith(handleNavigation(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  }
});

// 🔍 UTILITÁRIOS DE IDENTIFICAÇÃO
function isExternalAPI(url) {
  return /cloud\.hubitat\.com$/i.test(url.hostname) || 
         /\/apps\/api\//i.test(url.pathname) ||
         url.pathname.includes('hubitat-proxy') ||
         url.pathname.includes('polling');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

function isStaticAsset(url) {
  return /\.(css|js|png|jpg|jpeg|svg|woff|woff2|ttf|ico)$/.test(url.pathname);
}

function isAPIRequest(url) {
  return url.pathname.includes('/api/') || url.pathname.includes('/functions/');
}

// 📄 NAVEGAÇÃO - Network First com fallback offline
async function handleNavigation(request) {
  try {
    console.log('🧭 SW: Navegação - Network First:', request.url);
    
    const response = await fetch(request);
    
    // Cachear resposta bem-sucedida
    if (response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('📱 SW: Offline - Servindo do cache:', request.url);
    
    // Tentar cache primeiro
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Fallback para página offline se disponível
    const offlineResponse = await caches.match(OFFLINE_PAGE);
    if (offlineResponse) return offlineResponse;
    
    // Última tentativa - página principal do cache
    return await caches.match('/');
  }
}

// 🖼️ ASSETS ESTÁTICOS - Cache First
async function handleStaticAsset(request) {
  try {
    console.log('🎨 SW: Asset - Cache First:', request.url);
    
    const cached = await caches.match(request);
    if (cached) return cached;
    
    const response = await fetch(request);
    
    // Cachear apenas respostas válidas
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('❌ SW: Falha ao carregar asset:', request.url);
    throw error;
  }
}

// 🔄 API REQUESTS - Network First com timeout
async function handleAPIRequest(request) {
  try {
    console.log('🔄 SW: API - Network com timeout:', request.url);
    
    // Timeout de 5 segundos para APIs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(request, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
    
  } catch (error) {
    console.log('⏰ SW: API timeout/erro, tentando cache:', request.url);
    
    // Tentar cache como fallback
    const cached = await caches.match(request);
    if (cached) return cached;
    
    throw error;
  }
}

// 📢 NOTIFICAÇÕES PUSH
self.addEventListener('push', (event) => {
  console.log('📢 SW: Push recebido:', event.data?.text());
  
  const options = {
    body: event.data?.text() || 'Nova atualização disponível',
    icon: '/images/pwa/app-icon-192.png',
    badge: '/images/pwa/app-icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 'notification-' + Date.now()
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver Detalhes',
        icon: '/images/icons/icon-home.svg'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/images/icons/icon-stop.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Eletrize', options)
  );
});

// 👆 CLIQUE EM NOTIFICAÇÃO
self.addEventListener('notificationclick', (event) => {
  console.log('👆 SW: Clique na notificação:', event.action);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 🔄 BACKGROUND SYNC
self.addEventListener('sync', (event) => {
  console.log('🔄 SW: Background sync:', event.tag);
  
  if (event.tag === 'device-state-sync') {
    event.waitUntil(syncDeviceStates());
  }
});

async function syncDeviceStates() {
  try {
    // Implementar sincronização de estados pendentes
    console.log('🔄 SW: Sincronizando estados dos dispositivos...');
    
    // Aqui seria implementada a lógica de sync
    // Por exemplo, enviar comandos que falharam quando offline
    
  } catch (error) {
    console.error('❌ SW: Erro na sincronização:', error);
  }
}

// 📊 RELATÓRIO DE CACHE
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'CACHE_REPORT') {
    const cacheNames = await caches.keys();
    const report = {
      caches: cacheNames.length,
      version: CACHE_VERSION,
      capabilities
    };
    
    event.ports[0].postMessage(report);
  }
});
