import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { streamText as aiStreamText, stepCountIs } from "ai";
import { db } from "@sarvajna/database/client";
import { Mode, MessageStatus } from "@sarvajna/database/enums";
import type { Prisma } from "@sarvajna/database";

import {
  type ChatStreamEvent,
  type MessagePart,
  toolCallArgsSchema,
  messagePartsSchema,
} from "@sarvajna/shared";

import { createTools } from "../tools";
import { buildSystemPrompt } from "../system-prompt";
import {
  isSuppoertedChatModel,
  resolveChatModel,
} from "../lib/models";

/**
 * ============================================================
 * REQUEST VALIDATION
 * ============================================================
 */

const submitSchema = z.object({
  content: z.string(),
  mode: z.enum(Mode),
  model: z.string().refine(
    isSuppoertedChatModel,
    "Unsupported model",
  ),
});

const submitValidator = zValidator(
  "json",
  submitSchema,
  (result, c) => {
    if (!result.success) {
      console.error(
        "❌ INVALID CHAT REQUEST:",
        result.error.flatten(),
      );

      return c.json(
        {
          error: "Invalid request body",
          details: result.error.flatten(),
        },
        400,
      );
    }
  },
);

const activeResumeSessionIds = new Set<string>();

/**
 * ============================================================
 * CONVERSATION HISTORY
 * ============================================================
 */

function buildConversationHistory(
  messages: {
    role: "USER" | "ASSISTANT" | "ERROR";
    content: string;
    status: MessageStatus;
  }[],
) {
  return messages.flatMap((m) => {
    // Never send error messages back to the model.
    if (m.role === "ERROR") {
      return [];
    }

    // Keep the existing behavior for now.
    // We will investigate tool-only assistant messages separately
    // if PLAN mode still has problems after the mode/cwd checks.
    if (m.role === "ASSISTANT" && m.content.length === 0) {
      return [];
    }

    return [
      {
        role:
          m.role === "USER"
            ? ("user" as const)
            : ("assistant" as const),

        content: m.content,
      },
    ];
  });
}

/**
 * ============================================================
 * RESUME MESSAGE
 * ============================================================
 */

function getResumableUserMessage(
  messages: {
    role: "USER" | "ASSISTANT" | "ERROR";
    model: string;
    mode: Mode;
  }[],
) {
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || lastMessage.role !== "USER") {
    return null;
  }

  return lastMessage;
}

/**
 * ============================================================
 * STREAM PARAMS
 * ============================================================
 */

type StreamParams = {
  sessionId: string;
  model: string;
  cwd: string | null;
  history: {
    role: "user" | "assistant";
    content: string;
  }[];
  mode: Mode;
  abortController: AbortController;
};

/**
 * ============================================================
 * STREAM AI RESPONSE
 * ============================================================
 */

