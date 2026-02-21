/**
 * HiFi Audio Player - Core Logic
 * Features: Metadata extraction, VU-meter, A-B Loop, Auto-save preferences
 */

const player = document.getElementById('player');
const playPauseBtn = document.getElementById('play-pause-btn');
const progressBar = document.getElementById('progress-bar');
const volumeBar = document.getElementById('volume-bar');
const playlistContainer = document.getElementById('playlist');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');

let audioCtx, source, analyzer, dataArray;
let isVisualizerSetup = false;
let isVisualizerEnabled = true;
let playlist = [];
let currentIndex = 0;
let isShuffle = false;
let repeatMode = 'OFF'; 
let pointA = null, pointB = null, isABLooping = false;
let peaks = [];

// --- INITIALIZATION & PREFERENCES ---
window.onload = () => {
    // Load saved volume from localStorage
    const savedVolume = localStorage.getItem('hifi-volume');
    if (savedVolume !== null) {
        player.volume = parseFloat(savedVolume);
        updateVolumeUI(player.volume);
    } else {
        player.volume = 0.05; // Default 5%
        updateVolumeUI(0.05);
    }
};

function updateVolumeUI(vol) {
    const pct = (vol * 100) + '%';
    volumeBar.style.width = pct;
    document.getElementById('volume-percent').innerText = Math.round(vol * 100) + '%';
    document.getElementById('volume-container').style.setProperty('--vol-thumb', pct);
}

// --- NAVIGATION LOGIC ---
function nextTrack() {
    if (playlist.length === 0) return;
    
    // REPEAT ONE Logic: Restart same track even on manual Next
    if (repeatMode === 'ONE') { 
        playTrack(currentIndex); 
        return; 
    }

    if (isShuffle && playlist.length > 1) {
        let newIndex;
        do { newIndex = Math.floor(Math.random() * playlist.length); } 
        while (newIndex === currentIndex);
        currentIndex = newIndex;
    } else {
        currentIndex = (currentIndex + 1) % playlist.length;
    }
    playTrack(currentIndex);
}

function prevTrack() {
    if (playlist.length === 0) return;
    
    // REPEAT ONE Logic: Restart same track even on manual Back
    if (repeatMode === 'ONE') { 
        playTrack(currentIndex); 
        return; 
    }

    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playTrack(currentIndex);
}

player.onended = () => {
    if (repeatMode === 'ONE') {
        playTrack(currentIndex);
    } else if (repeatMode === 'ALL' || currentIndex < playlist.length - 1 || isShuffle) {
        nextTrack();
    } else {
        playPauseBtn.innerText = 'PLAY';
    }
};

// --- VISUALIZER (VU-METER) ---
function setupVisualizer() {
    if (isVisualizerSetup) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        source = audioCtx.createMediaElementSource(player);
        analyzer = audioCtx.createAnalyser();
        source.connect(analyzer);
        analyzer.connect(audioCtx.destination);
        analyzer.fftSize = 64;
        dataArray = new Uint8Array(analyzer.frequencyBinCount);
        isVisualizerSetup = true;
        
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        draw();

        // If EQ panel is open, setup EQ chain now
        if (isEQOpen) setupEQ();
    } catch (e) {
        console.log("AudioContext blocked or already running");
    }
}

function draw() {
    requestAnimationFrame(draw);
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!isVisualizerEnabled || !isVisualizerSetup) return;
    
    analyzer.getByteFrequencyData(dataArray);
    const barWidth = canvas.width / dataArray.length;
    
    for (let i = 0; i < dataArray.length; i++) {
        let barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Peak logic
        if (!peaks[i] || barHeight > peaks[i]) peaks[i] = barHeight;
        else peaks[i] -= 1.5;

        const grad = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#8a6d1d');
        grad.addColorStop(1, '#d4af37');
        
        canvasCtx.fillStyle = grad;
        canvasCtx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 2, barHeight);
        
        // Peak line
        canvasCtx.fillStyle = '#ff6600';
        canvasCtx.fillRect(i * barWidth, canvas.height - peaks[i] - 2, barWidth - 2, 2);
    }
}

