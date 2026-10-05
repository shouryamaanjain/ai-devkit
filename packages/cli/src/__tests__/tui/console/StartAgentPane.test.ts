import { describe, expect, it } from "vitest";
import {
  STARTABLE_AGENT_TYPES,
  expandHomePath,
  nextRecentCwd,
  nextStartAgentType,
  normalizeStartAgentValues,
  previousStartAgentType,
  trimStartAgentError,
} from "../../../tui/console/StartAgentPane.js";

describe("StartAgentPane helpers", () => {
  it("lists supported agent start types in pane order", () => {
    expect(STARTABLE_AGENT_TYPES).toEqual([
      "claude",
      "codex",
      "copilot",
      "gemini_cli",
      "grok_cli",
      "antigravity_cli",
      "opencode",
      "pi",
      "kiro",
      "devin",
    ]);
  });

  it("cycles to the next agent type", () => {
    expect(nextStartAgentType("claude")).toBe("codex");
    expect(nextStartAgentType("codex")).toBe("copilot");
    expect(nextStartAgentType("copilot")).toBe("gemini_cli");
    expect(nextStartAgentType("opencode")).toBe("pi");
    expect(nextStartAgentType("pi")).toBe("kiro");
    expect(nextStartAgentType("kiro")).toBe("devin");
    expect(nextStartAgentType("devin")).toBe("claude");
  });

  it("cycles to the previous agent type", () => {
    expect(previousStartAgentType("copilot")).toBe("codex");
    expect(previousStartAgentType("gemini_cli")).toBe("copilot");
    expect(previousStartAgentType("pi")).toBe("opencode");
    expect(previousStartAgentType("kiro")).toBe("pi");
    expect(previousStartAgentType("devin")).toBe("kiro");
    expect(previousStartAgentType("claude")).toBe("devin");
  });

  it("normalizes submitted name and cwd without changing the selected type", () => {
    expect(
      normalizeStartAgentValues({
        type: "gemini_cli",
        name: "  feature-agent  ",
        cwd: "  /tmp/project  ",
      }),
    ).toEqual({
      type: "gemini_cli",
      name: "feature-agent",
      cwd: "/tmp/project",
    });
  });

  it("expands ~ in the submitted cwd", () => {
    expect(expandHomePath("~/code", "/home/u")).toBe("/home/u/code");
    expect(expandHomePath("~", "/home/u")).toBe("/home/u");
    expect(expandHomePath("/abs/path", "/home/u")).toBe("/abs/path");
    expect(expandHomePath("~other/x", "/home/u")).toBe("~other/x");
    expect(
      normalizeStartAgentValues({ type: "codex", name: "x", cwd: "~/proj" }).cwd,
    ).toBe(`${process.env.HOME}/proj`);
  });

  it("cycles recent cwds and skips empty input", () => {
    const recents = ["/a", "/b", "/c"];
    expect(nextRecentCwd("/a", recents)).toBe("/b");
    expect(nextRecentCwd("/elsewhere", recents)).toBe("/a");
    expect(nextRecentCwd("/c", recents)).toBe("/a");
    expect(nextRecentCwd("/a", [])).toBeNull();
  });

  it("keeps short error messages unchanged", () => {
    expect(trimStartAgentError("cwd does not exist", 80)).toBe("cwd does not exist");
  });

  it("clips long error messages to fit the pane width", () => {
    expect(trimStartAgentError("x".repeat(100), 30)).toBe(`${"x".repeat(23)}...`);
  });
});
