#!/usr/bin/env bun
import * as p from "@clack/prompts";
import clipboard from "clipboardy";
import { translateText } from "./translation";
import {
  loadSettings,
  saveSettings,
  settingsExist,
  loadServiceAccount,
  type Settings,
} from "./settings";
import {
  listGlossaries,
  deleteGlossary,
  uploadAndCreateGlossary,
  listBuckets,
} from "./glossary";
import { isValidLangCode } from "./utils/language-validation";

async function promptForSettings(): Promise<Settings> {
  p.log.info("Let's set up your default languages.");

  const settingsInputs = await p.group(
    {
      defaultSourceLanguage: () =>
        p.text({
          message: "Enter your source language code",
          placeholder: "en, en-US, ru, es, pt-BR, etc.",
          defaultValue: "en",
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return "Source language cannot be empty";
            }
            if (!isValidLangCode(value)) {
              return "Please enter a valid language code (en, en-US, ru, es, pt-BR, etc.)";
            }
          },
        }),
      defaultTargetLanguage: () =>
        p.text({
          message: "Enter your target language code",
          placeholder: "en, en-US, ru, es, pt-BR, etc.",
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return "Target language cannot be empty";
            }
            if (!isValidLangCode(value)) {
              return "Please enter a valid language code (en, en-US, ru, es, pt-BR, etc.)";
            }
          },
        }),
    },
    {
      onCancel: () => {
        p.cancel("Setup cancelled.");
        process.exit(0);
      },
    }
  );

  if (p.isCancel(settingsInputs)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const settings: Settings = {
    defaultSourceLanguage: settingsInputs.defaultSourceLanguage.trim(),
    defaultTargetLanguage: settingsInputs.defaultTargetLanguage.trim(),
    activeGlossary: undefined,
  };

  await saveSettings(settings);
  p.log.success("Settings saved successfully!");

  return settings;
}

async function manageSettings(currentSettings: Settings): Promise<Settings> {
  p.note(`Source language: ${currentSettings.defaultSourceLanguage}\n
Target language: ${currentSettings.defaultTargetLanguage}\n
Active glossary: ${
    currentSettings.activeGlossary?.split("/").pop() || "None"
  }`);

  const action = await p.select({
    message: "- Settings Menu -",
    options: [
      { value: "languages", label: "🌐 Change languages" },
      { value: "glossary", label: "📖 Manage glossaries" },
      { value: "back", label: "🏠 Back to main menu" },
    ],
  });

  if (p.isCancel(action)) {
    return currentSettings;
  }

  if (action === "languages") {
    return await promptForSettings();
  }

  if (action === "glossary") {
    return await manageGlossaries(currentSettings);
  }

  return currentSettings;
}

async function manageGlossaries(currentSettings: Settings): Promise<Settings> {
  const serviceAccount = await loadServiceAccount();

  const action = await p.select({
    message: "Glossary management",
    options: [
      { value: "list", label: "📗 Set active glossary" },
      { value: "upload", label: "📙 Upload new glossary" },
      { value: "delete", label: "📕 Delete glossary" },
      { value: "back", label: "🏠 Back to main menu" },
    ],
  });

  if (p.isCancel(action) || action === "back") {
    return currentSettings;
  }

  if (action === "list") {
    return await listAndSetActiveGlossary(currentSettings, serviceAccount);
  }

  if (action === "upload") {
    await uploadNewGlossary(serviceAccount, currentSettings);
    return currentSettings;
  }

  if (action === "delete") {
    return await deleteExistingGlossary(serviceAccount, currentSettings);
  }

  return currentSettings;
}

