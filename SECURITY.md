# Security Policy

## Supported versions

Security fixes are applied to the latest release and the `main` branch.

## Reporting a vulnerability

Please do not disclose security vulnerabilities in a public issue. Use the repository’s **Security → Report a vulnerability** form to submit a private report:

https://github.com/RA1NM4KER/linkedin-outreach-assistant/security/advisories/new

Include the affected version, reproduction steps, impact, and any suggested mitigation. You should receive an acknowledgement within seven days.

## Sensitive local data

The following paths can contain personal or authenticated session data and must never be committed or attached to issues:

- `data/outreach.json`
- `.playwright-profile*/`
- exported contact CSV files
- browser logs or screenshots containing real LinkedIn profiles

If any of this data is exposed, remove public access, invalidate the affected LinkedIn session, and report the incident privately.