// --- METADATA & FILES ---
function extractMetadata(file) {
    const ext = file.name.split('.').pop().toUpperCase();
    const badge = document.getElementById('format-badge');
    badge.innerText = ext;
    badge.style.display = 'inline-block';

    jsmediatags.read(file, {
        onSuccess: function(tag) {
            const t = tag.tags;
            document.getElementById('artist-name').innerText = t.artist || "Unknown Artist";
            
            const albumDiv = document.getElementById('album-info-display');
            if (t.album) {
                document.getElementById('album-title-text').innerText = t.album;
                albumDiv.style.display = 'block';
            } else {
                albumDiv.style.display = 'none';
            }

            if (t.picture) {
                const { data, format } = t.picture;
                let base = "";
                for (let i = 0; i < data.length; i++) base += String.fromCharCode(data[i]);
                document.getElementById('album-art').src = `data:${format};base64,${window.btoa(base)}`;
                document.getElementById('art-container').style.display = 'block';
            } else {
                document.getElementById('art-container').style.display = 'none';
            }
        },
        onError: function(error) {
            console.log('Error reading tags: ', error.type, error.info);
            document.getElementById('art-container').style.display = 'none';
        }
    });
}

document.getElementById('file-input').addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => {
        playlist.push({ 
            name: f.name.replace(/\.[^/.]+$/, ""), 
            url: URL.createObjectURL(f), 
            file: f 
        });
    });
    renderPlaylist();
    if (player.paused && !player.src && playlist.length > 0) playTrack(0);
});

function renderPlaylist() {
    playlistContainer.innerHTML = '';
    playlist.forEach((t, i) => {
        const div = document.createElement('div');
        div.className = `playlist-item ${i === currentIndex ? 'active' : ''}`;
        div.innerText = `${i + 1}. ${t.name}`;
        div.onclick = () => playTrack(i);
        playlistContainer.appendChild(div);
    });
}

function playTrack(idx) {
    if (!playlist[idx]) return;
    setupVisualizer();
    currentIndex = idx;
    player.src = playlist[idx].url;
    player.play();
    playPauseBtn.innerText = 'PAUSE';
    document.getElementById('file-name').innerText = playlist[idx].name;
    extractMetadata(playlist[idx].file);
    renderPlaylist();
    resetAB();
}

// --- PLAYER CONTROLS ---
playPauseBtn.onclick = () => {
    if (!player.src && playlist.length > 0) playTrack(0);
    else player.paused ? (player.play(), playPauseBtn.innerText = 'PAUSE') : (player.pause(), playPauseBtn.innerText = 'PLAY');
};

player.ontimeupdate = () => {
    if (!player.duration) return;
    
    // A-B Loop Logic
    if (isABLooping && player.currentTime >= pointB) {
        player.currentTime = pointA;
    }

    const percent = (player.currentTime / player.duration) * 100;
    progressBar.style.width = percent + '%';
    document.getElementById('current-time').innerText = formatTime(player.currentTime);
    document.getElementById('duration').innerText = formatTime(player.duration);
};

// --- BUTTON TOGGLES ---
function toggleShuffle() {
    isShuffle = !isShuffle;
    const btn = document.getElementById('shuffle-btn');
    btn.innerText = `SHUFFLE: ${isShuffle ? 'ON' : 'OFF'}`;
    btn.classList.toggle('shuffle-active', isShuffle);
}

function toggleRepeat() {
    const btn = document.getElementById('repeat-btn');
    btn.classList.remove('rep-one', 'rep-all');
    if (repeatMode === 'OFF') { 
        repeatMode = 'ONE'; 
        btn.innerText = "REPEAT: ONE"; 
        btn.classList.add('rep-one'); 
    }
    else if (repeatMode === 'ONE') { 
        repeatMode = 'ALL'; 
        btn.innerText = "REPEAT: ALL"; 
        btn.classList.add('rep-all'); 
    }
    else { 
        repeatMode = 'OFF'; 
        btn.innerText = "REPEAT: OFF"; 
    }
}

function toggleMute() {
    player.muted = !player.muted;
    const btn = document.getElementById('mute-btn');
    btn.innerText = `MUTE: ${player.muted ? 'ON' : 'OFF'}`;
    btn.classList.toggle('mute-active', player.muted);
}

function toggleVisualizer() {
    isVisualizerEnabled = !isVisualizerEnabled;
    const btn = document.getElementById('vu-toggle-btn');
    btn.innerText = `VU: ${isVisualizerEnabled ? 'ON' : 'OFF'}`;
    btn.classList.toggle('vu-active', isVisualizerEnabled);
}

