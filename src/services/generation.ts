import { streamText } from "ai";
import { AIManager } from "./ai-manager";
import { PromptUtils } from "../utils/prompt";
import { Logger } from "../utils/logger";
import { localize } from "../utils/i18n";

export async function generateCommitMessageStream(
  diff: string,
  onChunk: (chunk: string) => void,
  options?: { providerId?: string; modelId?: string }
): Promise<string> {
  const config = AIManager.getConfig();
  // Use existing language setting or default to zh-CN
  const language = config.language || "zh-CN";

  let provider;
  if (options?.providerId) {
    provider = AIManager.getProvider(options.providerId);
  } else {
    provider = AIManager.getDefaultProvider();
  }

  if (!provider) {
    throw new Error(
      localize(
        "no.provider.configured",
        "No AI provider configured. Please add a provider in settings."
      )
    );
  }

  let modelId = options?.modelId;
  if (!modelId) {
    modelId = AIManager.getDefaultModel(provider);
  }

  if (!modelId) {
    throw new Error(
      localize(
        "no.model.selected",
        `No model selected for provider ${provider.name}.`
      )
    );
  }

  Logger.log(
    `Generating commit message using Provider: ${provider.name}, Model: ${modelId}, Language: ${language}`
  );

  const prompt = PromptUtils.getPrompt(language, diff);
  const model = AIManager.createModel(provider, modelId);

  try {
    const result = await streamText({
      model: model,
      prompt: prompt,
    });

    let fullText = "";
    for await (const textPart of result.textStream) {
      fullText += textPart;
      onChunk(textPart);
    }

    if (!fullText) {
      throw new Error("Received empty response from AI provider.");
    }

    Logger.log("Received full response from AI provider.");
    return fullText.trim();
  } catch (error: any) {
    Logger.log(`Error calling AI provider: ${error.message}`);
    throw error;
  }
}
