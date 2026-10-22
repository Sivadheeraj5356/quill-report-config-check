# Report Config Check

A client-side heuristic QA for customer-facing analytics configs, built with Quill's problem in mind: an SDK that puts reports and dashboards in front of end customers only works if every metric is tenant-scoped, unambiguous, and honest about freshness.

Paste metric/report definitions, one per line as `kind | name | definition`, and the tool flags potential issues:

- **NO_TENANT_FILTER** - a metric or report with no visible tenant/customer filter
- **AMBIGUOUS_METRIC** - the same metric name with two different definitions
- **SQL_INTERPOLATION_SUSPECT** - values appearing to be interpolated into SQL
- **NO_TIMEZONE** - no timezone declared for date aggregations
- **NO_FRESHNESS** - a report with no freshness/refresh expectation
- **UNPARSED** - lines that do not match the expected format

Plain HTML, CSS and JavaScript. No build step, no external services.

## Run

Open `index.html` in a browser, paste definitions, click "Run config check".

## Test

```
npm test
```

## Limitations

This is a pattern-based screen, not a semantic analyzer:

- A tenant filter applied in middleware or a query layer outside the pasted config is invisible, so NO_TENANT_FILTER can be a false positive; conversely a filter that looks tenant-like but is wrong passes silently.
- SQL interpolation detection is regex-based and catches common shapes only.
- It cannot verify the definitions execute correctly - only that they declare the expected properties.
- Tests verify the rules match their intended sample patterns; they do not prove real configs are safe.
