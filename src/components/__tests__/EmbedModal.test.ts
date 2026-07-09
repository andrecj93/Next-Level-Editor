import { describe, it, expect, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import EmbedModal from "../EmbedModal.vue";
import * as embed from "../../utils/embed";

// Real, well-formed sample URLs (11-char YouTube ids / numeric Vimeo ids)
const YT_WATCH = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const YT_SHORT = "https://youtu.be/dQw4w9WgXcQ";
const YT_EMBED = "https://www.youtube.com/embed/dQw4w9WgXcQ";
const VIMEO = "https://vimeo.com/123456789";
const VIMEO_PLAYER = "https://player.vimeo.com/video/123456789";

// EmbedModal does NOT use <Teleport>; it is a plain `v-if` overlay, so a plain
// (detached) mount + wrapper queries reach all content, and events still bubble
// (overlay click / @click.stop) within the detached tree. We deliberately do
// NOT use attachTo: document.body — attaching connects the real <iframe> preview
// to the document, which makes happy-dom fire live network fetches to
// YouTube/Vimeo that abort on unmount and pollute the output. Detached = quiet.
const openModal = () =>
  mount(EmbedModal, { props: { isOpen: true } });

const setUrl = async (w: ReturnType<typeof openModal>, value: string) => {
  await w.get("#video-url").setValue(value);
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EmbedModal", () => {
  describe("open / closed rendering", () => {
    it("renders nothing when isOpen is false", () => {
      const w = mount(EmbedModal, { props: { isOpen: false } });
      expect(w.find(".modal-overlay").exists()).toBe(false);
      expect(w.find(".modal-content").exists()).toBe(false);
    });

    it("renders the dialog, heading and URL field when open", () => {
      const w = openModal();
      expect(w.find(".modal-content").exists()).toBe(true);
      const dialog = w.get('[role="dialog"]');
      expect(dialog.attributes("aria-modal")).toBe("true");
      expect(dialog.attributes("aria-labelledby")).toBe("modal-title");
      expect(w.get("#modal-title").text()).toBe("Embed Media");
      expect(w.find("#video-url").exists()).toBe(true);
      w.unmount();
    });

    it("lists the supported services as badges", () => {
      const w = openModal();
      const badges = w.findAll(".service-badge").map((b) => b.text());
      expect(badges).toEqual(["YouTube", "Vimeo"]);
      w.unmount();
    });
  });

  describe("examples helper (v-if=\"!videoUrl\")", () => {
    it("shows examples while the input is empty", () => {
      const w = openModal();
      expect(w.find(".examples").exists()).toBe(true);
      expect(w.find(".preview-section").exists()).toBe(false);
      expect(w.find(".error-message").exists()).toBe(false);
      w.unmount();
    });

    it("hides examples as soon as the input has any text", async () => {
      const w = openModal();
      await setUrl(w, "x");
      expect(w.find(".examples").exists()).toBe(false);
      w.unmount();
    });
  });

  describe("insert button disabled state", () => {
    it("is disabled with no/invalid URL and enabled once a valid URL is entered", async () => {
      const w = openModal();
      const btn = () => w.get(".insert-button").element as HTMLButtonElement;
      expect(btn().disabled).toBe(true);

      await setUrl(w, "not-a-video");
      expect(btn().disabled).toBe(true);

      await setUrl(w, YT_WATCH);
      expect(btn().disabled).toBe(false);
      w.unmount();
    });
  });

  describe("URL validation + preview", () => {
    it.each([
      ["youtube watch", YT_WATCH, "https://www.youtube.com/embed/dQw4w9WgXcQ"],
      ["youtu.be short", YT_SHORT, "https://www.youtube.com/embed/dQw4w9WgXcQ"],
      ["youtube embed", YT_EMBED, "https://www.youtube.com/embed/dQw4w9WgXcQ"],
      ["vimeo", VIMEO, "https://player.vimeo.com/video/123456789"],
      ["vimeo player", VIMEO_PLAYER, "https://player.vimeo.com/video/123456789"],
    ])("renders a live preview for a %s URL", async (_label, url, expectedSrc) => {
      const w = openModal();
      await setUrl(w, url);

      const preview = w.find(".preview-section");
      expect(preview.exists()).toBe(true);
      const container = w.get(".preview-container");
      expect(container.html()).toContain(expectedSrc);
      expect(container.html()).toContain('class="video-embed"');
      // no error while valid
      expect(w.find(".error-message").exists()).toBe(false);
      w.unmount();
    });

    it("shows a validation error and no preview for an unrecognised URL", async () => {
      const w = openModal();
      await setUrl(w, "https://example.com/not-a-video");

      const err = w.find(".error-message");
      expect(err.exists()).toBe(true);
      expect(err.text()).toContain(
        "Please enter a valid YouTube or Vimeo URL"
      );
      expect(w.find(".preview-section").exists()).toBe(false);
      expect(
        (w.get(".insert-button").element as HTMLButtonElement).disabled
      ).toBe(true);
      w.unmount();
    });

    it("rejects a YouTube URL whose id is too short (must be 11 chars)", async () => {
      const w = openModal();
      await setUrl(w, "https://www.youtube.com/watch?v=short");
      expect(w.find(".error-message").exists()).toBe(true);
      expect(w.find(".preview-section").exists()).toBe(false);
      w.unmount();
    });

    it("treats a whitespace-only URL as empty (type=url sanitises it): no preview, no error", async () => {
      const w = openModal();
      await setUrl(w, "   ");
      // <input type="url"> applies the URL value-sanitisation algorithm and
      // strips the whitespace to "", so this collapses to the empty-field path.
      expect((w.get("#video-url").element as HTMLInputElement).value).toBe("");
      expect(w.find(".preview-section").exists()).toBe(false);
      expect(w.find(".error-message").exists()).toBe(false);
      expect(w.find(".examples").exists()).toBe(true);
      w.unmount();
    });

    it("clears the preview + error when the field is emptied again", async () => {
      const w = openModal();
      await setUrl(w, YT_WATCH);
      expect(w.find(".preview-section").exists()).toBe(true);

      await setUrl(w, "");
      expect(w.find(".preview-section").exists()).toBe(false);
      expect(w.find(".error-message").exists()).toBe(false);
      // examples reappear on an empty field
      expect(w.find(".examples").exists()).toBe(true);
      w.unmount();
    });

    it("swaps error->preview when a URL is corrected, and preview->error when broken", async () => {
      const w = openModal();

      await setUrl(w, "https://bad.example");
      expect(w.find(".error-message").exists()).toBe(true);
      expect(w.find(".preview-section").exists()).toBe(false);

      await setUrl(w, VIMEO);
      expect(w.find(".error-message").exists()).toBe(false);
      expect(w.find(".preview-section").exists()).toBe(true);

      await setUrl(w, "https://bad.example/again");
      expect(w.find(".error-message").exists()).toBe(true);
      expect(w.find(".preview-section").exists()).toBe(false);
      w.unmount();
    });

    it("surfaces the defensive 'Failed to generate embed code' branch when embed HTML is unexpectedly null", async () => {
      // isEmbeddableVideo passes but getVideoEmbedHtml returns null — a guarded
      // branch that is otherwise unreachable via real inputs. Stub both APIs so
      // the component takes the failure path.
      vi.spyOn(embed, "isEmbeddableVideo").mockReturnValue(true);
      vi.spyOn(embed, "getVideoEmbedHtml").mockReturnValue(null);

      const w = openModal();
      await setUrl(w, "anything");
      const err = w.find(".error-message");
      expect(err.exists()).toBe(true);
      expect(err.text()).toContain("Failed to generate embed code");
      expect(w.find(".preview-section").exists()).toBe(false);
      w.unmount();
    });
  });

  describe("inserting", () => {
    it("emits insert with the generated embed HTML on Insert click", async () => {
      const w = openModal();
      await setUrl(w, YT_WATCH);
      await w.get(".insert-button").trigger("click");

      const inserted = w.emitted("insert");
      expect(inserted).toBeTruthy();
      expect(inserted!).toHaveLength(1);
      expect(inserted![0][0]).toContain(
        "https://www.youtube.com/embed/dQw4w9WgXcQ"
      );
      w.unmount();
    });

    it("emits insert on Enter in the URL field for a valid URL", async () => {
      const w = openModal();
      await setUrl(w, VIMEO);
      await w.get("#video-url").trigger("keyup", { key: "Enter" });

      const inserted = w.emitted("insert");
      expect(inserted).toBeTruthy();
      expect(inserted![0][0]).toContain(
        "https://player.vimeo.com/video/123456789"
      );
      w.unmount();
    });

    it("does not emit insert (and does not throw) when there is no valid preview", async () => {
      const w = openModal();
      // invalid URL -> no preview
      await setUrl(w, "https://nope.example");
      await w.get(".insert-button").trigger("click");
      await w.get("#video-url").trigger("keyup", { key: "Enter" });
      expect(w.emitted("insert")).toBeUndefined();
      w.unmount();
    });

    it("resets the form after a successful insert (input clears, examples return)", async () => {
      const w = openModal();
      await setUrl(w, YT_WATCH);
      expect(w.find(".preview-section").exists()).toBe(true);

      await w.get(".insert-button").trigger("click");

      expect((w.get("#video-url").element as HTMLInputElement).value).toBe("");
      expect(w.find(".preview-section").exists()).toBe(false);
      expect(w.find(".examples").exists()).toBe(true);
      // insert fired exactly once — the reset must not re-emit
      expect(w.emitted("insert")!).toHaveLength(1);
      w.unmount();
    });
  });

  describe("closing", () => {
    it("emits close from the Cancel button", async () => {
      const w = openModal();
      await w.get(".cancel-button").trigger("click");
      expect(w.emitted("close")).toBeTruthy();
      w.unmount();
    });

    it("emits close from the ✕ header button", async () => {
      const w = openModal();
      await w.get(".close-button").trigger("click");
      expect(w.emitted("close")).toBeTruthy();
      w.unmount();
    });

    it("emits close when the overlay backdrop is clicked", async () => {
      const w = openModal();
      await w.get(".modal-overlay").trigger("click");
      expect(w.emitted("close")).toBeTruthy();
      w.unmount();
    });

    it("does NOT close when the dialog body itself is clicked (@click.stop)", async () => {
      const w = openModal();
      await w.get(".modal-content").trigger("click");
      expect(w.emitted("close")).toBeUndefined();
      w.unmount();
    });
  });

  describe("reset on reopen", () => {
    it("clears a dirty field/preview/error each time the modal re-opens", async () => {
      const w = mount(EmbedModal, { props: { isOpen: true } });

      // Dirty it with a valid URL (preview visible)
      await setUrl(w, YT_WATCH);
      expect(w.find(".preview-section").exists()).toBe(true);

      await w.setProps({ isOpen: false });
      await w.setProps({ isOpen: true });

      expect((w.get("#video-url").element as HTMLInputElement).value).toBe("");
      expect(w.find(".preview-section").exists()).toBe(false);
      expect(w.find(".error-message").exists()).toBe(false);
      expect(w.find(".examples").exists()).toBe(true);
      w.unmount();
    });

    it("also clears a lingering error state on reopen", async () => {
      const w = mount(EmbedModal, { props: { isOpen: true } });
      await setUrl(w, "https://bad.example");
      expect(w.find(".error-message").exists()).toBe(true);

      await w.setProps({ isOpen: false });
      await w.setProps({ isOpen: true });
      expect(w.find(".error-message").exists()).toBe(false);
      w.unmount();
    });
  });
});
