import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { useTemplateManager } from "../useTemplateManager";

describe("useTemplateManager", () => {
  let editorContent: any;
  let captureSnapshot: any;
  let templateManager: ReturnType<typeof useTemplateManager>;

  beforeEach(() => {
    editorContent = ref(document.createElement("div"));
    editorContent.value.innerHTML = "<p>Initial content</p>";
    captureSnapshot = vi.fn();

    templateManager = useTemplateManager({
      editorContent,
      captureSnapshot,
    });
  });

  describe("handleSelectTemplate", () => {
    it("should apply template content to editor", () => {
      const template = {
        content: "<h1>New Template</h1><p>Template body</p>",
        name: "Test Template",
        description: "A test template",
      };

      templateManager.handleSelectTemplate(template);

      expect(editorContent.value.innerHTML).toBe(
        "<h1>New Template</h1><p>Template body</p>"
      );
    });

    it("should call captureSnapshot after applying template", () => {
      const template = {
        content: "<div>Content</div>",
      };

      templateManager.handleSelectTemplate(template);

      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should do nothing if editorContent is null", () => {
      editorContent.value = null;
      const template = {
        content: "<h1>Should not apply</h1>",
      };

      templateManager.handleSelectTemplate(template);

      expect(captureSnapshot).not.toHaveBeenCalled();
    });

    it("should handle template with only content (no name/description)", () => {
      const template = {
        content: "<p>Simple template</p>",
      };

      templateManager.handleSelectTemplate(template);

      expect(editorContent.value.innerHTML).toBe("<p>Simple template</p>");
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should handle empty content template", () => {
      const template = {
        content: "",
      };

      templateManager.handleSelectTemplate(template);

      expect(editorContent.value.innerHTML).toBe("");
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should replace existing content completely", () => {
      editorContent.value.innerHTML = "<h1>Old</h1><p>Content</p>";

      const template = {
        content: "<span>New</span>",
      };

      templateManager.handleSelectTemplate(template);

      expect(editorContent.value.innerHTML).toBe("<span>New</span>");
    });

    it("should handle complex HTML structures", () => {
      const template = {
        content:
          '<div class="container"><header><h1>Title</h1></header><main><p>Body</p></main></div>',
      };

      templateManager.handleSelectTemplate(template);

      expect(editorContent.value.innerHTML).toBe(template.content);
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  describe("getCurrentAsTemplate", () => {
    it("should return current editor content as template", () => {
      editorContent.value.innerHTML = "<h2>Current Content</h2>";

      const result = templateManager.getCurrentAsTemplate();

      expect(result).toEqual({
        content: "<h2>Current Content</h2>",
      });
    });

    it("should return null if editorContent is null", () => {
      editorContent.value = null;

      const result = templateManager.getCurrentAsTemplate();

      expect(result).toBeNull();
    });

    it("should handle empty editor content", () => {
      editorContent.value.innerHTML = "";

      const result = templateManager.getCurrentAsTemplate();

      expect(result).toEqual({
        content: "",
      });
    });

    it("should capture exact HTML including whitespace", () => {
      editorContent.value.innerHTML = "<p>  Text with   spaces  </p>";

      const result = templateManager.getCurrentAsTemplate();

      expect(result).toEqual({
        content: "<p>  Text with   spaces  </p>",
      });
    });

    it("should handle complex nested structures", () => {
      const complexHTML =
        "<div><ul><li>Item 1</li><li>Item 2</li></ul><table><tbody><tr><td>Cell</td></tr></tbody></table></div>";
      editorContent.value.innerHTML = complexHTML;

      const result = templateManager.getCurrentAsTemplate();

      expect(result).toEqual({
        content: complexHTML,
      });
    });

    it("should not modify editor content", () => {
      const originalContent = "<p>Original</p>";
      editorContent.value.innerHTML = originalContent;

      templateManager.getCurrentAsTemplate();

      expect(editorContent.value.innerHTML).toBe(originalContent);
    });
  });

  describe("applyBlankTemplate", () => {
    it("should clear editor content", () => {
      editorContent.value.innerHTML =
        "<h1>Content to clear</h1><p>More content</p>";

      templateManager.applyBlankTemplate();

      expect(editorContent.value.innerHTML).toBe("");
    });

    it("should call captureSnapshot after clearing", () => {
      templateManager.applyBlankTemplate();

      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should do nothing if editorContent is null", () => {
      editorContent.value = null;

      templateManager.applyBlankTemplate();

      expect(captureSnapshot).not.toHaveBeenCalled();
    });

    it("should handle already empty editor", () => {
      editorContent.value.innerHTML = "";

      templateManager.applyBlankTemplate();

      expect(editorContent.value.innerHTML).toBe("");
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should clear complex nested structures", () => {
      editorContent.value.innerHTML =
        "<div><div><div><p>Nested</p></div></div></div>";

      templateManager.applyBlankTemplate();

      expect(editorContent.value.innerHTML).toBe("");
    });
  });

  describe("Integration Tests", () => {
    it("should allow switching between templates", () => {
      const template1 = { content: "<h1>Template 1</h1>" };
      const template2 = { content: "<h2>Template 2</h2>" };

      templateManager.handleSelectTemplate(template1);
      expect(editorContent.value.innerHTML).toBe("<h1>Template 1</h1>");

      templateManager.handleSelectTemplate(template2);
      expect(editorContent.value.innerHTML).toBe("<h2>Template 2</h2>");

      expect(captureSnapshot).toHaveBeenCalledTimes(2);
    });

    it("should save current content and reapply it", () => {
      const originalContent = "<p>Save me</p>";
      editorContent.value.innerHTML = originalContent;

      const savedTemplate = templateManager.getCurrentAsTemplate();

      // Change content
      editorContent.value.innerHTML = "<p>Changed</p>";

      // Reapply saved template
      if (savedTemplate) {
        templateManager.handleSelectTemplate(savedTemplate);
      }

      expect(editorContent.value.innerHTML).toBe(originalContent);
    });

    it("should apply blank then template", () => {
      editorContent.value.innerHTML = "<p>Initial</p>";

      templateManager.applyBlankTemplate();
      expect(editorContent.value.innerHTML).toBe("");

      const template = { content: "<h1>New</h1>" };
      templateManager.handleSelectTemplate(template);
      expect(editorContent.value.innerHTML).toBe("<h1>New</h1>");

      expect(captureSnapshot).toHaveBeenCalledTimes(2);
    });

    it("should handle rapid template changes", () => {
      const templates = [
        { content: "<p>T1</p>" },
        { content: "<p>T2</p>" },
        { content: "<p>T3</p>" },
        { content: "<p>T4</p>" },
      ];

      templates.forEach((template) => {
        templateManager.handleSelectTemplate(template);
      });

      expect(editorContent.value.innerHTML).toBe("<p>T4</p>");
      expect(captureSnapshot).toHaveBeenCalledTimes(4);
    });
  });

  describe("Edge Cases", () => {
    it("should handle template with special characters", () => {
      const template = {
        content: '<p>&lt;script&gt;alert("test")&lt;/script&gt;</p>',
      };

      templateManager.handleSelectTemplate(template);

      expect(editorContent.value.innerHTML).toBe(template.content);
    });

    it("should handle template with unicode characters", () => {
      const template = {
        content: "<p>Hello 世界 🌍 émojis</p>",
      };

      templateManager.handleSelectTemplate(template);

      expect(editorContent.value.innerHTML).toBe(template.content);
    });

    it("should handle very large template content", () => {
      const largeContent =
        "<p>" + "Lorem ipsum dolor sit amet. ".repeat(100) + "</p>";
      const template = { content: largeContent };

      templateManager.handleSelectTemplate(template);

      expect(editorContent.value.innerHTML).toBe(largeContent);
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should handle getCurrentAsTemplate with null after clearing", () => {
      templateManager.applyBlankTemplate();

      const result = templateManager.getCurrentAsTemplate();

      expect(result).toEqual({ content: "" });
    });

    it("should handle multiple captureSnapshot calls", () => {
      const template = { content: "<p>Test</p>" };

      templateManager.handleSelectTemplate(template);
      templateManager.handleSelectTemplate(template);
      templateManager.applyBlankTemplate();

      expect(captureSnapshot).toHaveBeenCalledTimes(3);
    });

    it("should not throw on malformed HTML", () => {
      const template = {
        content: "<div><p>Unclosed div",
      };

      expect(() => {
        templateManager.handleSelectTemplate(template);
      }).not.toThrow();
    });
  });
});