// --- A-B LOOP SYSTEM ---
function toggleABLoop() {
    const btn = document.getElementById('ab-loop-btn');
    if (pointA === null) {
        pointA = player.currentTime;
        btn.innerText = "A: " + formatTime(pointA);
        btn.classList.add('ab-active');
    } else if (pointB === null) {
        pointB = player.currentTime;
        if (pointB <= pointA) { pointB = null; return; }
        isABLooping = true;
        btn.innerText = "A-B: ON";
    } else {
        resetAB();
    }
}

function resetAB() {
    pointA = null; pointB = null; isABLooping = false;
    const btn = document.getElementById('ab-loop-btn');
    btn.innerText = "A-B: OFF"; 
    btn.classList.remove('ab-active');
}

// --- UTILITIES ---
function formatTime(s) { 
    const m = Math.floor(s / 60); 
    const sec = Math.floor(s % 60); 
    return `${m}:${sec < 10 ? '0' : ''}${sec}`; 
}

document.getElementById('progress-container').onclick = (e) => {
    if (!player.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    player.currentTime = pos * player.duration;
};

// --- VOLUME SLIDER (click + drag fluide) ---
(function() {
    const volumeContainer = document.getElementById('volume-container');
    let isDragging = false;

    function setVolumeFromEvent(e) {
        const rect = volumeContainer.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let vol = (clientX - rect.left) / rect.width;
        vol = Math.max(0, Math.min(1, vol));
        player.volume = vol;
        updateVolumeUI(vol);
        localStorage.setItem('hifi-volume', vol);
    }

    volumeContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        setVolumeFromEvent(e);
    });
    volumeContainer.addEventListener('touchstart', (e) => {
        isDragging = true;
        setVolumeFromEvent(e);
    }, { passive: true });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) setVolumeFromEvent(e);
    });
    document.addEventListener('touchmove', (e) => {
        if (isDragging) setVolumeFromEvent(e);
    }, { passive: true });

    document.addEventListener('mouseup', () => { isDragging = false; });
    document.addEventListener('touchend', () => { isDragging = false; });
})();

/**
 * FIXED CLEAR FUNCTION
 * Fully resets UI and Audio state
 */
function clearPlaylist() { 
    playlist = []; 
    player.pause(); 
    player.src = ""; 
    currentIndex = 0;
    renderPlaylist(); 

    // Reset Texts
    document.getElementById('file-name').innerText = "No track selected";
    document.getElementById('artist-name').innerText = "";
    document.getElementById('current-time').innerText = "0:00";
    document.getElementById('duration').innerText = "0:00";
    document.getElementById('progress-bar').style.width = "0%";
    playPauseBtn.innerText = "PLAY";

    // Reset Visuals
    document.getElementById('art-container').style.display = 'none';
    document.getElementById('album-art').src = "";
    document.getElementById('album-info-display').style.display = 'none';
    document.getElementById('format-badge').style.display = 'none';
    
    resetAB();
    console.log("HiFi Player: Reset complete.");
}
// ===================== EQ SYSTEM =====================
const EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
let eqFilters = [];
let bassFilter = null, trebleFilter = null;
let loudnessLow = null, loudnessMid = null, loudnessHigh = null;
let isEQOpen = false;
let isLoudness = false;
let isEQSetup = false;

