'use strict';

const THSubtitles = (() => {
  const maxText = 6000;
  const toMS = value => Math.round(value * 1000);
  const errors = message => { throw new Error(message); };
  const plainEntities = {amp:'&', lt:'<', gt:'>', nbsp:' ', lrm:'\u200E', rlm:'\u200F'};

  function readTime(value, webvtt) {
    const match = webvtt
      ? value.match(/^(?:(\d{2,}):)?(\d{2}):(\d{2})\.(\d{3})$/)
      : value.match(/^(\d{2,}):(\d{2}):(\d{2})[,.](\d{3})$/);
    if (!match || +match[2] > 59 || +match[3] > 59) {
      errors(webvtt ? 'WebVTT 时间格式无效。' : 'SRT 时间格式应为 00:00:00,000。');
    }
    return Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
  }

  function read(raw) {
    if (typeof raw !== 'string' || !raw.trim() || raw.length > 1500000) errors('请选择有效的字幕文本（最多 1.5 MB）。');
    const text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
    const webvtt = /^WEBVTT(?:[ \t]|\n|$)/.test(text);
    const blocks = text.split(/\n[\t ]*\n+/);
    if (webvtt) blocks.shift();
    const rows = [];
    for (const block of blocks) {
      if (webvtt && /^(?:NOTE(?:\s|$)|STYLE\n|REGION\n)/.test(block)) continue;
      const lines = block.split('\n');
      if (webvtt ? !lines[0].includes('-->') : /^\d+$/.test(lines[0].trim())) lines.shift();
      const timing = lines.shift()?.trim().match(/^(\S+)\s*-->\s*(\S+)(?:\s+.*)?$/);
      let target = lines.join('\n').trim();
      if (webvtt) {
        target = target
          .replace(/<\/?(?:c(?:\.[\w.-]+)?|v|i|b|u|ruby|rt|lang)(?:[ \t][^<>\n]*)?>|<\d[\d:.]*>/gi, '')
          .replace(/&(amp|lt|gt|nbsp|lrm|rlm);/g, (_, key) => plainEntities[key]).trim();
      }
      if (!timing || !target || target.length > maxText) errors('第 ' + (rows.length + 1) + ' 条字幕缺少有效时间码或正文。');
      const start = readTime(timing[1], webvtt), end = readTime(timing[2], webvtt);
      if (end <= start) errors('第 ' + (rows.length + 1) + ' 条字幕的出点必须晚于入点。');
      rows.push({id: 'i' + (rows.length + 1), start, end, source: '', target});
      if (rows.length > 1000) errors('每份字幕最多 1000 条。');
    }
    if (!rows.length) errors('文件中没有可读的字幕。');
    return {format: webvtt ? 'WebVTT' : 'SRT', rows};
  }

  function fillTargets(original, translated) {
    if (original.length !== translated.length) errors('条数不一致。请使用同一时间轴导出的译文字幕。');
    const timeKey = cue => toMS(cue.start) + ':' + toMS(cue.end);
    const targets = new Map(translated.map(row => [timeKey(row), row.target]));
    if (targets.size !== translated.length || new Set(original.map(timeKey)).size !== original.length) {
      errors('有重复的时间码，无法唯一匹配译文。');
    }
    return original.map((cue, index) => {
      const target = targets.get(timeKey(cue));
      if (!target) errors('第 ' + (index + 1) + ' 条的入点或出点不匹配。');
      return {...cue, target};
    });
  }

  function count(value) {
    return Array.from(value).filter(char => !/\s/u.test(char)).length;
  }

  function qa(rows, profile, wrap) {
    let maxEnd = -1;
    const names = {overlap: '时间重叠', missingTarget: '缺译文', missingSource: '缺原文', speed: '阅读速度偏快', length: '单行过长', lines: '行数过多', short: '显示过短', long: '显示过长'};
    const flags = rows.map((cue, index) => {
      const issues = [];
      const start = toMS(cue.start), end = toMS(cue.end);
      if (start < maxEnd || (index + 1 < rows.length && toMS(rows[index + 1].start) < end)) issues.push('overlap');
      maxEnd = Math.max(maxEnd, end);
      if (profile.trackMode !== 'source' && !cue.target.trim()) issues.push('missingTarget');
      if (profile.trackMode !== 'zh' && !cue.source.trim()) issues.push('missingSource');
      if (profile.trackMode !== 'source' && cue.target.trim()) {
        const lines = wrap(cue.target, profile).trim().split('\n');
        if (count(cue.target) / (cue.end - cue.start) > profile.maxCps) issues.push('speed');
        if (lines.some(line => count(line) > Number(profile.lineLimit))) issues.push('length');
        if (lines.length > profile.maxLines) issues.push('lines');
      }
      if (end - start < 700) issues.push('short');
      if (end - start > 7000) issues.push('long');
      return issues;
    });
    return flags.map(issues => issues.map(key => names[key]));
  }

  function cleanLines(value) {
    return value.replace(/\r\n?/g, '\n').trim().split('\n').filter(line => line.trim()).join('\n');
  }

  return {read, fillTargets, count, qa, cleanLines};
})();
