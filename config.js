// Report-config QA for customer-facing analytics: reviews metric/report definitions
// for the failure modes that make customer-facing dashboards wrong or unsafe -
// metrics without a tenant filter, ambiguous metric definitions, unsafe SQL
// interpolation, missing timezone and missing freshness declarations.
// Heuristic review of pasted config lines, not a semantic analyzer. Pure functions, no DOM.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ReportConfigCheck = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function parseConfig(input) {
    const defs = [];
    const skipped = [];
    input.split('\n').forEach((raw, i) => {
      const line = raw.trim();
      if (!line) return;
      const p = raw.split('|').map((s) => s.trim());
      if (p.length >= 3 && p[0] && p[1]) defs.push({ kind: p[0].toLowerCase(), name: p[1], text: p.slice(2).join(' | '), line: i + 1 });
      else skipped.push(i + 1);
    });
    return { defs, skipped };
  }
  function check(input) {
    const { defs, skipped } = typeof input === 'string' ? parseConfig(input) : input;
    const findings = [];
    const push = (level, code, text) => findings.push({ level, code, text });

    defs.forEach((d) => {
      if (d.kind === 'metric' || d.kind === 'report') {
        if (!/tenant|customer_id|account_id|org_id|workspace/i.test(d.text))
          push('error', 'NO_TENANT_FILTER', `Line ${d.line}: ${d.kind} "${d.name}" has no visible tenant/customer filter - in customer-facing analytics this risks one customer seeing another's data. Filter may be applied elsewhere; if so, ignore.`);
        if (/\$\{[^}]+\}|%\s|format\(|f"|'\s*\+/.test(d.text))
          push('error', 'SQL_INTERPOLATION_SUSPECT', `Line ${d.line}: ${d.kind} "${d.name}" appears to interpolate values into SQL ("${d.text.slice(0, 60)}") - possible injection risk; use parameters.`);
        if (!/tz|timezone|utc|ist|est|pst|cet/i.test(d.text))
          push('warn', 'NO_TIMEZONE', `Line ${d.line}: ${d.kind} "${d.name}" declares no timezone - date aggregations may shift across customer locales.`);
      }
      if (d.kind === 'report' && !/fresh|ttl|cache|refresh|updated/i.test(d.text))
        push('warn', 'NO_FRESHNESS', `Line ${d.line}: report "${d.name}" declares no freshness/refresh expectation - customers may read stale numbers as current.`);
    });

    const byName = {};
    defs.filter((d) => d.kind === 'metric').forEach((d) => {
      if (byName[d.name] && byName[d.name] !== d.text)
        push('error', 'AMBIGUOUS_METRIC', `Metric "${d.name}" has two different definitions (lines ${byName[d.name + ':line']} and ${d.line}) - dashboards will disagree depending on which is used.`);
      byName[d.name] = d.text;
      byName[d.name + ':line'] = byName[d.name + ':line'] || d.line;
    });

    if (skipped.length) push('warn', 'UNPARSED', `Line(s) ${skipped.join(', ')} skipped - expected kind | name | definition.`);
    if (!findings.length && defs.length)
      push('ok', 'CONFIG_CLEAN', `No issues detected in ${defs.length} definition(s) by these heuristics - a pattern-based screen, not a semantic analyzer; see Limitations.`);
    return { findings, stats: { defs: defs.length } };
  }
  return { parseConfig, check };
});