function setupEQ() {
    if (isEQSetup || !audioCtx) return;

    // Create 10-band peaking EQ filters
    EQ_FREQS.forEach((freq, i) => {
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.4;
        filter.gain.value = 0;
        eqFilters.push(filter);
    });

    // Bass shelf
    bassFilter = audioCtx.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 200;
    bassFilter.gain.value = 0;

    // Treble shelf
    trebleFilter = audioCtx.createBiquadFilter();
    trebleFilter.type = 'highshelf';
    trebleFilter.frequency.value = 6000;
    trebleFilter.gain.value = 0;

    // Loudness filters (bypass by default)
    loudnessLow = audioCtx.createBiquadFilter();
    loudnessLow.type = 'lowshelf';
    loudnessLow.frequency.value = 120;
    loudnessLow.gain.value = 0;

    loudnessHigh = audioCtx.createBiquadFilter();
    loudnessHigh.type = 'highshelf';
    loudnessHigh.frequency.value = 8000;
    loudnessHigh.gain.value = 0;

    // Reconnect audio chain: source → EQ bands → bass → treble → loudness → analyzer → dest
    source.disconnect();
    let chain = source;
    eqFilters.forEach(f => { chain.connect(f); chain = f; });
    chain.connect(bassFilter);
    bassFilter.connect(trebleFilter);
    trebleFilter.connect(loudnessLow);
    loudnessLow.connect(loudnessHigh);
    loudnessHigh.connect(analyzer);

    isEQSetup = true;

    // Bind 10-band sliders
    EQ_FREQS.forEach((freq, i) => {
        const slider = document.getElementById('eq-' + i);
        slider.addEventListener('input', () => {
            const val = parseFloat(slider.value);
            eqFilters[i].gain.value = val;
            document.getElementById('gain-label-' + i).innerText = val > 0 ? '+' + val : val;
            // Désactiver le preset actif si modification manuelle
            document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('active'));
            activePreset = null;
            drawEQCurve();
        });
    });

    // Bass control
    document.getElementById('bass-ctrl').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        bassFilter.gain.value = val;
        document.getElementById('bass-val').innerText = (val > 0 ? '+' : '') + val + ' dB';
        drawEQCurve();
    });

    // Treble control
    document.getElementById('treble-ctrl').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        trebleFilter.gain.value = val;
        document.getElementById('treble-val').innerText = (val > 0 ? '+' : '') + val + ' dB';
        drawEQCurve();
    });

    drawEQCurve();
}

function toggleEQ() {
    isEQOpen = !isEQOpen;
    const panel = document.getElementById('eq-panel');
    const container = document.querySelector('.app-container');
    const btn = document.getElementById('eq-btn');

    panel.classList.toggle('open', isEQOpen);
    container.classList.toggle('eq-open', isEQOpen);
    btn.classList.toggle('vu-active', isEQOpen);

    if (isEQOpen) {
        if (!isVisualizerSetup) setupVisualizer();

        // Attendre la fin de la transition CSS avant de dimensionner le canvas
        panel.addEventListener('transitionend', function onTransitionEnd(e) {
            if (e.propertyName !== 'width') return;
            panel.removeEventListener('transitionend', onTransitionEnd);
            setupEQ();
            initEQCurveCanvas();
            drawEQCurve();
        });
    }
}

function initEQCurveCanvas() {
    const c = document.getElementById('eq-curve');
    // Forcer le recalcul en réinitialisant width/height depuis les dimensions réelles
    c.width = 0;
    c.height = 0;
    c.width = c.clientWidth || c.offsetWidth || 320;
    c.height = c.clientHeight || c.offsetHeight || 90;
}

