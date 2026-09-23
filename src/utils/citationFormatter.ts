import type { CitationFormatter } from "../types/document";
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const initials = (given: string) =>
  given
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part
        .split("-")
        .map((name) => Array.from(name)[0]?.toUpperCase() + ".")
        .join("-"),
    )
    .join(" ");
function people(author: string) {
  return author
    .split(";")
    .map((name) => {
      const [family, ...given] = name
        .trim()
        .split(",")
        .map((part) => part.trim());
      return {
        short: family,
        full: given.length ? family + ", " + initials(given.join(" ")) : family,
      };
    })
    .filter((person) => person.short);
}
function joinAuthors(names: string[]) {
  if (names.length < 2) return names[0] ?? "";
  return (
    names.slice(0, -1).join(", ") +
    (names.length > 2 ? ", & " : " & ") +
    names[names.length - 1]
  );
}
function suffix(index: number): string {
  return (
    (index >= 26 ? suffix(Math.floor(index / 26) - 1) : "") +
    String.fromCharCode(97 + (index % 26))
  );
}
/**
 * Local APA author-date formatting for authored books and webpages with a year
 * or n.d., named people/organizations and page locators. Hosts can supply
 * CitationFormatter for edited works, full dates, editions and other styles.
 * No CSL processor, source lookup, dynamic code or network request is bundled.
 */
export async function loadCitationFormatter(): Promise<CitationFormatter> {
  return {
    format(sources, language) {
      const collator = new Intl.Collator(
        language.startsWith("pt") ? "pt-PT" : "en",
      );
      const records = sources
        .map((source) => {
          const names = people(source.author);
          const short =
            names.length > 2
              ? names[0].short + " et al."
              : joinAuthors(names.map((p) => p.short));
          const full =
            names.length > 20
              ? names
                  .slice(0, 19)
                  .map((p) => p.full)
                  .join(", ") +
                ", … " +
                names[names.length - 1].full
              : joinAuthors(names.map((p) => p.full));
          return {
            source,
            names,
            short,
            full,
            year: /^\d{4}$/.test(source.year) ? source.year : "n.d.",
          };
        })
        .sort(
          (a, b) =>
            collator.compare(a.full, b.full) ||
            collator.compare(a.year, b.year) ||
            collator.compare(a.source.title, b.source.title),
        );
      for (const record of records) {
        const group = records.filter(
          (other) =>
            other.short === record.short &&
            other.source.year === record.source.year,
        );
        if (group.length > 1) record.year += suffix(group.indexOf(record));
      }
      return {
        citation(id, locator) {
          const record = records.find((entry) => entry.source.id === id);
          if (!record) return "[Missing source]";
          const page = locator
            ? ", " + (/[-–,]/.test(locator) ? "pp. " : "p. ") + locator
            : "";
          return "(" + record.short + ", " + record.year + page + ")";
        },
        bibliography: records.map(({ source, names, full, year }) => {
          const publisher =
            source.publisher &&
            !(
              source.type === "webpage" &&
              names.length === 1 &&
              source.publisher === names[0].full
            )
              ? " " + escape(source.publisher) + "."
              : "";
          const link =
            source.url && /^https?:\/\//i.test(source.url)
              ? ' <a href="' +
                escape(source.url) +
                '">' +
                escape(source.url) +
                "</a>"
              : "";
          return {
            id: source.id,
            html:
              escape(full) +
              (full.endsWith(".") ? "" : ".") +
              " (" +
              year +
              "). <i>" +
              escape(source.title) +
              "</i>." +
              publisher +
              link,
          };
        }),
      };
    },
  };
}