async function listAndSetActiveGlossary(
  currentSettings: Settings,
  serviceAccount: any
): Promise<Settings> {
  const spinner = p.spinner();
  spinner.start("Loading glossaries...");

  try {
    const glossaries = await listGlossaries(serviceAccount);
    spinner.stop("Glossaries loaded!");

    if (glossaries.length === 0) {
      p.log.warn("No glossaries found. Upload a glossary first.");

      // Clear active glossary if no glossaries exist
      if (currentSettings.activeGlossary) {
        const updatedSettings: Settings = {
          ...currentSettings,
          activeGlossary: undefined,
        };
        await saveSettings(updatedSettings);
        p.log.info("Active glossary has been cleared.");
        return updatedSettings;
      }

      return currentSettings;
    }

    const options = [
      { value: "none", label: "None (disable glossary)" },
      ...glossaries.map((g) => ({
        value: g.name,
        label: `${g.displayName} (${g.sourceLanguageCode} → ${g.targetLanguageCode}, ${g.entryCount} entries)`,
      })),
    ];

    const selectedGlossary = await p.select({
      message: "Select active glossary",
      options,
    });

    if (p.isCancel(selectedGlossary)) {
      return currentSettings;
    }

    const updatedSettings: Settings = {
      ...currentSettings,
      activeGlossary:
        selectedGlossary === "none" ? undefined : selectedGlossary,
    };

    await saveSettings(updatedSettings);
    p.log.success(
      `Active glossary ${selectedGlossary === "none" ? "disabled" : "updated"}!`
    );

    return updatedSettings;
  } catch (error) {
    spinner.stop("Failed to load glossaries");
    p.log.error(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return currentSettings;
  }
}

async function uploadNewGlossary(
  serviceAccount: any,
  currentSettings: Settings
): Promise<void> {
  const filePath = await p.text({
    message: "Enter path to glossary file (CSV or TSV)",
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "File path cannot be empty";
      }
      const ext = value.trim().toLowerCase();
      if (!ext.endsWith(".csv") && !ext.endsWith(".tsv")) {
        return "Only CSV and TSV files are supported";
      }
    },
  });

  if (p.isCancel(filePath)) {
    return;
  }

  // Check if file exists using Bun API after validation
  const file = Bun.file(filePath.trim());
  if (!(await file.exists())) {
    p.log.error("File does not exist");
    return;
  }

  const bucketSpinner = p.spinner();
  bucketSpinner.start("Loading buckets...");

  let bucketName: string;
  try {
    const buckets = await listBuckets(serviceAccount);
    bucketSpinner.stop("Buckets loaded!");

    if (buckets.length === 0) {
      p.log.error(
        "No buckets found in your Google Cloud project. Please create a bucket first."
      );
      return;
    }

    const selectedBucket = await p.select({
      message: "Select Google Storage bucket",
      options: buckets.map((bucket) => ({
        value: bucket,
        label: bucket,
      })),
    });

    if (p.isCancel(selectedBucket)) {
      return;
    }

    bucketName = selectedBucket;
  } catch (error) {
    bucketSpinner.stop("Failed to load buckets");
    p.log.error(
      `Error loading buckets: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );

    // Fallback to manual input
    const manualBucket = await p.text({
      message: "Enter Google Storage bucket name manually",
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return "Bucket name cannot be empty";
        }
      },
    });

    if (p.isCancel(manualBucket)) {
      return;
    }

    bucketName = manualBucket.trim();
  }

  const glossaryName = await p.text({
    message: "Enter glossary name",
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Glossary name cannot be empty";
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(value.trim())) {
        return "Glossary name can only contain letters, numbers, hyphens, and underscores";
      }
    },
  });

  if (p.isCancel(glossaryName)) {
    return;
  }

  // Use languages from settings
  const languages = {
    source: currentSettings.defaultSourceLanguage,
    target: currentSettings.defaultTargetLanguage,
  };

  p.log.info(
    `Using language pair from settings: ${languages.source} → ${languages.target}`
  );

  const spinner = p.spinner();
  spinner.start("Uploading glossary...");

  try {
    await uploadAndCreateGlossary(
      serviceAccount,
      filePath.trim(),
      bucketName,
      glossaryName.trim(),
      languages.source.trim(),
      languages.target.trim()
    );

    spinner.stop("Glossary uploaded successfully!");
    p.log.success(
      `Glossary "${glossaryName.trim()}" has been created and is ready to use.`
    );
  } catch (error) {
    spinner.stop("Upload failed");
    p.log.error(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function deleteExistingGlossary(
  serviceAccount: any,
  currentSettings: Settings
): Promise<Settings> {
  const spinner = p.spinner();
  spinner.start("Loading glossaries...");

  try {
    const glossaries = await listGlossaries(serviceAccount);
    spinner.stop("Glossaries loaded!");

    if (glossaries.length === 0) {
      p.log.warn("No glossaries found to delete.");

      // Clear active glossary if no glossaries exist
      if (currentSettings.activeGlossary) {
        const updatedSettings: Settings = {
          ...currentSettings,
          activeGlossary: undefined,
        };
        await saveSettings(updatedSettings);
        p.log.info("Active glossary has been cleared.");
        return updatedSettings;
      }

      return currentSettings;
    }

    const selectedGlossary = await p.select({
      message: "Select glossary to delete",
      options: glossaries.map((g) => ({
        value: g.name,
        label: `${g.displayName} (${g.sourceLanguageCode} → ${g.targetLanguageCode}, ${g.entryCount} entries)`,
      })),
    });

    if (p.isCancel(selectedGlossary)) {
      return currentSettings;
    }

    const confirm = await p.confirm({
      message:
        "Are you sure you want to delete this glossary? This action cannot be undone.",
      initialValue: false,
    });

    if (p.isCancel(confirm) || !confirm) {
      return currentSettings;
    }

    const deleteSpinner = p.spinner();
    deleteSpinner.start("Deleting glossary...");

    try {
      await deleteGlossary(serviceAccount, selectedGlossary);
      deleteSpinner.stop("Glossary deleted successfully!");
      p.log.success("Glossary has been deleted.");

      // Clear active glossary if the deleted one was active
      let updatedSettings = currentSettings;
      if (currentSettings.activeGlossary === selectedGlossary) {
        updatedSettings = {
          ...currentSettings,
          activeGlossary: undefined,
        };
        await saveSettings(updatedSettings);
        p.log.info("Active glossary has been cleared since it was deleted.");
      }

      return updatedSettings;
    } catch (error) {
      deleteSpinner.stop("Delete failed");
      p.log.error(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return currentSettings;
    }
  } catch (error) {
    spinner.stop("Failed to load glossaries");
    p.log.error(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return currentSettings;
  }
}

async function handleTextTranslation(
  serviceAccount: any,
  settings: Settings
): Promise<void> {
  const text = await p.text({
    message: "Enter the text to translate",
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Text cannot be empty";
      }
      if (value.trim().length > 20000) {
        return "Text is too long (max 20000 characters)";
      }
    },
  });

  if (p.isCancel(text)) {
    return;
  }

  let sourceLanguage = settings.defaultSourceLanguage;
  let targetLanguage = settings.defaultTargetLanguage;

  const spinner = p.spinner();
  spinner.start(
    `Translating from ${sourceLanguage} to ${targetLanguage}${
      settings.activeGlossary ? " (using glossary)" : ""
    }...`
  );

  try {
    const result = await translateText(
      serviceAccount,
      text.trim(),
      sourceLanguage,
      targetLanguage,
      settings.activeGlossary
    );

    spinner.stop("Translation completed!");

    p.log.success(`${result}\n`);

    // Post-translation options
    const nextAction = await p.select({
      message: "What would you like to do next?",
      options: [
        { value: "copy", label: "📋 Copy to clipboard and restart" },
        { value: "restart", label: "🔄 Restart translation" },
        { value: "menu", label: "🏠 Back to main menu" },
      ],
    });

    if (p.isCancel(nextAction)) {
      return;
    }

    if (nextAction === "copy") {
      try {
        clipboard.writeSync(result);
        p.log.success("Translation copied to clipboard!");

        // Start new translation
        await handleTextTranslation(serviceAccount, settings);
      } catch (error) {
        p.log.warn(
          "Could not copy to clipboard. Translation is displayed above for manual copying."
        );
        await handleTextTranslation(serviceAccount, settings);
      }
    } else if (nextAction === "restart") {
      // Recursively call for new translation
      await handleTextTranslation(serviceAccount, settings);
    }
    // If 'menu', just return to main menu (function ends)
  } catch (error) {
    spinner.stop("Translation failed!");
    p.log.error(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function handleFileTranslation(
  serviceAccount: any,
  settings: Settings
): Promise<void> {
  const filePath = await p.text({
    message: "Enter path to file (TXT or MD)",
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "File path cannot be empty";
      }
      const ext = value.trim().toLowerCase();
      if (!ext.endsWith(".txt") && !ext.endsWith(".md")) {
        return "Only TXT and MD files are supported";
      }
    },
  });

  if (p.isCancel(filePath)) {
    return;
  }

  // Check if file exists
  const file = Bun.file(filePath.trim());
  if (!(await file.exists())) {
    p.log.error("File does not exist");
    return;
  }

  const spinner = p.spinner();
  spinner.start("Reading file...");

  let translateSpinner: any = null;

  try {
    const text = await file.text();

    if (text.trim().length === 0) {
      spinner.stop("File is empty");
      p.log.error("File is empty");
      return;
    }

    if (text.length > 50000) {
      spinner.stop("File too large");
      p.log.error("File is too large (max 50,000 characters)");
      return;
    }

    spinner.stop("File read successfully!");

    translateSpinner = p.spinner();
    translateSpinner.start(
      `Translating from ${settings.defaultSourceLanguage} to ${
        settings.defaultTargetLanguage
      }${settings.activeGlossary ? " (using glossary)" : ""}...`
    );

    const result = await translateText(
      serviceAccount,
      text,
      settings.defaultSourceLanguage,
      settings.defaultTargetLanguage,
      settings.activeGlossary
    );

    // Generate output filename with target language suffix
    const inputPath = filePath.trim();
    const lastDotIndex = inputPath.lastIndexOf(".");
    const baseName = inputPath.substring(0, lastDotIndex);
    const extension = inputPath.substring(lastDotIndex);
    const outputPath = `${baseName}-${settings.defaultTargetLanguage}${extension}`;

    // Write translated content to new file
    await Bun.write(outputPath, result);

    translateSpinner.stop("Translation completed!");
    p.log.success(`File translated and saved as: ${outputPath}`);

    // Post-translation options
    const nextAction = await p.select({
      message: "What would you like to do next?",
      options: [
        { value: "restart", label: "📄 Translate another file" },
        { value: "menu", label: "🏠 Back to main menu" },
      ],
    });

    if (p.isCancel(nextAction)) {
      return;
    }

    if (nextAction === "restart") {
      await handleFileTranslation(serviceAccount, settings);
    }
  } catch (error) {
    // Stop the appropriate spinner based on where the error occurred
    if (translateSpinner) {
      translateSpinner.stop("Translation failed!");
    } else {
      spinner.stop("Operation failed!");
    }
    p.log.error(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function main() {
  let serviceAccount: any;

  try {
    serviceAccount = await loadServiceAccount();
  } catch (error) {
    p.log.error(
      error instanceof Error
        ? error.message
        : "Unknown error loading service account"
    );
    p.log.info("Please ensure service-account.json is present and valid.");
    process.exit(1);
  }

  // Load or initialize settings
  let settings: Settings;

  if (!(await settingsExist())) {
    p.intro("Google Translate Advanced - First Time Setup");
    settings = await promptForSettings();
  } else {
    const loadedSettings = await loadSettings();
    if (loadedSettings) {
      settings = loadedSettings;
    } else {
      p.log.warn("Settings file is corrupted. Let's set it up again.");
      settings = await promptForSettings();
    }
  }

  p.intro("🌐 Google Translate Advanced CLI");

  while (true) {
    const operation = await p.select({
      message: "- Main Menu -",
      options: [
        { value: "translation", label: "🌐 Translate text" },
        { value: "file", label: "📄 Translate file" },
        { value: "settings", label: "🔧 Settings" },
        { value: "exit", label: "🚪 Exit" },
      ],
    });

    if (p.isCancel(operation)) {
      p.cancel("Operation cancelled.");
      process.exit(0);
    }

    if (operation === "exit") {
      p.outro("Goodbye!");
      process.exit(0);
    }

    if (operation === "translation") {
      await handleTextTranslation(serviceAccount, settings);
    } else if (operation === "file") {
      await handleFileTranslation(serviceAccount, settings);
    } else if (operation === "settings") {
      settings = await manageSettings(settings);
    }
  }
}

main().catch((error) => {
  p.log.error("Unexpected error occurred");
  console.error(error);
  process.exit(1);
});
