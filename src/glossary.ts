import { Storage } from "@google-cloud/storage";
import { TranslationServiceClient } from "@google-cloud/translate";
import * as path from "path";
import * as fs from "fs";

export interface GlossaryInfo {
  name: string;
  displayName: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  entryCount: number;
}

export async function listBuckets(serviceAccount: any): Promise<string[]> {
  const storage = new Storage({
    credentials: serviceAccount,
    projectId: serviceAccount.project_id,
  });

  try {
    const [buckets] = await storage.getBuckets();
    return buckets.map((bucket) => bucket.name);
  } catch (error) {
    throw new Error(
      `Failed to list buckets: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function uploadGlossaryFile(
  serviceAccount: any,
  filePath: string,
  bucketName: string
): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileName = path.basename(filePath);
  const fileExtension = path.extname(fileName).toLowerCase();

  if (![".csv", ".tsv"].includes(fileExtension)) {
    throw new Error("Only CSV and TSV files are supported for glossaries");
  }

  const storage = new Storage({
    credentials: serviceAccount,
    projectId: serviceAccount.project_id,
  });

  const bucket = storage.bucket(bucketName);
  const storageFile = bucket.file(`glossaries/${fileName}`);

  try {
    const fileBuffer = fs.readFileSync(filePath);
    await storageFile.save(fileBuffer, {
      metadata: {
        contentType:
          fileExtension === ".csv" ? "text/csv" : "text/tab-separated-values",
      },
    });

    return `gs://${bucketName}/glossaries/${fileName}`;
  } catch (error) {
    // Google Cloud API errors often have complex structure, so capture full details
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === "object") {
      // Handle Google Cloud API error structure
      if ("message" in error && typeof error.message === "string") {
        errorMessage = error.message;
      } else if ("details" in error && typeof error.details === "string") {
        errorMessage = error.details;
      } else if (
        "code" in error &&
        "message" in error &&
        typeof error.code === "string" &&
        typeof error.message === "string"
      ) {
        errorMessage = `${error.code}: ${error.message}`;
      } else {
        // Fallback: stringify the entire error object
        errorMessage = JSON.stringify(error, null, 2);
      }
    }
    throw new Error(`Failed to upload file to Google Storage: ${errorMessage}`);
  }
}

export async function createGlossary(
  serviceAccount: any,
  glossaryName: string,
  sourceLanguage: string,
  targetLanguage: string,
  inputUri: string
): Promise<string> {
  const translationClient = new TranslationServiceClient({
    credentials: serviceAccount,
  });

  const parent = `projects/${serviceAccount.project_id}/locations/us-central1`;
  const glossaryPath = `${parent}/glossaries/${glossaryName}`;

  const request = {
    parent: parent,
    glossary: {
      name: glossaryPath,
      languagePair: {
        sourceLanguageCode: sourceLanguage,
        targetLanguageCode: targetLanguage,
      },
      inputConfig: {
        gcsSource: {
          inputUri: inputUri,
        },
      },
    },
  };

  try {
    const [operation] = await translationClient.createGlossary(request);
    await operation.promise();
    return glossaryPath;
  } catch (error) {
    // Google Cloud API errors often have complex structure, so capture full details
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === "object") {
      // Handle Google Cloud API error structure
      if ("message" in error && typeof error.message === "string") {
        errorMessage = error.message;
      } else if ("details" in error && typeof error.details === "string") {
        errorMessage = error.details;
      } else if (
        "code" in error &&
        "message" in error &&
        typeof error.code === "string" &&
        typeof error.message === "string"
      ) {
        errorMessage = `${error.code}: ${error.message}`;
      } else {
        // Fallback: stringify the entire error object
        errorMessage = JSON.stringify(error, null, 2);
      }
    }
    throw new Error(`Failed to create glossary: ${errorMessage}`);
  }
}

export async function listGlossaries(
  serviceAccount: any
): Promise<GlossaryInfo[]> {
  const translationClient = new TranslationServiceClient({
    credentials: serviceAccount,
  });

  const parent = `projects/${serviceAccount.project_id}/locations/us-central1`;

  try {
    const [glossaries] = await translationClient.listGlossaries({
      parent: parent,
    });

    return glossaries.map((glossary) => ({
      name: glossary.name || "",
      displayName: glossary.displayName || path.basename(glossary.name || ""),
      sourceLanguageCode: glossary.languagePair?.sourceLanguageCode || "",
      targetLanguageCode: glossary.languagePair?.targetLanguageCode || "",
      entryCount: glossary.entryCount || 0,
    }));
  } catch (error) {
    // Google Cloud API errors often have complex structure, so capture full details
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === "object") {
      // Handle Google Cloud API error structure
      if ("message" in error && typeof error.message === "string") {
        errorMessage = error.message;
      } else if ("details" in error && typeof error.details === "string") {
        errorMessage = error.details;
      } else if (
        "code" in error &&
        "message" in error &&
        typeof error.code === "string" &&
        typeof error.message === "string"
      ) {
        errorMessage = `${error.code}: ${error.message}`;
      } else {
        // Fallback: stringify the entire error object
        errorMessage = JSON.stringify(error, null, 2);
      }
    }
    throw new Error(`Failed to list glossaries: ${errorMessage}`);
  }
}

export async function deleteGlossary(
  serviceAccount: any,
  glossaryName: string
): Promise<void> {
  const translationClient = new TranslationServiceClient({
    credentials: serviceAccount,
  });

  try {
    const [operation] = await translationClient.deleteGlossary({
      name: glossaryName,
    });
    await operation.promise();
  } catch (error) {
    // Google Cloud API errors often have complex structure, so capture full details
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === "object") {
      // Handle Google Cloud API error structure
      if ("message" in error && typeof error.message === "string") {
        errorMessage = error.message;
      } else if ("details" in error && typeof error.details === "string") {
        errorMessage = error.details;
      } else if (
        "code" in error &&
        "message" in error &&
        typeof error.code === "string" &&
        typeof error.message === "string"
      ) {
        errorMessage = `${error.code}: ${error.message}`;
      } else {
        // Fallback: stringify the entire error object
        errorMessage = JSON.stringify(error, null, 2);
      }
    }
    throw new Error(`Failed to delete glossary: ${errorMessage}`);
  }
}

export async function uploadAndCreateGlossary(
  serviceAccount: any,
  filePath: string,
  bucketName: string,
  glossaryName: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  // Upload file to Google Storage
  const inputUri = await uploadGlossaryFile(
    serviceAccount,
    filePath,
    bucketName
  );

  // Create glossary in Google Translate
  const glossaryPath = await createGlossary(
    serviceAccount,
    glossaryName,
    sourceLanguage,
    targetLanguage,
    inputUri
  );

  return glossaryPath;
}
