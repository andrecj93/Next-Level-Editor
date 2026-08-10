import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import CommandPalette from "../CommandPalette.vue";
import AriaLiveRegion from "../AriaLiveRegion.vue";

/**
 * Two round-10 findings about state that existed but never reached the user:
 *
 * 1. The editor tracked every executed palette command (addToRecent →
 *    recentCommands, capped at 5) but the list was never read anywhere — the
 *    palette always opened with the same first-10 slice. Recently used
 *    commands now surface FIRST when the palette opens with an empty query
 *    (the VS Code pattern); searching is unaffected.
 *
 * 2. AriaLiveRegion rendered a third region wired to getAnnouncements("off").
 *    Nothing ever announces with priority "off" (it means "do not announce"),
 *    so the region was permanently empty dead markup.
 */

const cmd = (id: string, name: string) => ({
  id,
  name,
  description: `${name} description`,
  icon: "X",
  category: "Test",
  action: vi.fn(),
});

const COMMANDS = Array.from({ length: 12 }, (_, i) =>
  cmd(`c${i + 1}`, `Command ${i + 1}`)
);

let wrapper: ReturnType<typeof mount> | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("CommandPalette surfaces recent commands first", () => {
  const names = () =>
    wrapper!.findAll(".command-name").map((n) => n.text());

  it("lists recent commands first (in recency order) when the query is empty", () => {
    wrapper = mount(CommandPalette, {
      props: {
        show: true,
        commands: COMMANDS,
        recentCommandIds: ["c7", "c3"],
      },
    });

    const listed = names();
    expect(listed[0]).toBe("Command 7");
    expect(listed[1]).toBe("Command 3");
    // The rest follow in their original order, still capped at 10 total.
    expect(listed[2]).toBe("Command 1");
    expect(listed).toHaveLength(10);
    // No duplicates of the promoted commands.
    expect(listed.filter((n) => n === "Command 7")).toHaveLength(1);
  });

  it("ignores recency while searching (relevance order preserved)", async () => {
    wrapper = mount(CommandPalette, {
      props: {
        show: true,
        commands: COMMANDS,
        recentCommandIds: ["c12"],
      },
    });

    await wrapper.get("input").setValue("Command 1");
    const listed = names();
    // Matches in original order: 1, 10, 11, 12 — recency does not reorder.
    expect(listed[0]).toBe("Command 1");
    expect(listed).toContain("Command 12");
  });

  it("behaves exactly as before when no recents are provided", () => {
    wrapper = mount(CommandPalette, {
      props: { show: true, commands: COMMANDS },
    });
    expect(names()[0]).toBe("Command 1");
    expect(names()).toHaveLength(10);
  });
});

describe("AriaLiveRegion has no permanently-dead region", () => {
  it("renders only the polite and assertive regions", async () => {
    wrapper = mount(AriaLiveRegion);
    // The regions are behind a v-if now: exactly ONE instance on the page
    // renders them, and it claims that role in onMounted — so they appear a
    // tick after mount rather than synchronously. #R23-25
    await nextTick();
    const regions = wrapper.findAll("[aria-live]");
    expect(regions).toHaveLength(2);
    expect(wrapper.find("#aria-live-status").exists()).toBe(false);
  });
});
