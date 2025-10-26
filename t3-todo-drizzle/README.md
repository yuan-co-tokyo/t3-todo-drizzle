# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## Database

This project now uses PostgreSQL through Drizzle ORM. Set the `DATABASE_URL` environment variable to a standard PostgreSQL connection string such as `postgresql://user:password@localhost:5432/dbname` before running any commands.

Useful scripts:

- `npm run db:generate` — generate SQL migrations from the schema
- `npm run db:migrate` — apply the generated migrations to the configured database
- `npm run db:studio` — open Drizzle Studio to inspect your data

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
