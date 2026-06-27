import { useMemo } from "react";
import { Linking, Text, View } from "react-native";

// Lightweight renderer for the constrained HTML our job descriptions carry (the
// Enriched/TipTap tag set: h1-h6, p, strong/b, em/i, u, s, a, ul/ol/li, blockquote,
// br, code). Pure JS — no native HTML lib + no rebuild. Anything unrecognised
// degrades to its text content, so we never render raw markup. The HTML is already
// sanitised server-side (web HTMLViewer); this is display-only.

// ---- tiny HTML tokenizer ------------------------------------------------------

type Tok =
  | { t: "open"; name: string; attrs: Record<string, string> }
  | { t: "close"; name: string }
  | { t: "text"; value: string };

const VOID = new Set(["br", "hr", "img"]);

const decode = (s: string): string =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&pound;/g, "£");

const parseAttrs = (raw: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  for (const m of raw.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) {
    attrs[m[1].toLowerCase()] = m[2];
  }
  return attrs;
};

const tokenize = (html: string): Tok[] => {
  const toks: Tok[] = [];
  const re = /<\/?([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g;
  for (const m of html.matchAll(re)) {
    if (m[3] != null) {
      const text = decode(m[3]).replace(/\s+/g, " ");
      if (text) toks.push({ t: "text", value: text });
      continue;
    }
    const name = m[1].toLowerCase();
    const isClose = m[0].startsWith("</");
    if (isClose) {
      toks.push({ t: "close", name });
    } else {
      toks.push({ t: "open", name, attrs: parseAttrs(m[2] ?? "") });
      if (VOID.has(name)) toks.push({ t: "close", name });
    }
  }
  return toks;
};

// ---- node tree ----------------------------------------------------------------

type Node = {
  name: string;
  attrs: Record<string, string>;
  children: (Node | string)[];
};

const BLOCK = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "div",
  "pre",
  "br",
  "hr",
]);

const buildTree = (toks: Tok[]): Node => {
  const root: Node = { name: "root", attrs: {}, children: [] };
  const stack: Node[] = [root];
  for (const tok of toks) {
    const top = stack[stack.length - 1];
    if (tok.t === "text") {
      top.children.push(tok.value);
    } else if (tok.t === "open") {
      const node: Node = { name: tok.name, attrs: tok.attrs, children: [] };
      top.children.push(node);
      if (!VOID.has(tok.name)) stack.push(node);
    } else {
      // close: pop to the matching open (tolerates minor mis-nesting).
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].name === tok.name) {
          stack.length = i;
          break;
        }
      }
    }
  }
  return root;
};

// ---- render -------------------------------------------------------------------

type Inline = { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; code?: boolean; link?: string };

const openLink = (url: string) => {
  void Linking.openURL(url).catch(() => {});
};

// Render inline content (Text spans) for a node's children.
const renderInline = (
  children: (Node | string)[],
  style: Inline,
  keyPrefix: string,
): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  children.forEach((child, i) => {
    const key = `${keyPrefix}-${i}`;
    if (typeof child === "string") {
      out.push(child);
      return;
    }
    const n = child.name;
    if (n === "br") {
      out.push("\n");
      return;
    }
    const next: Inline = { ...style };
    if (n === "strong" || n === "b") next.bold = true;
    if (n === "em" || n === "i") next.italic = true;
    if (n === "u") next.underline = true;
    if (n === "s" || n === "strike" || n === "del") next.strike = true;
    if (n === "code") next.code = true;
    if (n === "a") next.link = child.attrs.href;

    const inner = renderInline(child.children, next, key);
    if (n === "a" && child.attrs.href) {
      out.push(
        <Text
          key={key}
          onPress={() => openLink(child.attrs.href)}
          className="text-link underline"
        >
          {inner}
        </Text>,
      );
    } else {
      const cls = [
        next.bold ? "font-sans-semibold" : "",
        next.code ? "font-mono text-[13px]" : "",
      ]
        .filter(Boolean)
        .join(" ");
      out.push(
        <Text
          key={key}
          className={cls || undefined}
          style={{
            fontStyle: next.italic ? "italic" : "normal",
            textDecorationLine: next.underline
              ? "underline"
              : next.strike
                ? "line-through"
                : "none",
          }}
        >
          {inner}
        </Text>,
      );
    }
  });
  return out;
};

