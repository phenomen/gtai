# Google Translate AI CLI

A CLI interface for **Google Translate LLM** using the [Advanced Translation V3 API](https://cloud.google.com/translate/docs/advanced/translate-text-advance) with support for custom glossaries and file translation.

## Features

- 🌐 LLM-powered text translation with language pairs
- 📚 Custom glossary support for domain-specific translations
- ⚙️ Persistent settings
- 📄 File translation (TXT and MD files; PDF support coming soon)

## Setup

### 1. Bun Runtime

[Install Bun](https://bun.sh/). The CLI uses the Bun API and does not support Node.js runtime.

### 2. Google Cloud Project

- Create a project on [Google Cloud](https://cloud.google.com).
- Enable billing for your project.
- Enable the Cloud Translation API and Cloud Storage API (APIs & Services → Library).

### 3. Google Cloud Storage Bucket

(Optional) The Google Translation API requires glossaries to be uploaded to Google Cloud Storage. If you intend to use glossaries, you need to create a storage bucket.

- Navigate to Cloud Storage → Buckets → Create bucket (default settings are fine).

### 4. Service Account

- Create a service account (IAM & Admin → Service Accounts → Create service account).
- Add the following roles: Cloud Translation API Editor (`roles/cloudtranslate.editor`) and Storage Admin (`roles/storage.admin`).

### 5. Authentication Key

- Click on your service account and open the Keys tab.
- Add key → Create new key → JSON.
- Download the JSON key file and save it as `service-account.json`.
- Place your service account key in your working directory (where you launch `gtai`).

## Usage

```bash
bunx gtai@latest
```

Follow the interactive prompts to configure your translation settings and start translating.
