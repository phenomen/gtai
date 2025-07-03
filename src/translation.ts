import { TranslationServiceClient } from "@google-cloud/translate";

export async function translateText(
  serviceAccount: any,
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  glossaryPath?: string,
  glossaryIgnoreCase?: boolean
): Promise<string> {
  // Input validation
  if (!text || text.trim().length === 0) {
    throw new Error("Text to translate cannot be empty");
  }

  if (!sourceLanguage || !targetLanguage) {
    throw new Error("Source and target languages must be specified");
  }

  if (sourceLanguage === targetLanguage) {
    throw new Error("Source and target languages cannot be the same");
  }

  const translationClient = new TranslationServiceClient({
    credentials: serviceAccount,
  });

  const request = {
    parent: `projects/${serviceAccount.project_id}/locations/us-central1`,
    contents: [text.trim()],
    mimeType: "text/plain",
    sourceLanguageCode: sourceLanguage,
    targetLanguageCode: targetLanguage,
    glossaryConfig: glossaryPath
      ? {
          glossary: glossaryPath,
          ignoreCase: glossaryIgnoreCase ?? true,
        }
      : undefined,
  };

  try {
    const [response] = await translationClient.translateText(request);

    if (!response.translations) {
      throw new Error("No translation received from Google Translate API");
    }

    if (
      response.glossaryTranslations &&
      response.glossaryTranslations[0]?.translatedText
    ) {
      return response.glossaryTranslations[0].translatedText;
    }

    return response.translations[0]?.translatedText || "";
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific Google Cloud API errors
      if (error.message.includes("INVALID_ARGUMENT")) {
        throw new Error(
          "Invalid language code or text format. Please check your input."
        );
      }
      if (error.message.includes("PERMISSION_DENIED")) {
        throw new Error(
          "Permission denied. Please check your service account permissions."
        );
      }
      if (error.message.includes("QUOTA_EXCEEDED")) {
        throw new Error(
          "Translation quota exceeded. Please check your Google Cloud billing."
        );
      }
      throw error;
    }
    throw new Error("Unknown error occurred during translation");
  }
}