const HEADING_CLASS: Record<string, string> = {
  h1: "mt-4 mb-1 font-display text-2xl text-foreground",
  h2: "mt-4 mb-1 font-display text-xl text-foreground",
  h3: "mt-3 mb-1 font-sans-semibold text-lg text-foreground",
  h4: "mt-3 mb-1 font-sans-semibold text-base text-foreground",
  h5: "mt-2 mb-1 font-sans-semibold text-sm text-foreground",
  h6: "mt-2 mb-1 font-sans-semibold text-sm text-foreground",
};

// Render block-level nodes.
const renderBlocks = (
  children: (Node | string)[],
  keyPrefix: string,
): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  let listIndex = 0;

  children.forEach((child, i) => {
    const key = `${keyPrefix}-${i}`;
    if (typeof child === "string") {
      if (child.trim()) {
        out.push(
          <Text key={key} className="text-sm leading-6 text-foreground">
            {child}
          </Text>,
        );
      }
      return;
    }
    const n = child.name;

    if (HEADING_CLASS[n]) {
      out.push(
        <Text key={key} className={HEADING_CLASS[n]}>
          {renderInline(child.children, {}, key)}
        </Text>,
      );
      return;
    }
    if (n === "p" || n === "div") {
      out.push(
        <Text key={key} className="mt-2 text-sm leading-6 text-foreground">
          {renderInline(child.children, {}, key)}
        </Text>,
      );
      return;
    }
    if (n === "blockquote") {
      out.push(
        <View
          key={key}
          className="mt-2 border-l-2 border-border pl-3"
        >
          {renderBlocks(child.children, key)}
        </View>,
      );
      return;
    }
    if (n === "ul" || n === "ol") {
      listIndex = 0;
      out.push(
        <View key={key} className="mt-2 gap-1">
          {child.children
            .filter((c): c is Node => typeof c !== "string" && c.name === "li")
            .map((li, j) => {
              listIndex += 1;
              const bullet = n === "ol" ? `${listIndex}.` : "•";
              return (
                <View key={`${key}-li-${j}`} className="flex-row gap-2">
                  <Text className="text-sm leading-6 text-muted-foreground">
                    {bullet}
                  </Text>
                  <Text className="flex-1 text-sm leading-6 text-foreground">
                    {renderInline(li.children, {}, `${key}-li-${j}`)}
                  </Text>
                </View>
              );
            })}
        </View>,
      );
      return;
    }
    if (n === "hr") {
      out.push(<View key={key} className="my-3 h-px bg-border" />);
      return;
    }
    if (n === "br") {
      return; // handled inline
    }
    // Unknown block (pre/table/etc.) → render its text content as a paragraph.
    const inline = renderInline(child.children, {}, key);
    if (inline.length) {
      out.push(
        <Text key={key} className="mt-2 text-sm leading-6 text-foreground">
          {inline}
        </Text>,
      );
    }
  });
  return out;
};

const RichText = ({ html }: { html: string }) => {
  const blocks = useMemo(() => {
    const trimmed = (html ?? "").trim();
    if (!trimmed) return null;
    const tree = buildTree(tokenize(trimmed));
    // If the top level has no block elements (just inline/text), wrap as one para.
    const hasBlock = tree.children.some(
      (c) => typeof c !== "string" && BLOCK.has(c.name),
    );
    return hasBlock ? (
      <>{renderBlocks(tree.children, "b")}</>
    ) : (
      <Text className="text-sm leading-6 text-foreground">
        {renderInline(tree.children, {}, "b")}
      </Text>
    );
  }, [html]);

  return <View>{blocks}</View>;
};

export default RichText;
