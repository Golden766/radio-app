// Liste des serveurs API Radio Browser (avec fallback si un est hors ligne)
const API_SERVERS = [
  'https://de1.api.radio-browser.info/json',
  'https://nl1.api.radio-browser.info/json',
  'https://at1.api.radio-browser.info/json',
  'https://fr1.api.radio-browser.info/json',
  'https://all.api.radio-browser.info/json'
];
const FAVORITES_KEY = 'radioFavorites';

let audioPlayer = null;
let hlsPlayer = null;
let currentStation = null;
const stationCandidates = new Map();
let allStations = [];
let activeAPIServer = API_SERVERS[0];

let currentSuggestions = [];
let selectedSuggestionIndex = -1;
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  audioPlayer = document.getElementById('audioPlayer');
  if (window.location.protocol === 'file:') {
    document.getElementById('fileWarning').classList.remove('hidden');
  }
  initEventListeners();
  registerServiceWorker();
  loadTopStations();
  renderFavorites();
});

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./service-worker.js').catch(err => {
    console.warn('Service worker indisponible :', err.message);
  });
}

function initEventListeners() {
  document.getElementById('searchBtn').addEventListener('click', searchStations);
  document.getElementById('clearSearchBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    hideSuggestions();
    loadTopStations();
  });
  document.getElementById('byCountryBtn').addEventListener('click', loadByCountry);
  document.getElementById('loadTopBtn').addEventListener('click', loadTopStations);
  document.getElementById('dismissWarning').addEventListener('click', () => {
    document.getElementById('fileWarning').classList.add('hidden');
  });

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    clearTimeout(debounceTimer);
    hideSuggestions();
    if (query.length >= 2) {
      debounceTimer = setTimeout(() => loadSuggestions(query), 300);
    }
  });
  searchInput.addEventListener('keydown', (e) => {
    const container = document.getElementById('searchSuggestions');
    if (container.style.display !== 'block') return;
    const items = container.querySelectorAll('.suggestion-item');
    if (e.key === 'ArrowDown' && items.length > 0) {
      e.preventDefault();
      selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, items.length - 1);
      updateSuggestionSelection(items);
    } else if (e.key === 'ArrowUp' && items.length > 0) {
      e.preventDefault();
      selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
      updateSuggestionSelection(items);
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0 && items.length > 0) {
      e.preventDefault();
      const item = items[selectedSuggestionIndex];
      searchInput.value = item.textContent;
      hideSuggestions();
      searchStations();
    }
  });
}

