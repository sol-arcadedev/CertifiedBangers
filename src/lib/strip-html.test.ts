import { describe, it, expect } from "vitest";
import { stripHtml } from "./strip-html";

describe("stripHtml", () => {
  it("converts <br> and <br/> into real line breaks", () => {
    expect(stripHtml("line one<br>line two<br/>line three")).toBe(
      "line one\nline two\nline three",
    );
  });

  it("strips inline formatting tags, keeping their inner text", () => {
    expect(stripHtml("This is <b>bold</b> and <i>italic</i>.")).toBe("This is bold and italic.");
  });

  it("strips tags with attributes, keeping their inner text", () => {
    expect(stripHtml('Visit <a href="https://example.com">this link</a> for more.')).toBe(
      "Visit this link for more.",
    );
  });

  it("decodes common HTML entities", () => {
    expect(stripHtml("Tom &amp; Jerry &quot;forever&quot; &#039;friends&#039;")).toBe(
      'Tom & Jerry "forever" \'friends\'',
    );
  });

  it("trims leading/trailing whitespace", () => {
    expect(stripHtml("  padded text  ")).toBe("padded text");
  });

  it("regression: the exact reported bug — literal <b>/<i> tags surviving asHtml: false", () => {
    const raw =
      "1. <b>Bukiyou na Sasamori-san</b> (不器用な笹森さん)<br>2. <b>Naisho na Shinomiya-san</b> (内緒な四宮さん)<br>3. <b>Midara na Sunohara-san</b> (淫らな春原さん)<br>4. <b>Buaisou Setoguchi-san</b> (無愛想な瀬戸口さん)<br>5. <b>Sono Go no Sasamori-san</b> (その後の笹森さん)<br><i>Note: Released during Comic Market 94</i>";

    const result = stripHtml(raw);

    expect(result).not.toContain("<b>");
    expect(result).not.toContain("<i>");
    expect(result).toContain("1. Bukiyou na Sasamori-san (不器用な笹森さん)");
    expect(result).toContain("Note: Released during Comic Market 94");
  });
});
