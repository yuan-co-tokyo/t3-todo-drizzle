type EventListener = (event: MiniEvent) => void;

export class MiniEvent {
  readonly type: string;
  readonly bubbles: boolean;
  readonly cancelable: boolean;
  target: MiniNode | null = null;
  currentTarget: MiniNode | null = null;
  defaultPrevented = false;
  private propagationStopped = false;

  constructor(type: string, options?: { bubbles?: boolean; cancelable?: boolean }) {
    this.type = type;
    this.bubbles = options?.bubbles ?? false;
    this.cancelable = options?.cancelable ?? false;
  }

  stopPropagation() {
    this.propagationStopped = true;
  }

  stopImmediatePropagation() {
    this.propagationStopped = true;
  }

  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }

  isPropagationStopped() {
    return this.propagationStopped;
  }
}

export class MiniNode {
  ownerDocument: MiniDocument;
  readonly nodeType: number;
  readonly nodeName: string;
  parentNode: MiniNode | null = null;
  childNodes: MiniNode[] = [];
  nodeValue: string | null = null;
  private listeners = new Map<string, Set<EventListener>>();

  constructor(ownerDocument: MiniDocument, nodeType: number, nodeName: string) {
    this.ownerDocument = ownerDocument;
    this.nodeType = nodeType;
    this.nodeName = nodeName;
  }

  appendChild<T extends MiniNode>(child: T): T {
    return this.insertBefore(child, null);
  }

  insertBefore<T extends MiniNode>(child: T, reference: MiniNode | null): T {
    const nodes = this.normalizeForInsertion(child);
    const index = reference ? this.childNodes.indexOf(reference) : this.childNodes.length;
    let offset = 0;
    for (const node of nodes) {
      node.parentNode = this;
      if (reference) {
        this.childNodes.splice(index + offset, 0, node);
      } else {
        this.childNodes.push(node);
      }
      offset += 1;
    }
    return child;
  }

  removeChild<T extends MiniNode>(child: T): T {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) {
      this.childNodes.splice(index, 1);
      child.parentNode = null;
    }
    return child;
  }

  get firstChild(): MiniNode | null {
    return this.childNodes[0] ?? null;
  }

  get lastChild(): MiniNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }

  get nextSibling(): MiniNode | null {
    if (!this.parentNode) return null;
    const index = this.parentNode.childNodes.indexOf(this);
    if (index < 0) return null;
    return this.parentNode.childNodes[index + 1] ?? null;
  }

  get previousSibling(): MiniNode | null {
    if (!this.parentNode) return null;
    const index = this.parentNode.childNodes.indexOf(this);
    if (index <= 0) return null;
    return this.parentNode.childNodes[index - 1] ?? null;
  }

  get textContent(): string {
    if (this.nodeType === 3 || this.nodeType === 8) {
      return this.nodeValue ?? "";
    }
    return this.childNodes.map((child) => child.textContent).join("");
  }

  set textContent(value: string) {
    for (const child of [...this.childNodes]) {
      this.removeChild(child);
    }
    if (value !== "") {
      const text = this.ownerDocument.createTextNode(value);
      this.appendChild(text);
    }
  }

  addEventListener(type: string, listener: EventListener) {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    const set = this.listeners.get(type);
    set?.delete(listener);
  }

  dispatchEvent(event: MiniEvent): boolean {
    if (!event.target) {
      event.target = this;
    }
    let node: MiniNode | null = this;
    while (node) {
      const listeners = node.listeners.get(event.type);
      if (listeners) {
        for (const listener of [...listeners]) {
          event.currentTarget = node;
          listener(event);
          if (event.isPropagationStopped()) {
            return !event.defaultPrevented;
          }
        }
      }
      if (!event.bubbles) {
        break;
      }
      node = node.parentNode;
    }
    return !event.defaultPrevented;
  }

  private normalizeForInsertion(node: MiniNode): MiniNode[] {
    if (node.nodeType !== 11) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
      return [node];
    }
    const fragmentChildren = [...node.childNodes];
    for (const child of fragmentChildren) {
      child.parentNode = null;
    }
    node.childNodes = [];
    return fragmentChildren;
  }
}

export class MiniText extends MiniNode {
  constructor(ownerDocument: MiniDocument, text: string) {
    super(ownerDocument, 3, "#text");
    this.nodeValue = text;
  }

  override set textContent(value: string) {
    this.nodeValue = value;
  }
}

export class MiniComment extends MiniNode {
  constructor(ownerDocument: MiniDocument, text: string) {
    super(ownerDocument, 8, "#comment");
    this.nodeValue = text;
  }

