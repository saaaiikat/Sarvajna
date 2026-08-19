import {anthropic} from "@ai-sdk/anthropic";
import {openai} from "@ai-sdk/openai";
import { findSupportedChatModel,
    type SupportedChatModelId,
    type SupportedProvider,
    type SupportedChatModel
} from "@sarvajna/shared";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { LanguageModel } from "ai";
import { groq } from "@ai-sdk/groq";
import {google} from "@ai-sdk/google";
type AnthropicModelId = Extract<SupportedChatModelId,{provider: "anthropic"}>["id"];
type OpenAIModelId = Extract<SupportedChatModelId, {provider: "openai"}>["id"];
type GoogleModelId = Extract<SupportedChatModelId, {provider: "google"}>["id"];
type GroqModelId = Extract<SupportedChatModelId,{ provider: "groq" }>["id"];

export type ResolveModel = {
    model: LanguageModel;
    provider: SupportedProvider;
    modelId: SupportedChatModelId;
    providerOptions?:ProviderOptions;
};

const GEMINI_PROVIDER_OPTIONS: Partial<Record<GoogleModelId, ProviderOptions>> = {
  "gemini-2.5-flash": {
    google: {
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: 10000,
      },
    },
  },
  "gemini-2.5-flash-lite": {
    google: {
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: 5000,
      },
    },
  },
  "gemini-3-flash-preview": {
    google: {
      thinkingConfig: {
        includeThoughts: true,
        thinkingLevel: "low", // Gemini 3 uses thinkingLevel instead of/alongside thinkingBudget
      },
    },
  },
};

function resolveGroqModel(modelId: GroqModelId): ResolveModel {
  return {
    model: groq(modelId),
    provider: "groq",
    modelId,
  };
}

function assertUnsupportedProvider(provider: never): never {
    throw new Error(`Unsupported provider: ${provider}`);
};

function resolveAnthropicModel(modelId: AnthropicModelId): ResolveModel {
    return {
        model: anthropic(modelId),
        provider: "anthropic",
        modelId,
    };
} 

function resolveOpenAIModel(modelId: OpenAIModelId): ResolveModel {
    return {
        model: openai(modelId),
        provider: "openai",
        modelId,
    };
} 

function resolveGoogleModel(modelId: GoogleModelId): ResolveModel {
  return {
    model: google(modelId),
    provider: "google",
    modelId,
    providerOptions: GEMINI_PROVIDER_OPTIONS[modelId],
  };
}

function resolveSupportedChatModel(modelId: SupportedChatModel): ResolveModel {
    const provider = modelId.provider;

    switch (provider) {
        case "anthropic":
            return resolveAnthropicModel(modelId.id as AnthropicModelId);
        case "openai":
            return resolveOpenAIModel(modelId.id as OpenAIModelId);
        case "google":
            return resolveGoogleModel(modelId.id as GoogleModelId);
        case "groq":
            return resolveGroqModel(modelId.id as GroqModelId);
        default:
            return assertUnsupportedProvider(provider);
    }
};
 
export function isSuppoertedChatModel(modelId: string): modelId is SupportedChatModelId {
    return findSupportedChatModel(modelId) != null;
};

export function resolveChatModel(modelId: SupportedChatModelId): ResolveModel {
    const model = findSupportedChatModel(modelId);
    if(!model) {
        throw new Error(`Unsupported model: ${modelId}`);
    }

    return resolveSupportedChatModel(model);
};