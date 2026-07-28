const svg = document.getElementById('scoreSvg');
const keySelect = document.getElementById('keySelect');
const scaleNotesEl = document.getElementById('scaleNotes');
const selectedNoteEl = document.getElementById('selectedNote');
const titleInput = document.getElementById('titleInput');
const scoreTitle = document.getElementById('scoreTitle');
const composerInput = document.getElementById('composerInput');
const tempoInput = document.getElementById('tempoInput');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const NS = 'http://www.w3.org/2000/svg';
const sharp = String.fromCharCode(9839);
const flat = String.fromCharCode(9837);
const quarter = String.fromCharCode(9833);
const treble = String.fromCodePoint(0x1d11e);
const bass = String.fromCodePoint(0x1d122);
const notes = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
const major = [0, 2, 4, 5, 7, 9, 11];
const minor = [0, 2, 3, 5, 7, 8, 10];
const pitchIndex = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const natural = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const keyMarks = { C: '', G: sharp, D: sharp + sharp, A: sharp + sharp + sharp, E: sharp.repeat(4), B: sharp.repeat(5), 'F#': sharp.repeat(6), F: flat, Bb: flat + flat, Eb: flat.repeat(3), Ab: flat.repeat(4), Db: flat.repeat(5) };
const staff = { x: 112, width: 910, trebleTop: 105, bassTop: 245, secondTrebleTop: 385, secondBassTop: 525, gap: 13 };
const sample = [
  ['t1', 'treble', 'C5', 0, 1], ['t2', 'treble', 'C5', 1, 1], ['t3', 'treble', 'C5', 2, 1], ['t4', 'treble', 'C5', 3, 1], ['t5', 'treble', 'Eb5', 4, 2], ['t6', 'treble', 'G5', 6, 1], ['t7', 'treble', 'Bb5', 7, 1], ['t8', 'treble', 'D5', 8, 2], ['t9', 'treble', 'G5', 11, 1, 10], ['t10', 'treble', 'Bb5', 12, 1, 11],
  ['t11', 'treble', 'Eb5', 16, 2, 12], ['t12', 'treble', 'F5', 18, 1, 14], ['t13', 'treble', 'G5', 19, 1, 15], ['t14', 'treble', 'D5', 20, 1, 16], ['t15', 'treble', 'Eb5', 22, 1, 17], ['t16', 'treble', 'G5', 23, 1, 18], ['t17', 'treble', 'Bb5', 24, 1, 19],
  ['b1', 'bass', 'Ab2', 4, 0.5], ['b2', 'bass', 'Eb3', 4.5, 0.5], ['b3', 'bass', 'Ab3', 5, 0.5], ['b4', 'bass', 'C4', 5.5, 0.5], ['b5', 'bass', 'Bb2', 6, 0.5], ['b6', 'bass', 'F3', 6.5, 0.5], ['b7', 'bass', 'Bb3', 7, 0.5], ['b8', 'bass', 'D4', 7.5, 0.5],
  ['b9', 'bass', 'G2', 8, 0.5], ['b10', 'bass', 'D3', 8.5, 0.5], ['b11', 'bass', 'G3', 9, 0.5], ['b12', 'bass', 'B3', 9.5, 0.5], ['b13', 'bass', 'Eb3', 16, 0.5, 12], ['b14', 'bass', 'Bb3', 16.5, 0.5, 12.5], ['b15', 'bass', 'Eb4', 17, 0.5, 13], ['b16', 'bass', 'G4', 17.5, 0.5, 13.5],
  ['b17', 'bass', 'F3', 18, 0.5, 14], ['b18', 'bass', 'C4', 18.5, 0.5, 14.5], ['b19', 'bass', 'F4', 19, 0.5, 15], ['b20', 'bass', 'A4', 19.5, 0.5, 15.5], ['b21', 'bass', 'C3', 22, 0.5, 17], ['b22', 'bass', 'G3', 22.5, 0.5, 17.5], ['b23', 'bass', 'C4', 23, 0.5, 18], ['b24', 'bass', 'E4', 23.5, 0.5, 18.5]
].map(([id, line, pitch, beat, duration, playBeat]) => ({ id, staff: line, pitch, beat, duration, ...(playBeat == null ? {} : { playBeat }) }));
let state = { key: 'Ab', mode: 'major', selectedId: 't1', notes: clone(sample), playing: false, pausedAt: 0, startedAt: 0, timer: null, highlightTimers: [], playingIds: [], audio: null };
let drag = null;
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function make(name, attrs = {}) { const node = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v)); return node; }
function label(x, y, value, attrs = {}) { const node = make('text', { x, y, ...attrs }); node.textContent = value; return node; }
function parsePitch(pitch) { const octave = Number(pitch[pitch.length - 1]); const name = pitch.slice(0, -1); return { name, octave, midi: (octave + 1) * 12 + pitchIndex[name] }; }
function midiToPitch(midi) { return notes[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1); }
function diatonic(pitch) { const parsed = parsePitch(pitch); return parsed.octave * 7 + natural[parsed.name[0]]; }
function staffTop(line, beat = 0) { if (line === 'treble') return beat >= 16 ? staff.secondTrebleTop : staff.trebleTop; return beat >= 16 ? staff.secondBassTop : staff.bassTop; }
function yFor(pitch, line, beat = 0) { const reference = line === 'treble' ? diatonic('E4') : diatonic('G2'); return staffTop(line, beat) + staff.gap * 4 - (diatonic(pitch) - reference) * (staff.gap / 2); }
function xFor(beat) { return staff.x + 205 + (beat % 16) * 48; }
function frequency(pitch) { return 440 * Math.pow(2, (parsePitch(pitch).midi - 69) / 12); }
function playbackBeat(note) { return note.playBeat ?? note.beat; }
function scale() { const root = pitchIndex[state.key]; const pattern = state.mode === 'major' ? major : minor; return pattern.map(step => notes[(root + step) % 12]); }
function pretty(pitch) { return pitch.replaceAll('#', sharp).replaceAll('b', flat); }
function selected() { return state.notes.find(note => note.id === state.selectedId); }
function closestScalePitch(pitch) { const midi = parsePitch(pitch).midi; const allowed = new Set(scale()); let best = midi; let bestDistance = Infinity; for (let candidate = 36; candidate <= 84; candidate++) { if (!allowed.has(notes[candidate % 12])) continue; const distance = Math.abs(candidate - midi); if (distance < bestDistance) { best = candidate; bestDistance = distance; } } return midiToPitch(best); }
function moveSelected(direction) { const note = selected(); if (!note) return; const allowed = scale(); const current = parsePitch(closestScalePitch(note.pitch)).midi; const choices = []; for (let midi = 36; midi <= 84; midi++) if (allowed.includes(notes[midi % 12])) choices.push(midi); const index = Math.max(0, choices.indexOf(current)); note.pitch = midiToPitch(choices[Math.max(0, Math.min(choices.length - 1, index + direction))]); note.staff = parsePitch(note.pitch).midi >= 60 ? 'treble' : 'bass'; render(); }
function drawStaff(top) { for (let i = 0; i < 5; i++) svg.appendChild(make('line', { class: 'staff-line', x1: staff.x, y1: top + i * staff.gap, x2: staff.x + staff.width, y2: top + i * staff.gap })); }
function drawGrandStaff(trebleTop, bassTop) { drawStaff(trebleTop); drawStaff(bassTop); svg.appendChild(make('path', { class: 'brace', d: `M ${staff.x - 24} ${trebleTop - 3} C ${staff.x - 55} ${trebleTop + 28}, ${staff.x - 55} ${bassTop + 24}, ${staff.x - 24} ${bassTop + 55}` })); svg.appendChild(make('line', { class: 'bar-line', x1: staff.x, y1: trebleTop, x2: staff.x, y2: bassTop + staff.gap * 4 })); svg.appendChild(label(staff.x + 20, trebleTop + 51, treble, { class: 'clef', 'font-size': 70 })); svg.appendChild(label(staff.x + 22, bassTop + 43, bass, { class: 'clef', 'font-size': 58 })); svg.appendChild(label(staff.x + 82, trebleTop + 28, keyMarks[state.key], { class: 'clef', 'font-size': 28 })); svg.appendChild(label(staff.x + 85, bassTop + 28, keyMarks[state.key], { class: 'clef', 'font-size': 28 })); ['34', '55'].forEach(offset => { svg.appendChild(label(staff.x + 150, trebleTop + Number(offset), '4', { class: 'clef', 'font-size': 27 })); svg.appendChild(label(staff.x + 150, bassTop + Number(offset), '4', { class: 'clef', 'font-size': 27 })); }); [4, 8, 12, 16].forEach(beat => { const x = staff.x + 205 + beat * 48; svg.appendChild(make('line', { class: 'bar-line', x1: x, y1: trebleTop, x2: x, y2: trebleTop + staff.gap * 4 })); svg.appendChild(make('line', { class: 'bar-line', x1: x, y1: bassTop, x2: x, y2: bassTop + staff.gap * 4 })); }); }
function ledgerLines(cx, cy, line, beat) { const top = staffTop(line, beat); const bottom = top + staff.gap * 4; for (let y = bottom + staff.gap; y <= cy + 1; y += staff.gap) svg.appendChild(make('line', { class: 'ledger', x1: cx - 16, y1: y, x2: cx + 16, y2: y, 'stroke-width': 2 })); for (let y = top - staff.gap; y >= cy - 1; y -= staff.gap) svg.appendChild(make('line', { class: 'ledger', x1: cx - 16, y1: y, x2: cx + 16, y2: y, 'stroke-width': 2 })); }
function drawNote(note) { const x = xFor(note.beat); const y = yFor(note.pitch, note.staff, note.beat); ledgerLines(x, y, note.staff, note.beat); const group = make('g', { 'data-id': note.id, tabindex: 0, role: 'button', 'aria-label': note.pitch + ' note' }); const active = note.id === state.selectedId ? ' selected' : ''; const sounding = state.playingIds.includes(note.id) ? ' playing' : ''; const stemUp = note.staff === 'bass' || y > staffTop(note.staff, note.beat) + 24; const stemX = stemUp ? x + 9 : x - 9; const stemY = stemUp ? y - 54 : y + 54; group.appendChild(make('ellipse', { class: 'note-head' + active + sounding, cx: x, cy: y, rx: 11, ry: 8, transform: `rotate(-18 ${x} ${y})` })); group.appendChild(make('line', { class: 'stem', x1: stemX, y1: y, x2: stemX, y2: stemY, 'stroke-width': 3 })); if (note.duration <= 0.5) group.appendChild(make('path', { class: 'beam', d: stemUp ? `M ${stemX} ${stemY} q 17 8 24 23` : `M ${stemX} ${stemY} q -17 -8 -24 -23`, fill: 'none', 'stroke-width': 5 })); group.appendChild(label(x - 10, y - 27, pretty(parsePitch(note.pitch).name), { class: 'note-label', 'font-size': 24 })); group.addEventListener('pointerdown', event => beginDrag(event, note.id)); group.addEventListener('click', () => { state.selectedId = note.id; render(); }); svg.appendChild(group); }
function renderScale() { scaleNotesEl.replaceChildren(); scale().forEach(note => { const chip = document.createElement('span'); chip.className = 'scale-note'; chip.textContent = pretty(note); scaleNotesEl.appendChild(chip); }); }
function render() { svg.replaceChildren(); svg.appendChild(label(78, 86, `${pretty(state.key)} ${state.mode}`, { class: 'note-label', 'font-size': 30 })); svg.appendChild(label(135, 82, quarter + ' = ' + tempoInput.value, { class: 'tempo', 'font-size': 22 })); svg.appendChild(label(890, 70, 'Arr: You', { class: 'clef', 'font-size': 23 })); drawGrandStaff(staff.trebleTop, staff.bassTop); svg.appendChild(label(92, staff.secondTrebleTop - 15, '4', { class: 'clef measure-number', 'font-size': 20 })); drawGrandStaff(staff.secondTrebleTop, staff.secondBassTop); state.notes.forEach(drawNote); const note = selected(); selectedNoteEl.textContent = note ? pretty(note.pitch) : 'None'; renderScale(); }
function beginDrag(event, id) { state.selectedId = id; drag = { startY: event.clientY, startMidi: parsePitch(selected().pitch).midi }; svg.setPointerCapture(event.pointerId); render(); }
svg.addEventListener('pointermove', event => { if (!drag) return; const note = selected(); const delta = Math.round((drag.startY - event.clientY) / 13); note.pitch = midiToPitch(Math.max(36, Math.min(84, drag.startMidi + delta))); note.staff = parsePitch(note.pitch).midi >= 60 ? 'treble' : 'bass'; render(); });
svg.addEventListener('pointerup', () => { drag = null; });
function addNote(line) { const staffNotes = state.notes.filter(note => note.staff === line); const latest = Math.max(-1, ...staffNotes.map(note => note.beat)); const latestPlayBeat = Math.max(-1, ...staffNotes.map(playbackBeat)); const beat = Math.max(0, Math.min(31, Math.floor(latest + 1))); const playBeat = Math.max(0, Math.floor(latestPlayBeat + 1)); const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()); state.notes.push({ id, staff: line, pitch: scale()[0] + (line === 'treble' ? '5' : '3'), beat, playBeat, duration: 1 }); state.selectedId = id; render(); }
function audio() { state.audio ||= new AudioContext(); return state.audio; }
function noteEnd(note) { return playbackBeat(note) + note.duration; }
function tiesToNext(note) { return note.tie === true || note.tieToNext === true || note.tied === true; }
function tieStartsBefore(note) { return state.notes.some(prev => prev.id !== note.id && tiesToNext(prev) && prev.staff === note.staff && prev.pitch === note.pitch && Math.abs(noteEnd(prev) - playbackBeat(note)) < 0.001); }
function tieChainEnd(note) { let current = note; let end = noteEnd(current); while (tiesToNext(current)) { const next = state.notes.find(candidate => candidate.id !== current.id && candidate.staff === current.staff && candidate.pitch === current.pitch && Math.abs(playbackBeat(candidate) - end) < 0.001); if (!next) break; current = next; end = noteEnd(current); } return end; }
function setNoteHighlight(id, enabled) { state.playingIds = enabled ? Array.from(new Set([...state.playingIds, id])) : state.playingIds.filter(activeId => activeId !== id); render(); }
function clearPlaybackHighlights() { state.highlightTimers.forEach(timer => clearTimeout(timer)); state.highlightTimers = []; state.playingIds = []; }
function scheduleHighlight(note, fromBeat, secondsPerBeat) { if (note.tieFromPrevious === true || note.tiedFromPrevious === true || tieStartsBefore(note)) return; const startMs = Math.max(0, (playbackBeat(note) - fromBeat) * secondsPerBeat * 1000); const endMs = Math.max(startMs, (tieChainEnd(note) - fromBeat) * secondsPerBeat * 1000); state.highlightTimers.push(setTimeout(() => setNoteHighlight(note.id, true), startMs)); state.highlightTimers.push(setTimeout(() => setNoteHighlight(note.id, false), endMs)); }
function playNote(note, when, secondsPerBeat) { const ctx = audio(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'triangle'; osc.frequency.value = frequency(note.pitch); gain.gain.setValueAtTime(0.001, when); gain.gain.exponentialRampToValueAtTime(0.18, when + 0.02); gain.gain.exponentialRampToValueAtTime(0.001, when + note.duration * secondsPerBeat * 0.9); osc.connect(gain).connect(ctx.destination); osc.start(when); osc.stop(when + note.duration * secondsPerBeat); }
function play(fromBeat = 0) { stop(false); const ctx = audio(); const secondsPerBeat = 60 / Number(tempoInput.value || 100); const now = ctx.currentTime + 0.08; state.notes.filter(note => playbackBeat(note) >= fromBeat).sort((a, b) => playbackBeat(a) - playbackBeat(b)).forEach(note => { playNote(note, now + (playbackBeat(note) - fromBeat) * secondsPerBeat, secondsPerBeat); scheduleHighlight(note, fromBeat, secondsPerBeat); }); state.playing = true; state.startedAt = ctx.currentTime - fromBeat * secondsPerBeat; playBtn.classList.add('is-active'); const lastBeat = Math.max(...state.notes.map(note => playbackBeat(note) + note.duration), 0); state.timer = setTimeout(() => stop(false), (lastBeat - fromBeat) * secondsPerBeat * 1000 + 200); }
function stop(resetPause = true) { if (state.timer) clearTimeout(state.timer); state.timer = null; clearPlaybackHighlights(); state.playing = false; playBtn.classList.remove('is-active'); pauseBtn.classList.remove('is-active'); if (resetPause) state.pausedAt = 0; render(); }
function loadSheet(data) { stop(true); scoreTitle.value = data.title || 'Untitled Study'; titleInput.value = scoreTitle.value; composerInput.value = data.composer || 'Scale lesson'; state.key = data.key || 'C'; state.mode = data.mode || 'major'; tempoInput.value = data.tempo || 100; state.notes = Array.isArray(data.notes) ? data.notes : state.notes; state.selectedId = state.notes[0]?.id || null; syncControls(); render(); }
function exportSheet() { const payload = { title: scoreTitle.value, composer: composerInput.value, key: state.key, mode: state.mode, tempo: Number(tempoInput.value), notes: state.notes }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = (payload.title.replace(/\W+/g, '-').toLowerCase() || 'sheet') + '.json'; link.click(); URL.revokeObjectURL(url); }
function syncControls() { keySelect.value = state.key; document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === state.mode)); }
keys.forEach(key => { const option = document.createElement('option'); option.value = key; option.textContent = pretty(key); keySelect.appendChild(option); });
document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', () => { state.mode = btn.dataset.mode; syncControls(); render(); }));
keySelect.addEventListener('change', () => { state.key = keySelect.value; render(); });
titleInput.addEventListener('input', () => { scoreTitle.value = titleInput.value; });
scoreTitle.addEventListener('input', () => { titleInput.value = scoreTitle.value; });
document.getElementById('noteUp').addEventListener('click', () => moveSelected(1));
document.getElementById('noteDown').addEventListener('click', () => moveSelected(-1));
document.getElementById('addTreble').addEventListener('click', () => addNote('treble'));
document.getElementById('addBass').addEventListener('click', () => addNote('bass'));
document.getElementById('deleteNote').addEventListener('click', () => { state.notes = state.notes.filter(note => note.id !== state.selectedId); state.selectedId = state.notes[0]?.id || null; render(); });
document.getElementById('snapScale').addEventListener('click', () => { const note = selected(); if (note) note.pitch = closestScalePitch(note.pitch); render(); });
playBtn.addEventListener('click', () => play(state.pausedAt));
pauseBtn.addEventListener('click', () => { if (!state.playing) return; const secondsPerBeat = 60 / Number(tempoInput.value || 100); state.pausedAt = Math.max(0, (audio().currentTime - state.startedAt) / secondsPerBeat); stop(false); pauseBtn.classList.add('is-active'); });
stopBtn.addEventListener('click', () => stop(true));
document.getElementById('exportJson').addEventListener('click', exportSheet);
document.getElementById('loadSample').addEventListener('click', () => loadSheet({ title: 'ICARUS STUDY', composer: 'Scale lesson', key: 'Ab', mode: 'major', tempo: 100, notes: clone(sample) }));
document.getElementById('importJson').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; loadSheet(JSON.parse(await file.text())); event.target.value = ''; });
window.addEventListener('keydown', event => { if (event.target.matches('input, select')) return; if (event.key === 'ArrowUp') { event.preventDefault(); moveSelected(1); } if (event.key === 'ArrowDown') { event.preventDefault(); moveSelected(-1); } if (event.code === 'Space') { event.preventDefault(); state.playing ? stop(true) : play(state.pausedAt); } });
syncControls();
render();
