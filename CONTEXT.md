# Elog

Elog syncs documents from writing platforms through optional transforms into deploy targets. This glossary names the shared document concepts that plugins use to coordinate without knowing each other's internals.

## Language

**Document Body**:
The current deployable text content carried by a document as it moves through source, transform, and deploy plugins.
_Avoid_: Raw body, source body

**Body Type**:
The format that the current Document Body is already in, such as Markdown, HTML, or Confluence wiki markup. A missing Body Type is always interpreted as Markdown, and the term does not describe the deploy target's desired output format.
_Avoid_: Output format, target format, wiki, rowType, rawType

**Raw Body**:
The optional source text preserved for platforms that store both rendered deploy content and editable source content.
_Avoid_: Document Body, body_html

**Body Transform**:
A transform plugin that changes the Document Body from one Body Type to another, updates the Body Type, and may preserve the previous Document Body as Raw Body.
_Avoid_: Adapter, formatExt, target formatter

**Plugin SDK**:
The plugin authoring package that re-exports Plugin Contracts and provides source, transform, and target plugins with optional helpers and utilities.
_Avoid_: Plugin API, plugin kit, shared

**Plugin Contracts**:
The shared definitions of documents, plugin lifecycles, and host capabilities implemented by Core and consumed by plugins. Core and Plugin SDK depend on this package independently; helper implementations and their configuration types belong to Plugin SDK.
_Avoid_: SDK implementation, runtime utilities

**Core**:
The public package that owns Elog workflow execution, configuration resolution, cache coordination, and programmatic sync without any CLI command behavior.
_Avoid_: CLI, runtime package, engine
