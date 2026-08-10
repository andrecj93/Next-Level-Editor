/**
 * Prism plus the grammars the code-block modal offers, isolated in ONE module
 * so it can be a lazily-loaded chunk.
 *
 * These imports used to sit directly in CodeBlockModal.vue, which
 * ModalsContainer renders unconditionally — so Prism's core and all 21
 * language grammars were pulled into the library's EAGER bundle. Every
 * consumer paid for syntax highlighting on first paint, including the ones
 * who never insert a code block. The modal now imports this module
 * dynamically, the first time it opens.
 *
 * The static imports (and their order — markup-templating must register
 * before the templating languages that extend it) are preserved exactly as
 * they were; only the moment the chunk is fetched has changed.
 */
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";

// Required by PHP and the other template languages below.
import "prismjs/components/prism-markup-templating";

import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-php";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-bash";

/**
 * Highlight `code` as `language`, falling back to the plaintext grammar for a
 * language Prism does not know. Returns Prism's HTML, which is escaped.
 * Throwing is left to the caller to handle — the caller renders through
 * `v-html` and must escape anything that is not this function's output.
 */
export function highlight(code: string, language: string): string {
  const grammar = Prism.languages[language] || Prism.languages.plaintext;
  return Prism.highlight(code, grammar, language);
}