  override set textContent(value: string) {
    this.nodeValue = value;
  }
}

export class MiniDocumentFragment extends MiniNode {
  constructor(ownerDocument: MiniDocument) {
    super(ownerDocument, 11, "#document-fragment");
  }
}

export class MiniElement extends MiniNode {
  readonly tagName: string;
  private attributes = new Map<string, string>();
  value = "";
  checked = false;
  disabled = false;

  constructor(ownerDocument: MiniDocument, tagName: string) {
    super(ownerDocument, 1, tagName.toUpperCase());
    this.tagName = tagName.toUpperCase();
  }

  setAttribute(name: string, value: string) {
    const normalized = name.toLowerCase();
    this.attributes.set(normalized, value);
    switch (normalized) {
      case "class":
      case "classname":
        this.attributes.set("class", value);
        break;
      case "value":
        this.value = value;
        break;
      case "checked":
        this.checked = value === "" ? true : value !== "false";
        break;
      case "disabled":
        this.disabled = value === "" ? true : value !== "false";
        break;
    }
  }

  getAttribute(name: string): string | null {
    const normalized = name.toLowerCase();
    if (normalized === "value") {
      return this.value;
    }
    if (normalized === "checked") {
      return this.checked ? "" : null;
    }
    if (normalized === "disabled") {
      return this.disabled ? "" : null;
    }
    return this.attributes.get(normalized) ?? null;
  }

  removeAttribute(name: string) {
    const normalized = name.toLowerCase();
    this.attributes.delete(normalized);
    if (normalized === "class" || normalized === "classname") {
      this.attributes.delete("class");
    }
    if (normalized === "value") {
      this.value = "";
    }
    if (normalized === "checked") {
      this.checked = false;
    }
    if (normalized === "disabled") {
      this.disabled = false;
    }
  }

  get className(): string {
    return this.attributes.get("class") ?? "";
  }

  set className(value: string) {
    this.attributes.set("class", value);
  }

  focus() {}

  blur() {}
}

export class MiniDocument extends MiniNode {
  documentElement: MiniElement;
  body: MiniElement;
  defaultView: Window & typeof globalThis;

  constructor(windowRef: Window & typeof globalThis) {
    super(null as unknown as MiniDocument, 9, "#document");
    this.ownerDocument = this;
    this.defaultView = windowRef;
    this.documentElement = new MiniElement(this, "html");
    this.body = new MiniElement(this, "body");
    this.documentElement.appendChild(this.body);
  }

  createElement(tagName: string): MiniElement {
    return new MiniElement(this, tagName);
  }

  createElementNS(_ns: string | null, tagName: string): MiniElement {
    return new MiniElement(this, tagName);
  }

  createTextNode(value: string): MiniText {
    return new MiniText(this, value);
  }

  createComment(value: string): MiniComment {
    return new MiniComment(this, value);
  }

  createDocumentFragment(): MiniDocumentFragment {
    return new MiniDocumentFragment(this);
  }
}

export function setupMiniDom() {
  if (globalThis.document) {
    return;
  }
  const windowRef = {} as Window & typeof globalThis;
  const documentRef = new MiniDocument(windowRef);
  windowRef.document = documentRef as unknown as Document;
  windowRef.window = windowRef;
  windowRef.navigator = { userAgent: "node.js" } as Navigator;
  documentRef.defaultView = windowRef;
  windowRef.HTMLElement = MiniElement as unknown as typeof HTMLElement;
  windowRef.Element = MiniElement as unknown as typeof Element;
  windowRef.HTMLInputElement = MiniElement as unknown as typeof HTMLInputElement;
  windowRef.HTMLIFrameElement = MiniElement as unknown as typeof HTMLIFrameElement;
  windowRef.Node = MiniNode as unknown as typeof Node;
  windowRef.Document = MiniDocument as unknown as typeof Document;

  Object.defineProperty(globalThis, "window", {
    value: windowRef,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: documentRef as unknown as Document,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: windowRef.navigator,
    configurable: true,
    writable: true,
  });
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, "HTMLElement", {
    value: MiniElement,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "Element", {
    value: MiniElement,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "HTMLInputElement", {
    value: MiniElement,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "HTMLIFrameElement", {
    value: MiniElement,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "Node", {
    value: MiniNode,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "Document", {
    value: MiniDocument,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "HTMLDocument", {
    value: MiniDocument,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "Text", {
    value: MiniText,
    configurable: true,
    writable: true,
  });
}
