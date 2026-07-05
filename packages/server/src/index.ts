import { Hono } from "hono";
import { sentry } from "@sentry/hono/bun";
import { HTTPException } from "hono/http-exception";
import * as Sentry from "@sentry/hono/bun";
import sessions from "./routes/sessions";
import chat from "./routes/chat";

const app = new Hono();

app.use(
  sentry(app, {
    dsn: "https://cf1aa8bc57d9efd8655367fbd9b974b8@o4511658383310848.ingest.de.sentry.io/4511658409197648",
    tracesSampleRate: 1.0,
    enableLogs: true,
    dataCollection: {
      // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/hono/configuration/options/#dataCollection
      userInfo: false,
      httpBodies: [],
    },
  }),
);


app.get("/debug-sentry", () => {
  // Send a log before throwing the error
  Sentry.logger.info('User triggered test error', {
    action: 'test_error_endpoint',
  });
  // Send a test metric before throwing the error
  Sentry.metrics.count('test_counter', 1);
  throw new Error("My first Sentry error!");
});


app.onError((error, c) => {
  if (error instanceof HTTPException) {
    Sentry.logger.warn("HTTPException Handled", {
      status: error.status,
      message: error.message || "Request failed",
      path: c.req.path,
      method: c.req.method,
    });
    return c.json({ 
      error: error.message || "Request failed",
    }, error.status);
  };

  Sentry.logger.error("Unhandled Exception", {
    path: c.req.path,
    method: c.req.method,
    message: error instanceof Error ? error.message : "Unknown error",  
  });
  return c.json({ error: "Internal server error" }, 500);
});

const routes = app.route("/sessions", sessions).route("/chat", chat);

export type AppType = typeof routes;
// idleTimeout must be high, otherwise LLM tool calls might not complete
export default { port: 3000, fetch: app.fetch, idleTimeout: 255 };
