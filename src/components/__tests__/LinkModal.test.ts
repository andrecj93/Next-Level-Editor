import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import LinkModal from "../LinkModal.vue";

const openModal = () => mount(LinkModal, { props: { isOpen: true }, attachTo: document.body });

describe("LinkModal", () => {
  it("renders nothing when closed", () => {
    const w = mount(LinkModal, { props: { isOpen: false } });
    expect(w.find(".modal-content").exists()).toBe(false);
  });

  it("shows the dialog with a URL field when open", () => {
    const w = openModal();
    expect(w.find(".modal-content").exists()).toBe(true);
    expect(w.find("#link-url").exists()).toBe(true);
    w.unmount();
  });

  it("disables Insert until a URL is entered", async () => {
    const w = openModal();
    const insert = w.get(".insert-button").element as HTMLButtonElement;
    expect(insert.disabled).toBe(true);
    await w.get("#link-url").setValue("example.com");
    expect(insert.disabled).toBe(false);
    w.unmount();
  });

  it("prepends https:// to a bare domain and emits url + text", async () => {
    const w = openModal();
    await w.get("#link-url").setValue("example.com/docs");
    await w.get("#link-text").setValue("the docs");
    await w.get(".insert-button").trigger("click");
    expect(w.emitted("insert")![0]).toEqual([
      "https://example.com/docs",
      "the docs",
    ]);
    w.unmount();
  });

  it("keeps an explicit protocol / mailto / relative URL unchanged", async () => {
    const w = openModal();
    await w.get("#link-url").setValue("mailto:a@b.com");
    await w.get(".insert-button").trigger("click");
    expect(w.emitted("insert")![0][0]).toBe("mailto:a@b.com");
    w.unmount();
  });

  it("does not emit insert for a whitespace-only URL", async () => {
    const w = openModal();
    await w.get("#link-url").setValue("   ");
    await w.get("#link-url").trigger("keyup", { key: "Enter" });
    expect(w.emitted("insert")).toBeUndefined();
    w.unmount();
  });

  it("submits on Enter in the URL field", async () => {
    const w = openModal();
    await w.get("#link-url").setValue("example.com");
    await w.get("#link-url").trigger("keyup", { key: "Enter" });
    expect(w.emitted("insert")![0][0]).toBe("https://example.com");
    w.unmount();
  });

  it("emits close on Cancel, the ✕ button, and the overlay backdrop", async () => {
    const cancel = openModal();
    await cancel.get(".cancel-button").trigger("click");
    expect(cancel.emitted("close")).toBeTruthy();
    cancel.unmount();

    const x = openModal();
    await x.get(".close-button").trigger("click");
    expect(x.emitted("close")).toBeTruthy();
    x.unmount();

    const overlay = openModal();
    await overlay.get(".modal-overlay").trigger("click");
    expect(overlay.emitted("close")).toBeTruthy();
    overlay.unmount();
  });

  it("does not close when the dialog body itself is clicked", async () => {
    const w = openModal();
    await w.get(".modal-content").trigger("click");
    expect(w.emitted("close")).toBeUndefined();
    w.unmount();
  });

  it("resets its fields each time it re-opens", async () => {
    const w = mount(LinkModal, { props: { isOpen: true }, attachTo: document.body });
    await w.get("#link-url").setValue("dirty.com");
    await w.setProps({ isOpen: false });
    await w.setProps({ isOpen: true });
    expect((w.get("#link-url").element as HTMLInputElement).value).toBe("");
    w.unmount();
  });
});
