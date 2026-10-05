import fs from "fs";
import path from "path";
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { HARNESS_RUNTIME_PROFILES, type StartableAgentType } from "@ai-devkit/agent-manager";
import { KeyHints, Panel, SectionTitle, TUI_COLORS } from "../design-system/index.js";

export const STARTABLE_AGENT_TYPES = Object.keys(HARNESS_RUNTIME_PROFILES) as StartableAgentType[];

export function nextStartAgentType(type: StartableAgentType): StartableAgentType {
  const index = STARTABLE_AGENT_TYPES.indexOf(type);
  return STARTABLE_AGENT_TYPES[(index + 1) % STARTABLE_AGENT_TYPES.length];
}

export function previousStartAgentType(type: StartableAgentType): StartableAgentType {
  const index = STARTABLE_AGENT_TYPES.indexOf(type);
  return STARTABLE_AGENT_TYPES[
    (index - 1 + STARTABLE_AGENT_TYPES.length) % STARTABLE_AGENT_TYPES.length
  ];
}

type Focus = "type" | "cwd" | "name" | "submit" | "cancel";

interface StartAgentPaneProps {
  initialType?: StartableAgentType;
  initialName: string;
  initialCwd: string;
  onSubmit: (values: { type: StartableAgentType; name: string; cwd: string }) => void;
  onCancel: () => void;
  error?: string | null;
  isSubmitting?: boolean;
  width: number;
  height: number;
}

interface StartAgentValues {
  type: StartableAgentType;
  name: string;
  cwd: string;
}

const FOCUS_ORDER: Focus[] = ["type", "cwd", "name", "submit", "cancel"];

function nextFocus(focus: Focus): Focus {
  return FOCUS_ORDER[(FOCUS_ORDER.indexOf(focus) + 1) % FOCUS_ORDER.length];
}

function previousFocus(focus: Focus): Focus {
  return FOCUS_ORDER[(FOCUS_ORDER.indexOf(focus) - 1 + FOCUS_ORDER.length) % FOCUS_ORDER.length];
}

export function normalizeStartAgentValues(values: StartAgentValues): StartAgentValues {
  return {
    type: values.type,
    name: values.name.trim(),
    cwd: values.cwd.trim(),
  };
}

const START_NAME_REGEX = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;

export interface StartAgentFieldErrors {
  name?: string;
  cwd?: string;
}

export function validateStartAgentValues(
  values: StartAgentValues,
  cwdExists: (dir: string) => boolean = (dir) => fs.existsSync(dir),
): StartAgentFieldErrors {
  const errors: StartAgentFieldErrors = {};
  if (!values.name) {
    errors.name = "Name is required.";
  } else if (!START_NAME_REGEX.test(values.name)) {
    errors.name = "Lowercase letters, digits and hyphens; start/end alphanumeric, 2-64 chars.";
  }
  if (!values.cwd) {
    errors.cwd = "Working directory is required.";
  } else if (!cwdExists(path.resolve(values.cwd))) {
    errors.cwd = `Directory "${values.cwd}" does not exist.`;
  }
  return errors;
}

export function hasStartAgentErrors(errors: StartAgentFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function trimStartAgentError(error: string, width: number): string {
  const max = Math.max(20, width - 6);
  return error.length > max ? `${error.slice(0, max - 1)}...` : error;
}

export const StartAgentPane: React.FC<StartAgentPaneProps> = ({
  initialType = "codex",
  initialName,
  initialCwd,
  onSubmit,
  onCancel,
  error = null,
  isSubmitting = false,
  width,
  height,
}) => {
  const [type, setType] = useState<StartableAgentType>(initialType);
  const [cwd, setCwd] = useState(initialCwd);
  const [name, setName] = useState(initialName);
  const [focus, setFocus] = useState<Focus>("type");
  const [fieldErrors, setFieldErrors] = useState<StartAgentFieldErrors>({});

  const submit = (): void => {
    if (isSubmitting) return;
    const values = normalizeStartAgentValues({ type, name, cwd });
    const errors = validateStartAgentValues(values);
    setFieldErrors(errors);
    if (hasStartAgentErrors(errors)) return;
    onSubmit(values);
  };

  useInput((input, key) => {
    if (isSubmitting) return;
    if (key.escape || input === "\u001b") {
      onCancel();
      return;
    }

    if (focus === "type") {
      if (key.leftArrow || input === "h") {
        setType(previousStartAgentType(type));
        return;
      }
      if (key.rightArrow || input === "l") {
        setType(nextStartAgentType(type));
        return;
      }
    }

    if (key.tab || key.downArrow) {
      setFocus(nextFocus(focus));
      return;
    }
    if (key.upArrow) {
      setFocus(previousFocus(focus));
      return;
    }

    if (key.return) {
      if (focus === "submit") {
        submit();
      } else if (focus === "cancel") {
        onCancel();
      } else {
        setFocus(nextFocus(focus));
      }
    }
  });

  const innerWidth = Math.max(24, width - 4);

  return (
    <Panel width={width} height={height} focused paddingX={1} flexDirection="column" flexShrink={0}>
      <Box>
        <SectionTitle>START AN AGENT</SectionTitle>
        {isSubmitting ? <Text color={TUI_COLORS.accent}> starting...</Text> : null}
      </Box>

      <Box marginTop={1}>
        <Text color={focus === "type" ? TUI_COLORS.accent : undefined}>Type: </Text>
        {STARTABLE_AGENT_TYPES.map((agentType) => (
          <Text
            key={agentType}
            color={agentType === type ? TUI_COLORS.accent : undefined}
            inverse={focus === "type" && agentType === type}
          >
            {` ${agentType} `}
          </Text>
        ))}
      </Box>

      <Box marginTop={1} width={innerWidth} flexDirection="column">
        <Box>
          <Text color={focus === "cwd" ? TUI_COLORS.accent : undefined}>Cwd: </Text>
          {focus === "cwd" ? (
            <TextInput
              value={cwd}
              onChange={(value) => {
                setCwd(value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.cwd;
                  return next;
                });
              }}
              onSubmit={() => setFocus("name")}
            />
          ) : (
            <Text>{cwd}</Text>
          )}
        </Box>
        {fieldErrors.cwd ? <Text color={TUI_COLORS.danger}>{fieldErrors.cwd}</Text> : null}
      </Box>

      <Box marginTop={1} width={innerWidth} flexDirection="column">
        <Box>
          <Text color={focus === "name" ? TUI_COLORS.accent : undefined}>Name: </Text>
          {focus === "name" ? (
            <TextInput
              value={name}
              onChange={(value) => {
                setName(value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.name;
                  return next;
                });
              }}
              onSubmit={() => setFocus("submit")}
            />
          ) : (
            <Text>{name}</Text>
          )}
        </Box>
        {fieldErrors.name ? <Text color={TUI_COLORS.danger}>{fieldErrors.name}</Text> : null}
      </Box>

      {error ? (
        <Box marginTop={1}>
          <Text color={TUI_COLORS.danger}>{trimStartAgentError(error, width)}</Text>
        </Box>
      ) : null}

      <Box marginTop={1}>
        <Text
          inverse={focus === "submit"}
          color={focus === "submit" ? TUI_COLORS.accent : undefined}
        >
          {isSubmitting ? " Starting " : " Start "}
        </Text>
        <Text> </Text>
        <Text
          inverse={focus === "cancel"}
          color={focus === "cancel" ? TUI_COLORS.accent : undefined}
        >
          {" Cancel "}
        </Text>
        <Text> </Text>
        <KeyHints hints={["tab move", "esc back"]} />
      </Box>
    </Panel>
  );
};