async function streamAIResponse(
  stream: Parameters<Parameters<typeof streamSSE>[1]>[0],
  params: StreamParams,
) {
  const {
    sessionId,
    model,
    cwd,
    history,
    mode,
    abortController,
  } = params;

  const startTime = Date.now();

  /**
   * ----------------------------------------------------------
   * REQUEST DEBUG
   * ----------------------------------------------------------
   */

  console.log("");
  console.log("================================================");
  console.log("              CHAT REQUEST START");
  console.log("================================================");

  console.log("Session ID:", sessionId);
  console.log("Mode:", mode);
  console.log("Model:", model);
  console.log("CWD:", cwd);
  console.log("History messages:", history.length);

  console.log("================================================");

  /**
   * ----------------------------------------------------------
   * PLAN MODE VALIDATION
   * ----------------------------------------------------------
   *
   * PLAN mode requires a cwd because all PLAN tools need
   * a project directory.
   */

  if (mode === Mode.PLAN && !cwd) {
    const errorMessage =
      "PLAN mode requires an active project directory (cwd). " +
      "Please open or select a project before using PLAN mode.";

    console.error("❌ PLAN MODE ERROR:", errorMessage);

    throw new Error(errorMessage);
  }

  /**
   * ----------------------------------------------------------
   * CREATE TOOLS
   * ----------------------------------------------------------
   */

  const tools = cwd
    ? createTools(cwd, mode)
    : undefined;

  console.log("");
  console.log("--------------- TOOL DEBUG ----------------");

  console.log("Mode:", mode);
  console.log("CWD:", cwd);

  if (tools) {
    console.log(
      "Available tools:",
      Object.keys(tools),
    );

    console.log(
      "Tool count:",
      Object.keys(tools).length,
    );
  } else {
    console.log("Available tools: NONE");
    console.log("Tool count: 0");
  }

  console.log("--------------------------------------------");

  /**
   * ----------------------------------------------------------
   * VERIFY PLAN TOOLS
   * ----------------------------------------------------------
   */

  if (mode === Mode.PLAN) {
    const expectedPlanTools = [
      "readFile",
      "listDirectory",
      "grep",
      "glob",
    ];

    const availableTools = tools
      ? Object.keys(tools)
      : [];

    const missingTools =
      expectedPlanTools.filter(
        (tool) =>
          !availableTools.includes(tool),
      );

    if (missingTools.length > 0) {
      const errorMessage =
        `PLAN mode tool initialization failed. ` +
        `Missing tools: ${missingTools.join(", ")}`;

      console.error(
        "❌ PLAN TOOL ERROR:",
        errorMessage,
      );

      throw new Error(errorMessage);
    }

    console.log(
      "✅ PLAN tools verified:",
      availableTools,
    );
  }

  /**
   * ----------------------------------------------------------
   * VERIFY BUILD TOOLS
   * ----------------------------------------------------------
   */

  if (mode === Mode.BUILD && cwd) {
    const expectedBuildTools = [
      "readFile",
      "listDirectory",
      "grep",
      "glob",
      "writeFile",
      "editFile",
      "bash",
    ];

    const availableTools = tools
      ? Object.keys(tools)
      : [];

    const missingTools =
      expectedBuildTools.filter(
        (tool) =>
          !availableTools.includes(tool),
      );

    if (missingTools.length > 0) {
      console.warn(
        "⚠️ BUILD tools missing:",
        missingTools,
      );
    } else {
      console.log(
        "✅ BUILD tools verified:",
        availableTools,
      );
    }
  }

  /**
   * ----------------------------------------------------------
   * MODEL RESOLUTION
   * ----------------------------------------------------------
   */

  let resolvedModel: ReturnType<
    typeof resolveChatModel
  >;

  try {
    resolvedModel =
      resolveChatModel(
        model as any,
      );

    console.log("");
    console.log("--------------- MODEL DEBUG ----------------");

    console.log(
      "Requested model:",
      model,
    );

    console.log(
      "Resolved provider:",
      resolvedModel.provider,
    );

    console.log(
      "Resolved model ID:",
      resolvedModel.modelId,
    );

    console.log(
      "Provider options:",
      resolvedModel.providerOptions,
    );

    console.log("--------------------------------------------");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "❌ MODEL RESOLUTION ERROR:",
      error,
    );

    throw new Error(
      `Model resolution failed: ${message}`,
    );
  }

  /**
   * ----------------------------------------------------------
   * MESSAGE PARTS
   * ----------------------------------------------------------
   */

  const parts: MessagePart[] = [];

  /**
   * ----------------------------------------------------------
   * INTERRUPTED MESSAGE
   * ----------------------------------------------------------
   */

  const persistInterruptedMessage =
    async () => {
      const fullText = parts
        .filter(
          (p) => p.type === "text",
        )
        .map(
          (p) => p.text,
        )
        .join("");

      if (
        fullText.length === 0 &&
        parts.length === 0
      ) {
        return;
      }

      const elapsedMs =
        Date.now() - startTime;

      const validatedParts:
        | Prisma.InputJsonValue
        | undefined =
        parts.length > 0
          ? messagePartsSchema.parse(
              parts,
            )
          : undefined;

      await db.message.create({
        data: {
          sessionId,
          role: "ASSISTANT",
          status:
            MessageStatus.INTERRUPTED,
          model,
          content: fullText,
          parts: validatedParts,
          mode,
          duration:
            Math.round(
              elapsedMs / 1000,
            ),
        },
      });
    };

  /**
   * ==========================================================
   * AI STREAM
   * ==========================================================
   */

  try {
    console.log("");
    console.log(
      "🚀 STARTING AI STREAM",
    );

    console.log(
      "Mode:",
      mode,
    );

    console.log(
      "Model:",
      resolvedModel.modelId,
    );

    console.log(
      "Provider:",
      resolvedModel.provider,
    );

    console.log(
      "Tools enabled:",
      !!tools,
    );

    /**
     * --------------------------------------------------------
     * BUILD SYSTEM PROMPT
     * --------------------------------------------------------
     */

    const systemPrompt =
      buildSystemPrompt({
        cwd,
        mode,
      });

    console.log("");
    console.log(
      "--------------- SYSTEM PROMPT DEBUG ----------------",
    );

    console.log(
      "Mode:",
      mode,
    );

    console.log(
      "CWD:",
      cwd,
    );

    console.log(
      "Prompt contains PLAN:",
      systemPrompt.includes(
        "Mode: PLAN",
      ),
    );

    console.log(
      "Prompt contains BUILD:",
      systemPrompt.includes(
        "Mode: BUILD",
      ),
    );

    console.log(
      "-----------------------------------------------------",
    );

    /**
     * --------------------------------------------------------
     * AI STREAM
     * --------------------------------------------------------
     */

    const result = aiStreamText({
      model: resolvedModel.model,

      system: systemPrompt,

      messages: history,

      tools,

      /**
       * If tools exist, allow multiple
       * tool/model steps.
       */
      stopWhen: tools
        ? stepCountIs(50)
        : undefined,

      abortSignal:
        abortController.signal,

      providerOptions:
        resolvedModel.providerOptions,
    });

    /**
     * --------------------------------------------------------
     * PROCESS STREAM
     * --------------------------------------------------------
     */

    for await (
      const part of result.fullStream
    ) {
      if (stream.aborted) {
        console.log(
          "⚠️ Stream aborted by client.",
        );

        break;
      }

      /**
       * REASONING
       */

      if (
        part.type ===
        "reasoning-delta"
      ) {
        const last =
          parts[
            parts.length - 1
          ];

        if (
          last &&
          last.type ===
            "reasoning"
        ) {
          last.text +=
            part.text;
        } else {
          parts.push({
            type: "reasoning",
            text: part.text,
          });
        }

        const event:
          ChatStreamEvent = {
          type:
            "reasoning-delta",
          text: part.text,
        };

        await stream.writeSSE({
          event:
            "reasoning-delta",

          data:
            JSON.stringify(
              event,
            ),
        });
      }

      /**
       * TEXT
       */

      if (
        part.type ===
        "text-delta"
      ) {
        const last =
          parts[
            parts.length - 1
          ];

        if (
          last &&
          last.type ===
            "text"
        ) {
          last.text +=
            part.text;
        } else {
          parts.push({
            type: "text",
            text: part.text,
          });
        }

        const event:
          ChatStreamEvent = {
          type:
            "text-delta",
          text: part.text,
        };

        await stream.writeSSE({
          event:
            "text-delta",

          data:
            JSON.stringify(
              event,
            ),
        });
      }

      /**
       * TOOL CALL
       */

      if (
        part.type ===
        "tool-call"
      ) {
        console.log("");
        console.log(
          "🔧 TOOL CALL",
        );

        console.log(
          "Tool:",
          part.toolName,
        );

        console.log(
          "Tool Call ID:",
          part.toolCallId,
        );

        console.log(
          "Input:",
          part.input,
        );

        try {
          const args =
            toolCallArgsSchema.parse(
              part.input,
            );

          parts.push({
            type:
              "tool-call",

            id:
              part.toolCallId,

            name:
              part.toolName,

            args,
          });

          const event:
            ChatStreamEvent = {
            type:
              "tool-call",

            toolCallId:
              part.toolCallId,

            toolName:
              part.toolName,

            args,
          };

          await stream.writeSSE({
            event:
              "tool-call",

            data:
              JSON.stringify(
                event,
              ),
          });
        } catch (error) {
          console.error(
            "❌ TOOL ARGUMENT VALIDATION ERROR:",
            error,
          );

          throw error;
        }
      }

      /**
       * TOOL RESULT
       */

      if (
        part.type ===
        "tool-result"
      ) {
        console.log("");
        console.log(
          "🛠️ TOOL RESULT",
        );

        console.log(
          "Tool Call ID:",
          part.toolCallId,
        );

        console.log(
          "Output:",
          part.output,
        );

        const resultStr =
          typeof part.output ===
          "string"
            ? part.output
            : JSON.stringify(
                part.output,
              );

        const tcPart =
          parts.find(
            (
              p,
            ): p is Extract<
              MessagePart,
              {
                type: "tool-call";
              }
            > =>
              p.type ===
                "tool-call" &&
              p.id ===
                part.toolCallId,
          );

        if (tcPart) {
          tcPart.result =
            resultStr;
        }

        const event:
          ChatStreamEvent = {
          type:
            "tool-result",

          toolCallId:
            part.toolCallId,

          result:
            resultStr,
        };

        await stream.writeSSE({
          event:
            "tool-result",

          data:
            JSON.stringify(
              event,
            ),
        });
      }

      /**
       * AI ERROR
       */

      if (
        part.type ===
        "error"
      ) {
        console.error("");
        console.error(
          "❌ AI STREAM ERROR EVENT",
        );

        console.error(
          part.error,
        );

        throw part.error;
      }
    }

    /**
     * --------------------------------------------------------
     * ABORT CHECK
     * --------------------------------------------------------
     */

    if (
      stream.aborted ||
      abortController.signal
        .aborted
    ) {
      console.log(
        "⚠️ AI response interrupted.",
      );

      await persistInterruptedMessage();

      return;
    }

    /**
     * --------------------------------------------------------
     * SAVE ASSISTANT MESSAGE
     * --------------------------------------------------------
     */

    const elapsedMs =
      Date.now() - startTime;

    const fullText = parts
      .filter(
        (p) =>
          p.type === "text",
      )
      .map(
        (p) => p.text,
      )
      .join("");

    const validatedParts:
      | Prisma.InputJsonValue
      | undefined =
      parts.length > 0
        ? messagePartsSchema.parse(
            parts,
          )
        : undefined;

    const assistantMessage =
      await db.message.create({
        data: {
          sessionId,

          role:
            "ASSISTANT",

          status:
            MessageStatus.COMPLETE,

          model,

          content:
            fullText,

          parts:
            validatedParts,

          mode,

          duration:
            Math.round(
              elapsedMs / 1000,
            ),
        },
      });

    console.log("");
    console.log(
      "✅ AI RESPONSE COMPLETE",
    );

    console.log(
      "Mode:",
      mode,
    );

    console.log(
      "Model:",
      model,
    );

    console.log(
      "Duration:",
      elapsedMs,
      "ms",
    );

    console.log(
      "Text length:",
      fullText.length,
    );

    console.log(
      "Parts:",
      parts.length,
    );

    /**
     * --------------------------------------------------------
     * DONE EVENT
     * --------------------------------------------------------
     */

    const doneEvent:
      ChatStreamEvent = {
      type: "done",

      messageId:
        assistantMessage.id,

      durationMs:
        elapsedMs,
    };

    await stream.writeSSE({
      event: "done",

      data:
        JSON.stringify(
          doneEvent,
        ),
    });
  } catch (err) {
    /**
     * --------------------------------------------------------
     * ERROR HANDLING
     * --------------------------------------------------------
     */

    if (
      abortController.signal
        .aborted
    ) {
      console.log(
        "⚠️ Request aborted.",
      );

      await persistInterruptedMessage();

      return;
    }

    const message =
      err instanceof Error
        ? err.message
        : String(err);

    console.error("");
    console.error(
      "================================================",
    );
    console.error(
      "              ❌ AI REQUEST ERROR",
    );
    console.error(
      "================================================",
    );

    console.error(
      "Session:",
      sessionId,
    );

    console.error(
      "Mode:",
      mode,
    );

    console.error(
      "Model:",
      model,
    );

    console.error(
      "CWD:",
      cwd,
    );

    console.error(
      "Error:",
      err,
    );

    console.error(
      "Message:",
      message,
    );

    console.error(
      "================================================",
    );

    /**
     * --------------------------------------------------------
     * SAVE ERROR TO DATABASE
     * --------------------------------------------------------
     */

    try {
      await db.message.create({
        data: {
          sessionId,

          role: "ERROR",

          status:
            MessageStatus.COMPLETE,

          model,

          content:
            message,

          mode,
        },
      });
    } catch (dbError) {
      console.error(
        "❌ Failed to save error message:",
        dbError,
      );
    }

    /**
     * --------------------------------------------------------
     * SEND ERROR TO CLIENT
     * --------------------------------------------------------
     */

    const errorEvent:
      ChatStreamEvent = {
      type: "error",
      message,
    };

    await stream.writeSSE({
      event: "error",

      data:
        JSON.stringify(
          errorEvent,
        ),
    });
  }
}

