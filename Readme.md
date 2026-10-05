# Sarvajna

**A terminal-based AI coding agent.**

Plan, chat, and build inside your local project with a Bun-powered CLI, Hono API, Prisma ORM, Clerk auth, and AI SDK streaming.

<p>
  <code>Bun</code> · <code>OpenTUI</code> · <code>React</code> · <code>Hono</code> · <code>Neon</code> · <code>Clerk</code> · <code>Polar</code> · <code>CodeRabbit</code> · <code>Sentry</code> · <code>Railway</code>
</p>

---

## Features

- **Terminal AI Chat** - Run an AI coding assistant directly in your terminal with an OpenTUI and React interface
- **Plan and Build Modes** - Use read-only planning tools or enable write, edit, and shell execution tools for implementation
- **Streaming Responses** - Stream model output through the AI SDK with persisted session history
- **Local Project Tools** - Read files, list directories, glob, grep, write files, edit files, and run shell commands inside the current project
- **Multi-Model Support** - Use supported Anthropic and OpenAI chat models from a shared model registry
- **Persistent Sessions** - Store authenticated user sessions and messages in Postgres via Prisma
- **Clerk OAuth** - Authenticate the CLI through a browser-based Clerk OAuth flow
- **Usage Billing** - Meter AI usage as credits through Polar before allowing session and chat actions

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- PostgreSQL database, such as [Neon](https://neon.tech)
- Clerk application configured for OAuth
- Anthropic and/or OpenAI API key
- Polar account and credits meter

### 1. Clone and install

```bash
git clone <your-repo-url>
cd sarvajna
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the required values:

```env
API_URL=http://localhost:3000
DATABASE_URL=

ANTHROPIC_API_KEY=
OPENAI_API_KEY=

CLERK_FRONTEND_API=
CLERK_OAUTH_CLIENT_SECRET=
CLERK_OAUTH_CLIENT_ID=
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
JWT_SECRET=jwt-secret

POLAR_ACCESS_TOKEN=
POLAR_PRODUCT_ID=
POLAR_SERVER=sandbox
POLAR_CREDITS_METER_ID=
```

### 3. Set up Clerk OAuth

Sarvajna authenticates the CLI through a browser-based Clerk OAuth flow. The CLI opens Clerk authorization in the browser, Clerk redirects to the server at `/auth/callback`, and the server forwards the authorization code back to the local CLI callback server.

In your Clerk dashboard:

1. Go to **Configure > Developers > OAuth applications**.
2. Click **Add OAuth application**.
3. Name it anything, for example `Sarvajna`.
4. Select these four scopes: `openid`, `email`, `profile`, and `offline_access`.
5. Turn on **Public**. This is required for the Authorization Code with PKCE flow used by the CLI.
6. Turn on **Consent screen** so users can approve the requested scopes.
7. Add `http://localhost:3000/auth/callback` as a redirect URI for local development.
8. Add your deployed callback URL as another redirect URI for production, for example `https://your-deployment.com/auth/callback`.

You can keep both local and production redirect URIs on the same OAuth application.

Copy the generated application credentials into `.env`:

| Environment variable | Clerk value |
| --- | --- |
| `CLERK_OAUTH_CLIENT_ID` | OAuth application Client ID |
| `CLERK_OAUTH_CLIENT_SECRET` | OAuth application Client Secret |
| `CLERK_FRONTEND_API` | Clerk frontend API URL |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |

### 4. Set up Polar billing

Sarvajna uses Polar credits to gate new work and bill completed AI usage. The server checks the user's active meter balance before creating sessions or sending chat requests, then ingests usage events after AI responses finish.

In your Polar dashboard, use **sandbox** mode for local development and create a meter with these exact settings:

| Setting | Value |
| --- | --- |
| Meter name | `sarvajna_credits` |
| Filter | Name equals `sarvajna_usage` |
| Aggregation | Sum |
| Aggregation property | `credits` |

The event name and metadata key must match exactly. The server sends usage events like this:

```ts
{
  name: "sarvajna_usage",
  metadata: { credits }
}
```

Next, create a meter credits benefit and attach it to a one-time purchase product:

1. Create a benefit using the `sarvajna_credits` meter.
2. Set the credited units, for example `1000` credits.
3. Create a one-time purchase product, for example $20 for 1000 credits.
4. Attach the credits benefit to that product.
5. Set the customer portal visibility to **private** so purchases happen through API-generated checkout links.

Then copy the required Polar values into `.env`:

| Environment variable | Where to find it |
| --- | --- |
| `POLAR_ACCESS_TOKEN` | Polar developer settings token |
| `POLAR_PRODUCT_ID` | Product ID from the credits product |
| `POLAR_SERVER` | Use `sandbox` locally, `production` for live billing |
| `POLAR_CREDITS_METER_ID` | Meter ID from the meter URL |

The CLI upgrade flow calls `/billing/checkout`, which opens a Polar checkout URL. The usage flow calls `/billing/portal`, which opens the customer's Polar portal.

### 5. Set up the database

Generate the Prisma client:

```bash
bun run --cwd packages/database db:generate
```

Apply your Prisma schema to the configured Postgres database using your preferred Prisma workflow.

### 6. Run the server

```bash
bun run dev:server
```

The API runs on `http://localhost:3000`.

### 7. Run the CLI

In another terminal:

```bash
bun run dev:cli
```

To build and link the local CLI binary:

```bash
bun run link:cli
sarvajna
```

---

## Project Structure

```
packages/
├── cli/                         # OpenTUI + React terminal client
│   ├── bin/                     # sarvajna executable shim
│   └── src/
│       ├── components/          # Terminal UI components, dialogs, messages
│       ├── hooks/               # Chat and UI hooks
│       ├── layouts/             # Root terminal layouts
│       ├── lib/                 # API client, auth, OAuth, local tool execution
│       ├── providers/           # Dialog, keyboard, prompt, theme, toast providers
│       └── screens/             # Home, new session, and session screens
├── database/                    # Prisma schema, generated client, database exports
├── server/                      # Hono API for auth, billing, sessions, and chat
└── shared/                      # Shared schemas, tool contracts, and model registry
```

---

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev:cli` | Start the CLI in watch mode |
| `bun run dev:server` | Start the Hono server with hot reload |
| `bun run build:cli` | Build the CLI package |
| `bun run link:cli` | Build and link the `sarvajna` executable |
| `bun run --cwd packages/database db:generate` | Generate the Prisma client |

---

## Packages

| Package | Description |
| --- | --- |
| `@sarvajna/cli` | Terminal UI and client-side tool execution |
| `@sarvajna/server` | Hono API, AI streaming, auth checks, and billing ingestion |
| `@sarvajna/database` | Prisma client and database schema |
| `@sarvajna/shared` | Shared Zod schemas, AI tool contracts, and model definitions |

---

## ⚠️ Known Limitations & Deployment Status

### 🚫 Current Deployment Status

The project is **currently not hosted publicly** due to the limitations of Railway's free tier.

The application requires resources and execution capabilities that are not reliably available within the free-tier constraints. As a result, the project is currently being developed and tested locally rather than maintained as a publicly accessible deployment.

> **Current Status:** 🔴 **Not publicly hosted**

This is a **hosting limitation**, not an indication that the project is abandoned or incomplete.

---

### 1. Server-Side Tool Execution — **Critical Architectural Issue**

The initial implementation relied on **server-side tool execution**, where the server could directly execute tools and arbitrary commands such as Bash commands.

This approach is **not suitable for production deployment** because the application server should not be responsible for unrestricted execution of arbitrary commands.

#### Why this is a problem

- The server should not directly execute arbitrary user-requested Bash commands.
- Tool execution needs to happen inside a controlled and isolated environment.
- The current implementation tightly couples the agent's reasoning flow with server-side execution.
- Deploying this architecture without proper isolation could introduce serious security risks.

#### Required Refactor

The chat and agent execution flow needs to be redesigned so that:

1. The agent determines which tool needs to be executed.
2. Tool execution occurs through a **secure and controlled execution layer**.
3. The application server handles orchestration rather than unrestricted command execution.
4. Tool inputs and outputs are validated across clear execution boundaries.

> **Status:** 🔴 **Critical architectural work required before production deployment**

---

### 2. Interrupted Message State Is Not Persisted — **Known Limitation**

During the required chat-logic refactor, a minor piece of functionality was lost.

If a user interrupts a long-running response, for example by pressing **`Escape`**, the interrupted state is currently reflected in the running application but **is not persisted to the database**.

#### Current Behaviour

```text
User starts message
       ↓
Agent begins generation
       ↓
User presses Escape
       ↓
Generation is interrupted
       ↓
UI detects interruption
       ↓
❌ Interrupted state is not persisted to DB
```

This means the database may not accurately represent the final state of the message after an interruption.

#### Why It Is Not Currently Being Addressed

This functionality is considered **out of scope for the current architectural refactor**.

The priority is first to establish a safe and correct agentic execution model. Once that is stable, interrupted-message persistence can be implemented as a separate improvement.

> **Status:** 🟡 **Known limitation / Future work**

---

## 📌 Deployment Summary

| Issue | Severity | Current Status | Deployment Impact |
| --- | --- | --- | --- |
| Railway free-tier limitations | 🟡 Hosting | Currently affected | 🚫 Project not publicly hosted |
| Server-side arbitrary tool/Bash execution | 🔴 Critical | Requires architectural refactor | 🚫 Not production-safe |
| Interrupted message state not persisted | 🟡 Medium | Known limitation | Does not independently block deployment |

### Current Priority

**P0 — Fix the execution architecture**

Move away from unrestricted server-side tool execution and establish a secure agent/tool execution model.

**P1 — Deploy on suitable infrastructure**

Once the architecture is production-safe, deploy using infrastructure capable of supporting the application's execution requirements.

**P2 — Persist interrupted message state**

Restore database persistence for interrupted generations once the new agent execution flow is stable.

> **Note:** The project is currently **not publicly hosted primarily because of Railway's free-tier limitations**, while the underlying architecture also requires additional work before it should be considered production-ready.
