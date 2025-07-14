import { isValidLangCode } from "./utils/language-validation";

export interface Settings {
  defaultSourceLanguage: string;
  defaultTargetLanguage: string;
  activeGlossary?: string;
  glossaryIgnoreCase?: boolean;
}

const SETTINGS_FILE = "./.gtai.json";
const SERVICE_ACCOUNT_FILE = "./service-account.json";

export async function loadSettings(): Promise<Settings | null> {
  try {
    const settingsFile = Bun.file(SETTINGS_FILE);

    if (!(await settingsFile.exists())) {
      return null;
    }

    const settingsText = await settingsFile.text();
    const settings = JSON.parse(settingsText) as Settings;

    // Validate settings structure
    if (
      typeof settings.defaultSourceLanguage !== "string" ||
      typeof settings.defaultTargetLanguage !== "string" ||
      !isValidLangCode(settings.defaultSourceLanguage) ||
      !isValidLangCode(settings.defaultTargetLanguage)
    ) {
      return null;
    }

    // activeGlossary is optional, but if present should be a string
    if (
      settings.activeGlossary !== undefined &&
      typeof settings.activeGlossary !== "string"
    ) {
      return null;
    }

    // glossaryIgnoreCase is optional, but if present should be a boolean
    if (
      settings.glossaryIgnoreCase !== undefined &&
      typeof settings.glossaryIgnoreCase !== "boolean"
    ) {
      return null;
    }

    return settings;
  } catch (error) {
    return null;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    // Validate settings before saving
    if (!settings.defaultSourceLanguage || !settings.defaultTargetLanguage) {
      throw new Error("Invalid settings: language codes cannot be empty");
    }

    if (
      !isValidLangCode(settings.defaultSourceLanguage) ||
      !isValidLangCode(settings.defaultTargetLanguage)
    ) {
      throw new Error(
        "Invalid settings: language codes must be valid (e.g., 'en', 'en-US')"
      );
    }

    await Bun.write(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    throw new Error(
      `Failed to save settings: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function settingsExist(): Promise<boolean> {
  try {
    const settingsFile = Bun.file(SETTINGS_FILE);
    return await settingsFile.exists();
  } catch (error) {
    return false;
  }
}

export async function initializeSettings(): Promise<Settings> {
  const defaultSettings: Settings = {
    defaultSourceLanguage: "en",
    defaultTargetLanguage: "ru",
    activeGlossary: undefined,
    glossaryIgnoreCase: true,
  };

  await saveSettings(defaultSettings);
  return defaultSettings;
}

export async function loadServiceAccount(): Promise<any> {
  const serviceAccountFile = Bun.file(SERVICE_ACCOUNT_FILE);

  if (!(await serviceAccountFile.exists())) {
    throw new Error(
      "Google Service Account not found. Please add a valid service-account.json to this directory."
    );
  }

  try {
    const serviceAccountText = await serviceAccountFile.text();
    const serviceAccount = JSON.parse(serviceAccountText);

    // Basic validation of service account structure
    const requiredFields = [
      "project_id",
      "client_email",
      "private_key",
      "type",
    ];
    const missingFields = requiredFields.filter(
      (field) => !serviceAccount[field]
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Google Service Account is invalid. Missing required fields: ${missingFields.join(
          ", "
        )}`
      );
    }

    if (serviceAccount.type !== "service_account") {
      throw new Error(
        'Google Service Account is invalid. Must be of type "service_account"'
      );
    }

    return serviceAccount;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        "Google Service Account file is not valid JSON. Please check the file format."
      );
    }

    if (error instanceof Error && error.message.includes("invalid")) {
      throw error;
    }

    throw new Error(
      "Failed to load Google Service Account. Please ensure the file is valid and accessible."
    );
  }
}