/**
 * ============================================================
 * ROUTES
 * ============================================================
 */

const app = new Hono()

  /**
   * ==========================================================
   * RESUME
   * ==========================================================
   */

  .post(
    "/:sessionId/resume",
    async (c) => {
      const sessionId =
        c.req.param(
          "sessionId",
        );

      console.log("");
      console.log(
        "========== RESUME REQUEST ==========",
      );

      console.log(
        "Session ID:",
        sessionId,
      );

      const session =
        await db.session.findUnique({
          where: {
            id: sessionId,
          },

          include: {
            messages: {
              orderBy: {
                createdAt:
                  "asc",
              },
            },
          },
        });

      if (!session) {
        console.error(
          "❌ Session not found:",
          sessionId,
        );

        return c.json(
          {
            error:
              "Session not found",
          },
          404,
        );
      }

      const resumableMessage =
        getResumableUserMessage(
          session.messages,
        );

      if (!resumableMessage) {
        return c.json(
          {
            error:
              "Session has no pending user message to resume",
          },
          409,
        );
      }

      if (
        !isSuppoertedChatModel(
          resumableMessage.model,
        )
      ) {
        return c.json(
          {
            error:
              `Session uses unsupported model: ${resumableMessage.model}`,
          },
          409,
        );
      }

      if (
        activeResumeSessionIds.has(
          sessionId,
        )
      ) {
        return c.json(
          {
            error:
              "Session already has an active resume",
          },
          409,
        );
      }

      /**
       * PLAN resume validation
       */

      if (
        resumableMessage.mode ===
          Mode.PLAN &&
        !session.cwd
      ) {
        return c.json(
          {
            error:
              "Cannot resume PLAN mode without a project directory.",
            code:
              "PLAN_CWD_REQUIRED",
          },
          400,
        );
      }

      activeResumeSessionIds.add(
        sessionId,
      );

      const history =
        buildConversationHistory(
          session.messages,
        );

      const abortController =
        new AbortController();

      try {
        return streamSSE(
          c,

          async (stream) => {
            stream.onAbort(
              () => {
                abortController.abort();
              },
            );

            try {
              console.log(
                "▶️ Resuming session",
              );

              console.log(
                "Mode:",
                resumableMessage.mode,
              );

              console.log(
                "Model:",
                resumableMessage.model,
              );

              console.log(
                "CWD:",
                session.cwd,
              );

              await streamAIResponse(
                stream,
                {
                  sessionId,

                  model:
                    resumableMessage.model,

                  cwd:
                    session.cwd,

                  history,

                  mode:
                    resumableMessage.mode,

                  abortController,
                },
              );
            } finally {
              activeResumeSessionIds.delete(
                sessionId,
              );
            }
          },

          async (
            err,
            stream,
          ) => {
            activeResumeSessionIds.delete(
              sessionId,
            );

            const message =
              err instanceof Error
                ? err.message
                : String(err);

            console.error(
              "❌ RESUME STREAM ERROR:",
              err,
            );

            const errorEvent:
              ChatStreamEvent = {
              type: "error",
              message,
            };

            await stream.writeSSE({
              event:
                "error",

              data:
                JSON.stringify(
                  errorEvent,
                ),
            });
          },
        );
      } catch (error) {
        activeResumeSessionIds.delete(
          sessionId,
        );

        throw error;
      }
    },
  )

  /**
   * ==========================================================
   * NEW CHAT MESSAGE
   * ==========================================================
   */

  .post(
    "/:sessionId",
    submitValidator,
    async (c) => {
      const sessionId =
        c.req.param(
          "sessionId",
        );

      console.log("");
      console.log(
        "========== NEW CHAT REQUEST ==========",
      );

      console.log(
        "Session ID:",
        sessionId,
      );

      /**
       * ------------------------------------------------------
       * LOAD SESSION
       * ------------------------------------------------------
       */

      const session =
        await db.session.findUnique({
          where: {
            id: sessionId,
          },

          include: {
            messages: {
              orderBy: {
                createdAt:
                  "asc",
              },
            },
          },
        });

      if (!session) {
        console.error(
          "❌ Session not found:",
          sessionId,
        );

        return c.json(
          {
            error:
              "Session not found",
          },
          404,
        );
      }

      /**
       * ------------------------------------------------------
       * VALIDATED REQUEST
       * ------------------------------------------------------
       */

      const data =
        c.req.valid("json");

      console.log("");
      console.log(
        "--------------- INCOMING DATA ----------------",
      );

      console.log(
        "Requested mode:",
        data.mode,
      );

      console.log(
        "Requested model:",
        data.model,
      );

      console.log(
        "Session cwd:",
        session.cwd,
      );

      console.log(
        "Content:",
        data.content,
      );

      console.log(
        "Content length:",
        data.content.length,
      );

      console.log(
        "------------------------------------------------",
      );

      /**
       * ------------------------------------------------------
       * IMPORTANT PLAN CHECK
       * ------------------------------------------------------
       */

      if (
        data.mode === Mode.PLAN &&
        !session.cwd
      ) {
        console.error(
          "❌ PLAN REQUEST REJECTED: No CWD",
        );

        return c.json(
          {
            error:
              "PLAN mode requires an active project directory. " +
              "Please open/select a project before using PLAN mode.",

            code:
              "PLAN_CWD_REQUIRED",

            mode:
              data.mode,

            cwd:
              session.cwd,
          },
          400,
        );
      }

      /**
       * ------------------------------------------------------
       * MODE DEBUG
       * ------------------------------------------------------
       */

      if (
        data.mode === Mode.PLAN
      ) {
        console.log(
          "🧠 PLAN MODE REQUEST CONFIRMED",
        );
      } else if (
        data.mode === Mode.BUILD
      ) {
        console.log(
          "🔨 BUILD MODE REQUEST CONFIRMED",
        );
      } else {
        console.error(
          "❌ UNKNOWN MODE:",
          data.mode,
        );

        return c.json(
          {
            error:
              `Unknown mode: ${data.mode}`,
          },
          400,
        );
      }

      /**
       * ------------------------------------------------------
       * MODEL VALIDATION
       * ------------------------------------------------------
       */

      if (
        !isSuppoertedChatModel(
          data.model,
        )
      ) {
        console.error(
          "❌ Unsupported model:",
          data.model,
        );

        return c.json(
          {
            error:
              `Unsupported model: ${data.model}`,
          },
          400,
        );
      }

      console.log(
        "✅ Model is supported:",
        data.model,
      );

      /**
       * ------------------------------------------------------
       * SAVE USER MESSAGE
       * ------------------------------------------------------
       */

      await db.message.create({
        data: {
          sessionId,

          role: "USER",

          status:
            MessageStatus.COMPLETE,

          model:
            data.model,

          content:
            data.content,

          mode:
            data.mode,
        },
      });

      /**
       * ------------------------------------------------------
       * BUILD HISTORY
       * ------------------------------------------------------
       */

      const history =
        buildConversationHistory([
          ...session.messages,

          {
            role:
              "USER" as const,

            content:
              data.content,

            status:
              MessageStatus.COMPLETE,
          },
        ]);

      console.log(
        "Conversation history messages:",
        history.length,
      );

      /**
       * ------------------------------------------------------
       * ABORT CONTROLLER
       * ------------------------------------------------------
       */

      const abortController =
        new AbortController();

      /**
       * ------------------------------------------------------
       * START SSE
       * ------------------------------------------------------
       */

      return streamSSE(
        c,

        async (stream) => {
          stream.onAbort(
            () => {
              console.log(
                "⚠️ Client aborted request",
              );

              abortController.abort();
            },
          );

          /**
           * Final confirmation before AI call.
           */

          console.log("");
          console.log(
            "========== FINAL AI REQUEST ==========",
          );

          console.log(
            "Mode:",
            data.mode,
          );

          console.log(
            "Model:",
            data.model,
          );

          console.log(
            "CWD:",
            session.cwd,
          );

          console.log(
            "======================================",
          );

          await streamAIResponse(
            stream,
            {
              sessionId,

              model:
                data.model,

              cwd:
                session.cwd,

              history,

              mode:
                data.mode,

              abortController,
            },
          );
        },

        async (
          err,
          stream,
        ) => {
          const message =
            err instanceof Error
              ? err.message
              : String(err);

          console.error("");
          console.error(
            "❌ SSE STREAM ERROR:",
            err,
          );

          const errorEvent:
            ChatStreamEvent = {
            type: "error",
            message,
          };

          await stream.writeSSE({
            event:
              "error",

            data:
              JSON.stringify(
                errorEvent,
              ),
          });
        },
      );
    },
  );

export default app;