// Effectue un appel fetch JSON en testant tous les serveurs API
async function fetchJSON(path) {
  let lastError;
  for (const base of API_SERVERS) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} de ${base}`);
      const data = await res.json();
      activeAPIServer = base;
      return Array.isArray(data) ? data : (data.stations || []);
    } catch (err) {
      console.warn(`Serveur ${base} échoué pour ${path} :`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error('Aucun serveur API disponible');
}

// Wrapper qui montre une alerte si tout échoue
async function fetchStations(path) {
  try {
    return await fetchJSON(path);
  } catch (err) {
    console.error(err);
    showStatus('Impossible de charger les stations. Vérifiez votre connexion réseau.', true);
    return [];
  }
}

async function loadTopStations() {
  document.getElementById('stationsList').innerHTML = '<p class="empty-msg">Chargement des stations populaires...</p>';
  document.getElementById('clearSearchBtn').style.display = 'none';
  document.getElementById('searchInput').value = '';
  hideSuggestions();
  allStations = await fetchStations('/stations/topclick/50');
  renderStations(allStations);
}

async function searchStations() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;
  document.getElementById('stationsList').innerHTML = '<p class="empty-msg">Recherche en cours...</p>';
  document.getElementById('clearSearchBtn').style.display = 'inline-block';
  hideSuggestions();
  allStations = await fetchStations(`/stations/search?name=${encodeURIComponent(query)}&codec=MP3&lastcheckok=1&limit=50&order=name&reverse=false`);
  renderStations(allStations);
}

async function loadByCountry() {
  const country = document.getElementById('countryInput').value.trim();
  if (!country) return;
  document.getElementById('stationsList').innerHTML = '<p class="empty-msg">Chargement des stations du pays...</p>';
  document.getElementById('clearSearchBtn').style.display = 'inline-block';
  let stations = await fetchJSON(`/stations/bycountry/${encodeURIComponent(country)}?limit=50&order=name&reverse=false`)
    .catch(() => []);
  if (!stations.length) {
    stations = await fetchJSON(`/stations/bycountrycode/${encodeURIComponent(country.toUpperCase())}?limit=50&order=name&reverse=false`)
      .catch(() => []);
  }
  if (!stations.length) {
    alert('Aucune station trouvée pour ce pays.');
  }
  allStations = stations;
  renderStations(stations);
}

// Suggestions de saisie semi-automatique
async function loadSuggestions(query) {
  try {
    currentSuggestions = await fetchJSON(`/stations/search?name=${encodeURIComponent(query)}&limit=8&order=name&reverse=false`);
    selectedSuggestionIndex = -1;
    renderSuggestions(currentSuggestions);
  } catch (err) {
    console.warn('Suggestions non disponibles :', err.message);
    hideSuggestions();
  }
}

function renderSuggestions(suggestions) {
  const container = document.getElementById('searchSuggestions');
  hideSuggestions();
  if (!suggestions.length) return;
  container.innerHTML = '';
  container.style.display = 'block';
  suggestions.slice(0, 8).forEach((station, index) => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = station.name || 'Station inconnue';
    item.dataset.name = station.name || '';
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      document.getElementById('searchInput').value = station.name || '';
      hideSuggestions();
      searchStations();
    });
    container.appendChild(item);
  });
}

function hideSuggestions() {
  const container = document.getElementById('searchSuggestions');
  container.style.display = 'none';
  container.innerHTML = '';
  selectedSuggestionIndex = -1;
}

function updateSuggestionSelection(items) {
  items.forEach((item, idx) => {
    item.classList.toggle('suggestion-active', idx === selectedSuggestionIndex);
  });
}

// Échappe le HTML pour éviter les problèmes de sécurité injection
function escapeHTML(str = '') {
  return String(str).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}
function showStatus(message, isError = false) {
  const status = document.getElementById('appStatus');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('error', isError);
  status.classList.toggle('hidden', !message);
}

function getPlayableUrls(station) {
  const name = String(station.name || '').toLowerCase();
  const apiUrl = station.url_resolved || station.url || '';
  const urls = [];

  if (name.includes('rfi afrique')) {
    urls.push('https://rfiafrique64k.ice.infomaniak.ch/rfiafrique-64.mp3');
  }
  if (name.includes('rfi haoussa')) {
    urls.push('https://rfihaoussa96k.ice.infomaniak.ch/rfihaoussa-96k.mp3');
  }
  if (name === 'rtl' && /\.m3u8(?:$|[?#])/i.test(apiUrl)) {
    urls.push('https://icecast.rtl.fr/rtl-1-44-128');
  }

  urls.push(station.url_resolved, station.url);
  return [...new Set(urls.filter(Boolean))];
}

function renderStations(stations) {
  const container = document.getElementById('stationsList');
  if (!stations.length) {
    container.innerHTML = '<p class="empty-msg">Aucune station trouvée.</p>';
    return;
  }
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'stations-list';
  stations.forEach(station => {
    const name = escapeHTML(station.name || 'Nom inconnu');
    const urls = getPlayableUrls(station);
    const url = escapeHTML(urls[0] || '');
    if (url) stationCandidates.set(urls[0], urls);
    const bitRate = escapeHTML(station.bitrate || '?');
    const codec = escapeHTML(station.codec || '');
    const freq = escapeHTML(station.frequency || 'N/A');
    const country = escapeHTML(station.country || 'N/A');
    const countryCode = escapeHTML(station.countrycode || '');
    const card = document.createElement('div');
    card.className = 'station-card';
    card.innerHTML = `
      <h3>${name}</h3>
      <p><strong>Bitrate:</strong> ${bitRate} ${codec}</p>
      <p><strong>Freq:</strong> ${freq}</p>
      <p><strong>Pays:</strong> ${country} (${countryCode})</p>
      <div style="display:flex; gap:5px; margin-top:10px;">
        <button class="playBtn" data-url="${url}">▶ Écouter</button>
        <button class="favBtn" data-name="${name}" data-url="${url}">☆ Ajouter aux favoris</button>
      </div>
    `;
    grid.appendChild(card);
  });
  container.appendChild(grid);
  attachStationButtons();
}

function attachStationButtons() {
  document.querySelectorAll('.playBtn').forEach(btn => {
    btn.addEventListener('click', () => playStation(btn.dataset.url));
  });
  document.querySelectorAll('.favBtn').forEach(btn => {
    btn.addEventListener('click', () => addFavorite(btn.dataset.name, btn.dataset.url));
  });
}

function playStation(url) {
  if (!url) {
    showStatus('Cette station ne fournit pas de flux audio utilisable.', true);
    return;
  }
  currentStation = url;
  const urls = stationCandidates.get(url) || [url];
  tryPlayback(urls, 0);
}

function tryPlayback(urls, index) {
  if (index >= urls.length) {
    showPlaybackError();
    return;
  }
  const url = urls[index];

  if (hlsPlayer) {
    hlsPlayer.destroy();
    hlsPlayer = null;
  }
  audioPlayer.pause();
  audioPlayer.removeAttribute('src');
  audioPlayer.load();

  const isHls = /\.m3u8(?:$|[?#])/i.test(url);
  if (isHls && window.Hls && Hls.isSupported()) {
    hlsPlayer = new Hls({ enableWorker: true });
    hlsPlayer.loadSource(url);
    hlsPlayer.attachMedia(audioPlayer);
    hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => startAudioPlayback(() => tryPlayback(urls, index + 1)));
    hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.error('Erreur HLS:', data);
        tryPlayback(urls, index + 1);
      }
    });
  } else {
    audioPlayer.src = url;
    startAudioPlayback(() => tryPlayback(urls, index + 1));
  }
}

function startAudioPlayback(onFailure) {
  let settled = false;
  const cleanup = () => {
    clearTimeout(timeoutId);
    audioPlayer.removeEventListener('playing', onPlaying);
    audioPlayer.removeEventListener('canplay', onPlaying);
    audioPlayer.removeEventListener('error', onError);
  };
  const onPlaying = () => {
    if (settled) return;
    settled = true;
    cleanup();
    document.getElementById('nowPlaying').textContent = 'En cours de lecture...';
    showStatus('');
  };
  const onError = () => {
    if (settled) return;
    settled = true;
    cleanup();
    onFailure();
  };
  const timeoutId = setTimeout(onError, 12000);

  audioPlayer.addEventListener('playing', onPlaying);
  audioPlayer.addEventListener('canplay', onPlaying);
  audioPlayer.addEventListener('error', onError);
  audioPlayer.play().catch(err => {
    console.error('Erreur de lecture audio:', err);
    onError();
  });
}

function showPlaybackError() {
  document.getElementById('nowPlaying').textContent = 'Lecture impossible.';
  showStatus('Le flux audio ne peut pas être lu par ce navigateur ou cette station.', true);
}

function getFavorites() {
  try {
    const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(favorites) ? favorites : [];
  } catch (err) {
    console.warn('Favoris invalides :', err);
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function addFavorite(name, url) {
  const favorites = getFavorites();
  if (!url) {
    alert('Impossible d\'ajouter cette station (URL manquante).');
    return;
  }
  if (favorites.some(f => f.name === name && f.url === url)) {
    alert('Cette station est déjà dans vos favoris.');
    return;
  }
  favorites.push({ name, url });
  saveFavorites(favorites);
  renderFavorites();
}

function removeFavorite(name, url) {
  const favorites = getFavorites().filter(f => !(f.name === name && f.url === url));
  saveFavorites(favorites);
  renderFavorites();
}

function renderFavorites() {
  const container = document.getElementById('favoritesList');
  const favorites = getFavorites();
  if (!favorites.length) {
    container.innerHTML = '<p class="empty-msg">Aucun favori pour le moment.</p>';
    return;
  }
  container.innerHTML = '';
  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  favorites.forEach(fav => {
    const name = escapeHTML(fav.name || 'Station');
    const url = escapeHTML(fav.url || '');
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    li.style.padding = '10px 0';
    li.style.borderBottom = '1px solid #eee';
    li.innerHTML = `
      <span title="${url}">${name}</span>
      <div style="display:flex; gap:5px;">
        <button class="playFavBtn" data-url="${url}">▶</button>
        <button class="removeFavBtn" data-name="${name}" data-url="${url}" style="background:#e74c3c; color:white;">✕</button>
      </div>
    `;
    list.appendChild(li);
  });
  container.appendChild(list);
  document.querySelectorAll('.playFavBtn').forEach(btn => {
    btn.addEventListener('click', () => playStation(btn.dataset.url));
  });
  document.querySelectorAll('.removeFavBtn').forEach(btn => {
    btn.addEventListener('click', () => removeFavorite(btn.dataset.name, btn.dataset.url));
  });
}