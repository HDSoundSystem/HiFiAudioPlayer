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