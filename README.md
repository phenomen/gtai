# Google Translate AI CLI

A CLI interface for **Google Translate LLM** using the [Advanced Translation V3 API](https://cloud.google.com/translate/docs/advanced/translate-text-advance) with support for custom glossaries and file translation.

## Features

- 🌐 LLM-powered text translation with language pairs
- 📚 Custom glossary support for domain-specific translations
- ⚙️ Persistent settings
- 📄 File translation (TXT and MD files; PDF soon)

## Setup

### 1. Bun Runtime

[Install Bun](https://bun.sh/). The CLI uses Bun API and does not support Node runtime.

### 2. Google Cloud Project

- Create a Project on [Google Cloud](https://cloud.google.com).
- Enable Billing.
- Enable Cloud Translation API and Cloud Storage (APIs & Services -> Library).

### 3. Service Account

- Create a service account (IAM & Admin -> Service Accounts -> Create service account).
- Add roles: Cloud Translation API Editor (`roles/cloudtranslate.editor`) and Storage Admin (`roles/storage.admin`).

### 4. Get Auth Key

- Click on your Service Account and open Keys tab.
- Add key -> Create new key -> JSON.
- Download the JSON key file as `service-account.json`.
- Place your service account key in your working directory (where you launch `gtai`).

## Usage

```bash
bunx gtai
```
