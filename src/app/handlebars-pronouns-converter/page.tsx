'use client';

import { useState } from 'react';

interface DebugLogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'processing' | 'success' | 'warning' | 'error';
}

interface DebugStats {
  conversions: number;
  pronouns: number;
  ambiguous: number;
  lastTime: string | null;
}

export default function HandlebarsPronounsConverter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [debugLog, setDebugLog] = useState<DebugLogEntry[]>([]);
  const [debugStats, setDebugStats] = useState<DebugStats>({
    conversions: 0,
    pronouns: 0,
    ambiguous: 0,
    lastTime: null
  });
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  // Helper functions
  const LOWER = (s: string) => s.toLowerCase();
  const IS_CAP = (s: string) => /^[A-Z]/.test(s);
  const WORD = /^[A-Za-z][A-Za-z'-]*$/;

  const DETS = new Set(['a','an','the','this','that','these','those','my','your','our','his','her','its','their']);
  const COMMON_ADJ = new Set(['new','old','other','own','first','last','great','small','big','entire','whole','unbelievably']);
  const NOUN_SFX = ['ment','tion','ness','ship','ity','age','ance','ence','ing','er','or'];

  const looksLikeNoun = (w: string) => {
    const lw = LOWER(w);
    if (DETS.has(lw) || COMMON_ADJ.has(lw)) return false;
    if (NOUN_SFX.some(sfx => lw.endsWith(sfx))) return true;
    return lw.length > 3 && lw.endsWith('s');
  };

  const log = (message: string, type: DebugLogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const entry = { timestamp, message, type };
    setDebugLog(prev => [...prev, entry]);
  };

  const updateStats = (newStats: Partial<DebugStats>) => {
    setDebugStats(prev => ({ ...prev, ...newStats }));
  };

  const clearDebugLog = () => {
    setDebugLog([]);
    setDebugStats({ conversions: 0, pronouns: 0, ambiguous: 0, lastTime: null });
  };

  const downloadDebugLog = () => {
    const logText = debugLog.map(entry => 
      `[${entry.timestamp}] ${entry.type.toUpperCase()}: ${entry.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pronoun-converter-debug-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Tokenize while preserving macros
  const toks = (src: string) => {
    const a: Array<{t: string, m?: number}> = [];
    let i = 0;
    while (i < src.length) {
      if (src[i] === '{') {
        const j = src.indexOf('}}', i) + 2 || src.length;
        a.push({ t: src.slice(i, j), m: 1 });
        i = j;
        continue;
      }
      
      // Handle tilde followed by word
      if (src[i] === '~') {
        const w = src.slice(i + 1).match(/^[A-Za-z'-]+/);
        if (w) {
          a.push({ t: '~' + w[0] });
          i += 1 + w[0].length;
          continue;
        }
      }
      
      const w = src.slice(i).match(/^[A-Za-z'-]+/);
      if (w) { a.push({ t: w[0] }); i += w[0].length; continue; }
      a.push({ t: src[i] }); i++;
    }
    return a;
  };

  const merge = (t: Array<{t: string}>) => t.map(o => o.t).join('');

  // Emit helpers
  const H = (base: string, cap: boolean) => '{{' + base + (cap ? 'Cap' : '') + '}}';

  // Direct mapping
  const direct = (w: string, cap: boolean) => {
    switch (w) {
      case 'he': case 'she': case 'it': case 'they': case 'you': return H('pronounSubjective', cap);
      case 'him': case 'them': return H('pronounObjective', cap);
      case 'his': return null;          // ambiguous
      case 'her': return null;          // ambiguous
      case 'their': case 'your': case 'its': return H('pronounPosDet', cap);
      case 'theirs': case 'yours': return H('pronounPosPro', cap);
      case 'themselves': case 'themself': case 'himself': case 'herself': case 'itself': case 'yourself': case 'yourselves':
        return H('pronounReflexive', cap);
      default: return null;
    }
  };

  // Contraction replace on tilde token body (no leading ~)
  const contraction = (body: string, cap: boolean) => {
    const m = body.match(/^([A-Za-z]+)('?)(re|ve|d|ll|s)$/);
    if (!m) return null;
    const p = LOWER(m[1]);
    if (!['they','he','she','it','you'].includes(p)) return null;
    return H('pronounSubjective', cap) + (m[2] || '\'') + m[3];
  };

  // Her/his heuristics
  const resolve = (tokens: Array<{t: string, m?: number}>, i: number, kind: string) => {
    const cap = IS_CAP(tokens[i].t.slice(1));
    let j = i + 1, steps = 0;
    while (j < tokens.length && steps < 6) {
      const tt = tokens[j].t;
      if (tokens[j].m) { break; }
      if (/^[\s.,!?;:"'`()\[\]-]+$/.test(tt)) { j++; steps++; continue; }
      if (!WORD.test(tt)) { j++; steps++; continue; }
      if (looksLikeNoun(tt)) return H(kind === 'her' ? 'pronounPosDet' : 'pronounPosDet', cap);
      return H(kind === 'her' ? 'pronounObjective' : 'pronounPosPro', cap);
    }
    return H(kind === 'her' ? 'pronounObjective' : 'pronounPosPro', cap);
  };

  // Main conversion function
  const convert = (text: string) => {
    const newStats = { ...debugStats };
    newStats.conversions++;
    newStats.lastTime = new Date().toLocaleTimeString();
    log(`Starting conversion of ${text.length} characters`, 'processing');
    
    const tk = toks(text);
    let convertedCount = 0;
    
    tk.forEach((o, i) => {
      if (o.m) {
        log(`Skipping existing macro: ${o.t}`, 'info');
        return;
      }
      if (!o.t.startsWith('~')) {
        return;
      }
      
      const base = o.t.slice(1);
      const cap = IS_CAP(base);
      log(`Processing tilde token: ~${base} (capitalized: ${cap})`, 'processing');
      
      // Contraction first
      const c = contraction(base, cap);
      if (c) {
        log(`Contraction conversion: ~${base} → ${c}`, 'success');
        o.t = c;
        convertedCount++;
        return;
      }
      
      // Direct
      const d = direct(LOWER(base), cap);
      if (d) {
        log(`Direct conversion: ~${base} → ${d}`, 'success');
        o.t = d;
        convertedCount++;
        return;
      }
      
      // Her / his branch
      if (LOWER(base) === 'her') {
        const result = resolve(tk, i, 'her');
        log(`Ambiguous 'her' resolved to: ${result}`, 'success');
        o.t = result;
        convertedCount++;
        newStats.ambiguous++;
        return;
      }
      if (LOWER(base) === 'his') {
        const result = resolve(tk, i, 'his');
        log(`Ambiguous 'his' resolved to: ${result}`, 'success');
        o.t = result;
        convertedCount++;
        newStats.ambiguous++;
        return;
      }
      
      // Otherwise keep the original word without tilde
      log(`No conversion found for: ~${base} → ${base}`, 'warning');
      o.t = base;
    });
    
    newStats.pronouns += convertedCount;
    log(`Conversion complete: ${convertedCount} pronouns converted`, 'success');
    updateStats(newStats);
    
    return merge(tk);
  };

  const countWords = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    const converted = convert(value);
    setOutput(converted);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      const converted = convert(text);
      setOutput(converted);
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const clearInput = () => {
    setInput('');
    setOutput('');
  };

  const clearOutput = () => {
    setOutput('');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      {/* Debug Toggle Button */}
      <button
        onClick={() => setIsDebugOpen(!isDebugOpen)}
        className="fixed top-5 right-5 z-50 bg-[var(--accent)] text-white border-none rounded-full w-12 h-12 cursor-pointer text-xl transition-all duration-200 hover:scale-110 shadow-lg"
      >
        🐛
      </button>

      {/* Debug Panel */}
      <div className={`fixed top-0 right-0 w-96 h-screen bg-[var(--card)] border-l-2 border-[var(--border)] transform transition-transform duration-300 z-40 flex flex-col ${isDebugOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[rgba(78,161,255,0.1)]">
          <div className="font-semibold text-[var(--accent)]">🔍 Conversion Debug Logger</div>
          <button
            onClick={() => setIsDebugOpen(false)}
            className="bg-transparent border-none text-[var(--fg)] text-lg cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex gap-2 mb-4">
            <button
              onClick={clearDebugLog}
              className="bg-[var(--card)] text-[var(--fg)] border border-[var(--border)] rounded-lg px-3 py-2 cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-[var(--hover)] hover:border-[var(--accent)]"
            >
              Clear Log
            </button>
            <button
              onClick={downloadDebugLog}
              className="bg-[var(--card)] text-[var(--fg)] border border-[var(--border)] rounded-lg px-3 py-2 cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-[var(--hover)] hover:border-[var(--accent)]"
            >
              Download Log
            </button>
          </div>
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 h-48 overflow-y-auto mb-4 text-[var(--sub)] font-mono text-xs">
            {debugLog.map((entry, index) => (
              <div key={index} className={`mb-2 p-2 rounded border-l-3 ${entry.type === 'processing' ? 'bg-[rgba(78,161,255,0.1)] border-l-[var(--accent)]' : entry.type === 'success' ? 'bg-[rgba(34,197,94,0.1)] border-l-[var(--success)]' : entry.type === 'warning' ? 'bg-[rgba(245,158,11,0.1)] border-l-[var(--warning)]' : 'border-l-[var(--muted)]'}`}>
                <strong>[{entry.timestamp}]</strong> {entry.message}
              </div>
            ))}
          </div>
          <div className="bg-[rgba(28,34,48,0.5)] rounded-lg p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span>Conversions processed:</span>
              <span>{debugStats.conversions}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Pronouns converted:</span>
              <span>{debugStats.pronouns}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Ambiguous resolutions:</span>
              <span>{debugStats.ambiguous}</span>
            </div>
            <div className="flex justify-between">
              <span>Last conversion time:</span>
              <span>{debugStats.lastTime || 'Never'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 min-h-screen flex flex-col">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-[var(--fg)] to-[var(--accent)] bg-clip-text text-transparent">
            Handlebars Pronouns Converter
          </h1>
          <div className="text-[var(--sub)] text-base mb-4">
            Smart pronoun-to-macro conversion for{' '}
            <a href="https://app.wyvern.chat/" target="_blank" rel="noopener" className="text-[var(--accent)] font-medium hover:text-[#6bb6ff] transition-colors">
              WyvernChat
            </a>{' '}
            templates
            <span className="inline-block border border-[rgba(78,161,255,0.3)] rounded-full px-3 py-1 text-xs bg-[rgba(78,161,255,0.1)] ml-2">
              tilde-scoped
            </span>
          </div>
          <div className="bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] rounded-lg p-3 text-sm text-[#fbbf24] max-w-2xl mx-auto">
            ⚠️ <strong>WyvernChat Exclusive:</strong> This converter generates macros specifically for WyvernChat&apos;s templating system. Not compatible with other frontends.
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[500px]">
            {/* Input Column */}
            <div className="flex flex-col gap-3">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden flex-1 flex flex-col transition-colors hover:border-[var(--accent)] focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_rgba(78,161,255,0.1)]">
                <div className="flex gap-2 items-center p-4 bg-[rgba(28,34,48,0.5)] border-b border-[var(--border)]">
                  <div className="font-semibold text-sm text-[var(--fg)]">📝 Input Text</div>
                  <div className="flex-1"></div>
                  <div className="text-xs text-[var(--muted)]">{countWords(input)} words</div>
                  <button
                    onClick={handlePaste}
                    className="bg-[var(--card)] text-[var(--fg)] border border-[var(--border)] rounded-lg px-3 py-2 cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-[var(--hover)] hover:border-[var(--accent)] flex items-center gap-1.5"
                  >
                    📋 Paste
                  </button>
                  <button
                    onClick={clearInput}
                    className="bg-[var(--card)] text-[var(--fg)] border border-[var(--border)] rounded-lg px-3 py-2 cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-[var(--hover)] hover:border-[var(--accent)] flex items-center gap-1.5"
                  >
                    🗑️ Clear
                  </button>
                </div>
                <textarea
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Type or paste your text here...

Examples:
~They walked to ~their car.
~He said ~his book was ready.
~She gave ~her presentation.

Tip: Only words with ~ prefix are converted!"
                  className="w-full flex-1 bg-transparent text-[var(--fg)] border-none outline-none resize-none font-mono text-sm leading-relaxed p-5 min-h-[400px] placeholder:text-[var(--muted)]"
                />
              </div>
              <div className="text-[var(--muted)] text-xs p-1 flex items-center gap-2">
                💡 Only words prefixed with a tilde (~) are converted to macros
              </div>
            </div>

            {/* Output Column */}
            <div className="flex flex-col gap-3">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden flex-1 flex flex-col transition-colors hover:border-[var(--accent)]">
                <div className="flex gap-2 items-center p-4 bg-[rgba(28,34,48,0.5)] border-b border-[var(--border)]">
                  <div className="font-semibold text-sm text-[var(--fg)]">⚡ Converted Output</div>
                  <div className="flex-1"></div>
                  <div className="text-xs text-[var(--muted)]">{countWords(output)} words</div>
                  <button
                    onClick={handleCopy}
                    className="bg-[var(--accent)] border border-[var(--accent)] text-white rounded-lg px-3 py-2 cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-[#3d8bfd] hover:border-[#3d8bfd] flex items-center gap-1.5"
                  >
                    📄 Copy
                  </button>
                  <button
                    onClick={clearOutput}
                    className="bg-[var(--card)] text-[var(--fg)] border border-[var(--border)] rounded-lg px-3 py-2 cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-[var(--hover)] hover:border-[var(--accent)] flex items-center gap-1.5"
                  >
                    🗑️ Clear
                  </button>
                </div>
                <textarea
                  value={output}
                  readOnly
                  placeholder="Converted Handlebars macros will appear here automatically..."
                  className="w-full flex-1 bg-transparent text-[var(--fg)] border-none outline-none resize-none font-mono text-sm leading-relaxed p-5 min-h-[400px] placeholder:text-[var(--muted)]"
                />
              </div>
              <div className="text-[var(--muted)] text-xs p-1 flex items-center gap-2">
                ✨ Existing {'{{macros}}'} remain untouched • Smart context detection for ambiguous pronouns
              </div>
            </div>
          </div>

          {/* Examples Section */}
          <div className="mt-6 p-5 bg-[var(--card)] border border-[var(--border)] rounded-xl">
            <h3 className="text-[var(--accent)] text-base mb-3">💡 Examples & Usage Guide</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-[rgba(28,34,48,0.5)] rounded-lg font-mono text-xs">
                <div className="text-[var(--sub)] text-xs uppercase tracking-wider mb-1">Input</div>
                <div>~They opened ~their laptop and started working on ~their project.</div>
              </div>
              <div className="p-3 bg-[rgba(28,34,48,0.5)] rounded-lg font-mono text-xs">
                <div className="text-[var(--sub)] text-xs uppercase tracking-wider mb-1">Output</div>
                <div>{'{{pronounSubjectiveCap}} opened {{pronounPosDet}} laptop and started working on {{pronounPosDet}} project.'}</div>
              </div>
              <div className="p-3 bg-[rgba(28,34,48,0.5)] rounded-lg font-mono text-xs">
                <div className="text-[var(--sub)] text-xs uppercase tracking-wider mb-1">Ambiguous Resolution</div>
                <div>~Her book → {'{{pronounPosDet}}'} book<br/>Talk to ~her → Talk to {'{{pronounObjective}}'}</div>
              </div>
              <div className="p-3 bg-[rgba(28,34,48,0.5)] rounded-lg font-mono text-xs">
                <div className="text-[var(--sub)] text-xs uppercase tracking-wider mb-1">Contractions</div>
                <div>~They&apos;re happy → {'{{pronounSubjective}}'}&apos;re happy<br/>~He&apos;s ready → {'{{pronounSubjective}}'}&apos;s ready</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-[rgba(78,161,255,0.1)] rounded-lg text-sm">
              <strong>📚 Need help with WyvernChat templates?</strong> Check out the{' '}
              <a href="https://wyvernchat.notion.site/Handlebars-Functions-Reference-27048ee2b3e78006bbc4dee7c663c005" target="_blank" rel="noopener" className="text-[var(--accent)] font-medium hover:text-[#6bb6ff] transition-colors">
                comprehensive documentation
              </a>{' '}
              for detailed guides and examples.
            </div>
          </div>
        </div>

        {/* License Footer */}
        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--muted)] text-center leading-relaxed">
            <p>
              Handlebars Pronouns Converter by{' '}
              <a href="https://beta.wyvern.chat/profiles/dTSo5SSdNrgwrhGxqVqDW5an9ij2" className="text-[var(--sub)] hover:text-[var(--accent)] transition-colors">
                SopakcoSauce
              </a>{' '}
              is licensed under{' '}
              <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/?ref=chooser-v1" target="_blank" rel="license noopener noreferrer" className="text-[var(--sub)] hover:text-[var(--accent)] transition-colors">
                Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}