function drawEQCurve() {
    const c = document.getElementById('eq-curve');
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach(r => {
        ctx.beginPath(); ctx.moveTo(0, H * r); ctx.lineTo(W, H * r); ctx.stroke();
    });
    // 0dB center line
    ctx.strokeStyle = '#2a2a2a';
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

    if (!isEQSetup) {
        // Draw flat line if EQ not ready
        ctx.strokeStyle = 'rgba(212,175,55,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
        return;
    }

    // Compute curve from filter gains
    const gains = eqFilters.map(f => f.gain.value);
    const bass = bassFilter ? bassFilter.gain.value : 0;
    const treble = trebleFilter ? trebleFilter.gain.value : 0;
    const loudLow = (isLoudness && loudnessLow) ? loudnessLow.gain.value : 0;
    const loudHigh = (isLoudness && loudnessHigh) ? loudnessHigh.gain.value : 0;

    // Sample frequency response at N points
    const N = W;
    const freqPoints = [];
    for (let i = 0; i < N; i++) {
        // Log scale: 20Hz to 20kHz
        const freq = 20 * Math.pow(1000, i / (N - 1));
        freqPoints.push(freq);
    }

    // Approximate gain at each frequency by summing filter contributions
    function peakingGain(freq, centerFreq, Q, gainDb) {
        const omega = 2 * Math.PI * freq;
        const omegaC = 2 * Math.PI * centerFreq;
        const ratio = freq / centerFreq;
        const logRatio = Math.log10(ratio);
        const bandwidthOctaves = 1 / Q;
        const dist = logRatio / (bandwidthOctaves / 2);
        return gainDb * Math.exp(-dist * dist * 0.7);
    }
    function shelfGain(freq, cutoff, gainDb, isHigh) {
        const ratio = isHigh ? freq / cutoff : cutoff / freq;
        return gainDb / (1 + Math.exp(-4 * (Math.log10(ratio))));
    }

    const curveGains = freqPoints.map(freq => {
        let g = 0;
        gains.forEach((gain, i) => { g += peakingGain(freq, EQ_FREQS[i], 1.4, gain); });
        g += shelfGain(freq, 200, bass, false);
        g += shelfGain(freq, 6000, treble, true);
        if (isLoudness) {
            g += shelfGain(freq, 120, loudLow, false);
            g += shelfGain(freq, 8000, loudHigh, true);
        }
        return g;
    });

    // Draw filled area
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(212,175,55,0.35)');
    grad.addColorStop(1, 'rgba(212,175,55,0.03)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    curveGains.forEach((g, i) => {
        const x = i;
        const y = H / 2 - (g / 12) * (H / 2 - 4);
        if (i === 0) ctx.lineTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(W, H / 2);
    ctx.closePath();
    ctx.fill();

    // Draw curve line
    const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
    lineGrad.addColorStop(0, '#8a6d1d');
    lineGrad.addColorStop(0.5, '#d4af37');
    lineGrad.addColorStop(1, '#f0c84a');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    curveGains.forEach((g, i) => {
        const x = i;
        const y = H / 2 - (g / 12) * (H / 2 - 4);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
}

function toggleLoudness() {
    isLoudness = !isLoudness;
    const btn = document.getElementById('loudness-btn');
    btn.innerText = 'LOUDNESS: ' + (isLoudness ? 'ON' : 'OFF');
    btn.classList.toggle('loudness-active', isLoudness);

    if (loudnessLow && loudnessHigh) {
        loudnessLow.gain.value = isLoudness ? 6 : 0;
        loudnessHigh.gain.value = isLoudness ? 4 : 0;
    }
    drawEQCurve();
}

function resetEQ() {
    EQ_FREQS.forEach((freq, i) => {
        const slider = document.getElementById('eq-' + i);
        slider.value = 0;
        document.getElementById('gain-label-' + i).innerText = '0';
        if (eqFilters[i]) eqFilters[i].gain.value = 0;
    });
    document.getElementById('bass-ctrl').value = 0;
    document.getElementById('bass-val').innerText = '0 dB';
    document.getElementById('treble-ctrl').value = 0;
    document.getElementById('treble-val').innerText = '0 dB';
    if (bassFilter) bassFilter.gain.value = 0;
    if (trebleFilter) trebleFilter.gain.value = 0;

    // Reset loudness
    isLoudness = false;
    const lBtn = document.getElementById('loudness-btn');
    lBtn.innerText = 'LOUDNESS: OFF';
    lBtn.classList.remove('loudness-active');
    if (loudnessLow) loudnessLow.gain.value = 0;
    if (loudnessHigh) loudnessHigh.gain.value = 0;

    // Reset preset highlight
    document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('active'));
    activePreset = null;

    drawEQCurve();
}

// ===================== EQ PRESETS =====================
const EQ_PRESETS = {
    'POP':     [ -1,  1,  3,  4,  3,  1,  0,  1,  2,  2],
    'ROCK':    [  4,  3,  2,  0, -1, -1,  2,  4,  5,  5],
    'JAZZ':    [  3,  2,  1,  2,  0,  0, -1, -1,  1,  2],
    'CLASSIC': [  4,  3,  2,  1,  0,  0,  0,  1,  2,  3],
    'LIVE':    [ -2,  0,  2,  3,  3,  2,  2,  2,  2,  1],
};

let activePreset = null;

function applyPreset(name) {
    const gains = EQ_PRESETS[name];
    if (!gains) return;

    // Update sliders + filters
    gains.forEach((gain, i) => {
        const slider = document.getElementById('eq-' + i);
        slider.value = gain;
        document.getElementById('gain-label-' + i).innerText = gain > 0 ? '+' + gain : gain;
        if (eqFilters[i]) eqFilters[i].gain.value = gain;
    });

    // Highlight active preset button
    document.querySelectorAll('.eq-preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === name);
    });
    activePreset = name;
    drawEQCurve();
}
