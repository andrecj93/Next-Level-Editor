import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import EmojiPicker from "../EmojiPicker.vue";

describe("EmojiPicker", () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    wrapper = mount(EmojiPicker, {
      props: {
        show: true,
      },
    });
  });

  describe("Rendering", () => {
    it("should render when show is true", () => {
      expect(wrapper.find(".emoji-picker").exists()).toBe(true);
    });

    it("should not render when show is false", () => {
      wrapper = mount(EmojiPicker, {
        props: {
          show: false,
        },
      });
      expect(wrapper.find(".emoji-picker").exists()).toBe(false);
    });

    it("should render search input", () => {
      expect(wrapper.find(".emoji-search").exists()).toBe(true);
    });

    it("should render category buttons", () => {
      const categoryButtons = wrapper.findAll(".category-btn");
      expect(categoryButtons.length).toBeGreaterThan(0);
      expect(categoryButtons.length).toBe(7); // 7 categories
    });

    it("should render emoji grid", () => {
      expect(wrapper.find(".emoji-grid").exists()).toBe(true);
    });

    it("should have default active category as smileys", () => {
      const activeButton = wrapper.find(".category-btn.active");
      expect(activeButton.exists()).toBe(true);
      expect(activeButton.text()).toBe("😀");
    });
  });

  describe("Category Navigation", () => {
    it("should change active category on button click", async () => {
      const categoryButtons = wrapper.findAll(".category-btn");
      const peopleButton = categoryButtons[1]; // People category

      await peopleButton.trigger("click");

      expect(peopleButton.classes()).toContain("active");
    });

    it("should display emojis from selected category", async () => {
      const categoryButtons = wrapper.findAll(".category-btn");
      const animalsButton = categoryButtons[2]; // Animals category

      await animalsButton.trigger("click");

      const emojiButtons = wrapper.findAll(".emoji-btn");
      expect(emojiButtons.length).toBeGreaterThan(0);
      // Animals category should have specific emojis
      const emojiTexts = emojiButtons.map((btn) => btn.text());
      expect(emojiTexts).toContain("🐶");
    });

    it("should show all 7 categories", () => {
      const categoryButtons = wrapper.findAll(".category-btn");
      expect(categoryButtons[0].attributes("title")).toBe("Smileys & Emotion");
      expect(categoryButtons[1].attributes("title")).toBe("People & Body");
      expect(categoryButtons[2].attributes("title")).toBe("Animals & Nature");
      expect(categoryButtons[3].attributes("title")).toBe("Food & Drink");
      expect(categoryButtons[4].attributes("title")).toBe("Activities");
      expect(categoryButtons[5].attributes("title")).toBe("Objects");
      expect(categoryButtons[6].attributes("title")).toBe("Symbols");
    });
  });

  describe("Search Functionality", () => {
    it("should filter emojis based on search query", async () => {
      const searchInput = wrapper.find(".emoji-search");

      await searchInput.setValue("grinning");

      const emojiButtons = wrapper.findAll(".emoji-btn");
      const emojiTexts = emojiButtons.map((btn) => btn.text());
      expect(emojiTexts).toContain("😀");
      expect(emojiButtons.length).toBeGreaterThan(0);
    });

    it("should show no results message when no emojis match", async () => {
      const searchInput = wrapper.find(".emoji-search");

      await searchInput.setValue("xyznonexistent");

      expect(wrapper.find(".no-results").exists()).toBe(true);
      expect(wrapper.find(".no-results").text()).toBe("No emoji found");
    });

    it("should be case insensitive in search", async () => {
      const searchInput = wrapper.find(".emoji-search");

      await searchInput.setValue("GRINNING");

      const emojiButtons = wrapper.findAll(".emoji-btn");
      expect(emojiButtons.length).toBeGreaterThan(0);
    });

    it("should clear search and reset when picker is hidden", async () => {
      const searchInput = wrapper.find<HTMLInputElement>(".emoji-search");

      await searchInput.setValue("smile");

      // When hidden, watch should reset search
      await wrapper.setProps({ show: false });
      await wrapper.vm.$nextTick();

      // Re-mount with show true to check reset worked
      await wrapper.setProps({ show: true });
      await wrapper.vm.$nextTick();

      // After reset, default smileys should show all emojis (no filter)
      const emojiButtons = wrapper.findAll(".emoji-btn");
      expect(emojiButtons.length).toBeGreaterThan(15); // Smileys has many emojis
    });

    it("should combine category filter with search", async () => {
      // Switch to animals category
      const categoryButtons = wrapper.findAll(".category-btn");
      await categoryButtons[2].trigger("click");

      // Search for dog
      const searchInput = wrapper.find(".emoji-search");
      await searchInput.setValue("dog");

      const emojiButtons = wrapper.findAll(".emoji-btn");
      const emojiTexts = emojiButtons.map((btn) => btn.text());
      expect(emojiTexts).toContain("🐶");
      expect(emojiButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Emoji Selection", () => {
    it("should emit select event when emoji is clicked", async () => {
      const emojiButtons = wrapper.findAll(".emoji-btn");
      const firstEmoji = emojiButtons[0];

      await firstEmoji.trigger("click");

      expect(wrapper.emitted("select")).toBeTruthy();
      expect(wrapper.emitted("select")?.[0]).toEqual(["😀"]);
    });

    it("should emit correct emoji when clicking different emojis", async () => {
      const emojiButtons = wrapper.findAll(".emoji-btn");

      await emojiButtons[0].trigger("click");
      await emojiButtons[1].trigger("click");

      const selectEvents = wrapper.emitted("select");
      expect(selectEvents?.length).toBe(2);
      expect(selectEvents?.[0]).toEqual(["😀"]);
      expect(selectEvents?.[1]).toEqual(["😃"]);
    });

    it("should show emoji name in title attribute", () => {
      const emojiButtons = wrapper.findAll(".emoji-btn");
      const firstEmoji = emojiButtons[0];

      expect(firstEmoji.attributes("title")).toBe("grinning face");
    });
  });

  describe("Reset Behavior", () => {
    it("should reset active category when picker is hidden", async () => {
      // Change to different category
      const categoryButtons = wrapper.findAll(".category-btn");
      await categoryButtons[3].trigger("click"); // Food category

      expect(categoryButtons[3].classes()).toContain("active");

      // Hide and show picker
      await wrapper.setProps({ show: false });
      await wrapper.setProps({ show: true });

      // Should be back to smileys
      const updatedButtons = wrapper.findAll(".category-btn");
      expect(updatedButtons[0].classes()).toContain("active");
    });

    it("should reset search query when picker is hidden", async () => {
      const searchInput = wrapper.find<HTMLInputElement>(".emoji-search");

      await searchInput.setValue("test query");

      // Should filter results
      let emojiButtons = wrapper.findAll(".emoji-btn");
      const filteredCount = emojiButtons.length;

      // When hidden, watch should reset
      await wrapper.setProps({ show: false });
      await wrapper.vm.$nextTick();
      await wrapper.setProps({ show: true });
      await wrapper.vm.$nextTick();

      // After reset, should show all smileys (no filter)
      emojiButtons = wrapper.findAll(".emoji-btn");
      expect(emojiButtons.length).toBeGreaterThan(filteredCount);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty search gracefully", async () => {
      const searchInput = wrapper.find(".emoji-search");

      await searchInput.setValue("");

      const emojiButtons = wrapper.findAll(".emoji-btn");
      expect(emojiButtons.length).toBeGreaterThan(0);
    });

    it("should handle rapid category switching", async () => {
      const categoryButtons = wrapper.findAll(".category-btn");

      for (const button of categoryButtons) {
        await button.trigger("click");
      }

      const emojiButtons = wrapper.findAll(".emoji-btn");
      expect(emojiButtons.length).toBeGreaterThan(0);
    });

    it("should handle special characters in search", async () => {
      const searchInput = wrapper.find(".emoji-search");

      await searchInput.setValue("$%^&*()");

      expect(wrapper.find(".no-results").exists()).toBe(true);
    });

    it("should maintain search when switching categories", async () => {
      const searchInput = wrapper.find<HTMLInputElement>(".emoji-search");
      await searchInput.setValue("face");

      const categoryButtons = wrapper.findAll(".category-btn");
      await categoryButtons[1].trigger("click"); // People category

      // Search should still be active
      expect(searchInput.element.value).toBe("face");
    });
  });
});
