function hexToChar(_: string, h: string) {
  try {
    return String.fromCharCode(parseInt(h, 16));
  } catch (err) {
    console.error('Invalid hex escape', err);
    return "";
  }
}

export function rtfToText(rtf: string) {
  // Remove whole groups we don't want to keep (fonttbl, stylesheet, colortbl, info, etc.)
  const drop = new Set([
    'fonttbl','colortbl','stylesheet','listtable','listoverridetable','generator','info','filetbl','rsidtbl','themedata','datastore','xmlopen','xmlclose','pict','object','shpinst','header','footer','background'
  ]);
  const stripGroups = (input: string) => {
    let i = 0; const n = input.length; let out = '';
    while (i < n) {
      if (input[i] === '{' && i + 2 < n && input[i+1] === '\\') {
        let j = i + 2; // after '{\'
        let star = false; if (input[j] === '*') { star = true; j++; }
        let cw = '';
        while (j < n && /[a-zA-Z]/.test(input[j])) { cw += input[j++]; }
        if (star || drop.has(cw)) {
          // skip balanced braces for this group
          let depth = 1; i++; // on '{'
          while (i < n && depth > 0) {
            if (input[i] === '{') depth++;
            else if (input[i] === '}') depth--;
            i++;
          }
          continue;
        }
      }
      out += input[i++];
    }
    return out;
  };

  let s = stripGroups(rtf);
  // Decode Unicode escapes (\uN?) and hex escapes (\'hh)
  s = s.replace(/\\u(-?\d+)\??/g, (_m, num) => {
    let code = Number(num);
    if (code < 0) code += 65536;
    try { return String.fromCharCode(code); } catch { return ''; }
  });
  s = s.replace(/\\'([0-9a-fA-F]{2})/g, hexToChar);
  // Map structural controls to whitespace before stripping
  s = s
    .replace(/\\pard?\b/g, "\n")
    .replace(/\\par\b/g, "\n")
    .replace(/\\line\b/g, "\n")
    .replace(/\\tab\b/g, "\t");
  // Unescape special chars
  s = s.replace(/\\\\/g, "\\").replace(/\\\{/g, "{").replace(/\\\}/g, "}");
  // Drop remaining control words (e.g., \b, \fs24, \cf1)
  s = s.replace(/\\[a-zA-Z]+-?\d* ?/g, "");
  // Remove groups braces
  s = s.replace(/[{}]/g, "");
  // Normalize whitespace
  s = s.replace(/\r\n?|\r/g, "\n");
  s = s.replace(/[\t ]+\n/g, "\n");
  s = s.replace(/\n[\t ]+/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");

  // Remove lines that are only punctuation artifacts (e.g., ;;;;;; from styles)
  const lines = s.split(/\n/).map(l => l.replace(/\s+$/,'')).filter(l => !/^[;:.,'`~_*\-]{3,}\s*$/.test(l));

  // Preserve newlines between lines to avoid collapsing paragraphs.
  // Only trim trailing spaces and collapse runs of 3+ blank lines.
  const finalText = lines
    .map(l => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/,'')
    .replace(/^\s+/, '');
  return finalText;
}

export function srtToText(srt: string) {
  const lines = srt.split(/\r?\n/);
  const out: string[] = [];
  const timeRe = /^\s*\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/;
  for (const line of lines) {
    if (/^\s*\d+\s*$/.test(line)) continue; // index line
    if (timeRe.test(line)) continue; // timecode line
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function mdToText(md: string) {
  let s = md;
  // Remove code fences and inline code ticks (keep content inline)
  s = s.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ""));
  s = s.replace(/`([^`]*)`/g, "$1");
  // Images: ![alt](url) -> alt
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Links: [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1");
  // Headings: #### Title -> Title
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  // Blockquotes: > text -> text
  s = s.replace(/^\s{0,3}>\s?/gm, "");
  // Lists: -/*/+ or 1. -> text
  s = s.replace(/^\s{0,3}([*+-]|\d+\.)\s+/gm, "");
  // Emphasis/strong/strike: *text* **text** _text_ __text__ ~~text~~ -> text
  s = s.replace(/([*_~]{1,2})([^*_~]+)\1/g, "$2");
  // Horizontal rules
  s = s.replace(/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/gm, "");
  // Strip simple HTML tags
  s = s.replace(/<[^>]+>/g, "");
  // Normalize whitespace
  s = s.replace(/\r\n?|\r/g, "\n").replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

export async function extractTextFromFile(file: File): Promise<string> {
  const raw = await file.text();
  const name = file.name.toLowerCase();
  if (name.endsWith(".rtf")) return rtfToText(raw);
  if (name.endsWith(".srt")) return srtToText(raw);
  if (name.endsWith(".md") || name.endsWith(".markdown")) return mdToText(raw);
  return raw;
}
