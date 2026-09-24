# Limitations

Local AI Workbench V1.1 is an early local-first engineering foundation.
It should not be treated as a production multi-user AI platform.

## Local/single-user focus

V1.1 is designed primarily for a single user running the application on
a local computer.

It does not currently provide:

-   multi-user accounts
-   authentication
-   authorization
-   tenant isolation
-   centralized administration

## Development server

The application is intended to run locally.

Do not expose the FastAPI/Uvicorn development service directly to the
public internet without appropriate production deployment controls,
including authentication, secure networking, validation, rate limiting,
TLS/reverse proxy configuration, logging, and security review.

## Browser-side persistence

Conversation/UI state is browser-oriented in V1.1.

Consequences include:

-   clearing browser storage can remove saved state
-   state is not synchronized across browsers or computers
-   there is no authoritative server-side conversation database
-   browser storage should not be treated as durable enterprise
    persistence

## Local inference latency

Response speed depends heavily on model size and hardware. A blank chat area for some time after the first prompt does not necessarily indicate that Local AI Workbench has failed. Large models can experience substantial time-to-first-token during initial loading. If unusually long delays persist on subsequent prompts, verify model execution with ollama ps and test the model directly with `ollama run <model>`.

## No RAG yet

V1.1 does not yet contain a document knowledge base or
retrieval-augmented generation pipeline.

There is currently no:

-   document ingestion pipeline
-   chunking/indexing workflow
-   vector database
-   semantic retrieval
-   source citation framework

## No agent framework yet

The application does not yet provide a general agent orchestration
system.

There is no general-purpose:

-   tool registry
-   autonomous task loop
-   multi-agent coordination
-   approval workflow for consequential actions

## No fine-tuning workflow

V1.1 can use models installed in Ollama, but it does not provide an
integrated fine-tuning/QLoRA training pipeline.

## Model catalogue discovery is best-effort

The local Ollama API and Ollama's public website catalogue serve
different purposes.

V1.1's online catalogue discovery depends on public information whose
structure and metadata can change.

Therefore:

-   search behavior may need maintenance
-   some metadata may be unavailable
-   download/popularity data may change
-   variant fields are not guaranteed to be uniform
-   cloud/local classification should be treated conservatively when
    metadata is ambiguous

## Hardware variability

The Workbench can run on modest hardware, but useful model performance
depends on the selected model.

Disk download size is not the same as RAM or VRAM consumption.

Large models can:

-   exceed available memory
-   run slowly on CPU
-   require substantial SSD space
-   perform differently depending on quantization and context length

Users should verify model requirements before installation.

## Model quality and safety

Open-source/local models can:

-   hallucinate
-   produce incorrect facts
-   generate insecure or broken code
-   misunderstand instructions
-   produce biased or inappropriate content
-   fail to follow system prompts

Model output should be validated before being used for consequential
decisions.

## Internet requirements

Installed local models can be used for local inference, but internet
access may still be required for:

-   public catalogue search
-   downloading models
-   future external APIs/tools
-   future online RAG sources

Adding an external integration changes the privacy boundary and should
be reviewed separately.

## No guarantee of privacy from architecture alone

"Local-first" does not mean every future workflow is automatically
private.

Privacy depends on which components are used. A future web-search tool,
cloud API, telemetry service, or remote vector store could transmit data
outside the machine.

## Platform coverage

The current development and usage workflow is primarily tested on
Windows.

Other operating systems may work with adjustments, but V1.1
documentation does not claim complete cross-platform validation.

## API stability

V1.1 is under active development. Internal endpoints, service
interfaces, frontend state formats, and folder structure can change in
future versions.

## Not a replacement for Ollama documentation

The Workbench is an independent interface built around Ollama. For
Ollama runtime behavior, model licensing, model tags, hardware
considerations, and command semantics, consult the relevant official
project/model documentation.

## Roadmap boundaries

RAG, agents, tools, evaluation, alternative providers, and fine-tuning
are planned directions. They should not be represented as functionality
already delivered in V1.1.
