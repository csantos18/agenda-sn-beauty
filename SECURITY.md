# Security Policy

This portfolio project uses environment variables for secrets and must not store real credentials in Git.

## Supported Scope

- Public booking flow
- Administrative login/session flow
- API routes in `server.js`
- Deployment configuration in `render.yaml`

## Operational Rules

- Keep `.env` out of Git.
- Use strong values for `ADMIN_PIN` and `ADMIN_SESSION_SECRET`.
- Rotate `SUPABASE_SERVICE_ROLE_KEY` if it is ever exposed.
- Run `npm audit` before production changes.

## Reporting

Open a private GitHub issue or contact the maintainer through the GitHub profile.
