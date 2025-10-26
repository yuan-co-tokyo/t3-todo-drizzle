import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReactElement } from "react";
import { MiniElement, MiniNode, MiniEvent, setupMiniDom } from "./minidom";

type RenderResult = {
  container: MiniElement;
  root: Root;
  unmount: () => void;
};

export function render(element: ReactElement): RenderResult {
  setupMiniDom();
  const container = document.createElement("div") as unknown as MiniElement;
  document.body.appendChild(container as unknown as Node);
  const root = createRoot(container as unknown as Element);
  act(() => {
    root.render(element);
  });
  return {
    container,
    root,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.parentNode?.removeChild(container);
    },
  };
}

export async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

export function queryAllByTag(container: MiniNode, tagName: string): MiniElement[] {
  const matches: MiniElement[] = [];
  const target = tagName.toUpperCase();
  const walk = (node: MiniNode) => {
    if (node.nodeType === 1) {
      const element = node as MiniElement;
      if (element.tagName === target) {
        matches.push(element);
      }
      for (const child of element.childNodes) {
        walk(child);
      }
    } else {
      for (const child of node.childNodes) {
        walk(child);
      }
    }
  };
  walk(container);
  return matches;
}

export function getByText(container: MiniNode, text: string): MiniElement {
  const match = queryByText(container, text);
  if (!match) {
    throw new Error(`Unable to find element with text: ${text}`);
  }
  return match;
}

export function queryByText(container: MiniNode, text: string): MiniElement | null {
  const walk = (node: MiniNode): MiniElement | null => {
    if (node.nodeType === 1) {
      const element = node as MiniElement;
      if (collectText(element).includes(text)) {
        return element;
      }
      for (const child of element.childNodes) {
        const found = walk(child);
        if (found) return found;
      }
    } else {
      for (const child of node.childNodes) {
        const found = walk(child);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(container);
}

function collectText(node: MiniNode): string {
  if (node.nodeType === 3) {
    return node.nodeValue ?? "";
  }
  let result = "";
  for (const child of node.childNodes) {
    result += collectText(child);
  }
  return result;
}

export function getByPlaceholderText(container: MiniNode, placeholder: string): MiniElement {
  const inputs = queryAllByTag(container, "input");
  for (const input of inputs) {
    if (input.getAttribute("placeholder") === placeholder) {
      return input;
    }
  }
  throw new Error(`Unable to find input with placeholder: ${placeholder}`);
}

export function click(element: MiniElement) {
  act(() => {
    const event = new MiniEvent("click", { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    if (
      element.tagName === "BUTTON" &&
      element.getAttribute("type") === "submit" &&
      !event.defaultPrevented
    ) {
      const form = findAncestor(element, "FORM");
      if (form) {
        form.dispatchEvent(new MiniEvent("submit", { bubbles: true, cancelable: true }));
      }
    }
  });
}

export function input(element: MiniElement, value: string) {
  act(() => {
    element.value = value;
    element.dispatchEvent(new MiniEvent("input", { bubbles: true }));
    element.dispatchEvent(new MiniEvent("change", { bubbles: true }));
  });
}

function findAncestor(node: MiniNode, tagName: string): MiniElement | null {
  let current: MiniNode | null = node.parentNode;
  const target = tagName.toUpperCase();
  while (current) {
    if (current.nodeType === 1) {
      const element = current as MiniElement;
      if (element.tagName === target) {
        return element;
      }
    }
    current = current.parentNode;
  }
  return null;
}

