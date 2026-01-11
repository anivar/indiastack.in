# India Stack Watch

**Architectural critique of India's Digital Public Infrastructure**

Closed source at home. Marketed as "open" abroad.

## What This Is

A site examining whether India Stack meets five structural tests for public infrastructure:

1. **Safe Refusal** — Can you exit without penalty?
2. **Legible Execution** — Is the code open source?
3. **Independent Verifiability** — Can it be audited?
4. **Constitutive Input** — Can citizens govern it?
5. **Credible Replacement** — Can alternatives exist?

India Stack fails all five.

## The Claim

Systems branded as "Digital Public Infrastructure" are being exported globally. This site documents why the label is political, not descriptive.

- These systems cannot be exited
- They cannot be audited
- They cannot be corrected
- They cannot be replaced

Therefore, they are not public infrastructure.

## Structure

```
docs/
├── index.html          — Homepage
├── terminology/        — Definitions (public good, open source, PRware)
├── methods/            — Five structural tests
├── foss/               — Open source claims vs reality
├── fork/               — Why alternatives are blocked
├── audit/              — RTI exemptions, no external audit
├── exit/               — No deletion, coercive enrollment
├── participate/        — No citizen governance
├── layers/             — 18+ components analyzed
├── surveillance/       — NATGRID, NPR, observation layer
├── exclusion/          — Documented deaths, welfare denials
├── style.css           — Global styles
├── api/                — Machine-readable data
└── svg/                — Illustrations
```

## Sources

All claims are sourced from:
- Government documents and RTI responses
- Court judgments (Supreme Court, High Courts)
- Academic research (IIT Delhi, JPAL, CIS India)
- Investigative journalism (Washington Post, HRW, Al Jazeera)
- Civil society reports (IFF, SFLC.in, Rethink Aadhaar)

## Deployment

The `docs/` folder contains the static site.

**GitHub Pages:**
1. Push to GitHub
2. Settings → Pages → Source → Deploy from branch
3. Select `main` branch and `/docs` folder
4. Save

**Other hosts:**
- Nginx: point root to `docs/`
- Netlify/Vercel: set publish directory to `docs/`

## Contributing

This is a living document. To contribute:
- Open an issue with evidence or corrections
- Submit a pull request with sourced additions
- Challenge claims with counter-evidence

All contributions must be sourced. No speculation.

## License

♡ Copying is an act of love. Love is not subject to law.

See [LICENSE](LICENSE) for details.

## Author

Created by [Anivar Aravind](https://twitter.com/anivar)

## Links

- **Live site:** https://indiastack.in
- **Twitter:** [@anivar](https://twitter.com/anivar)
