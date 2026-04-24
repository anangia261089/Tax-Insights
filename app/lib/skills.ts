import fs from "node:fs";
import path from "node:path";

const SKILLS_DIR = path.join(process.cwd(), "app", "skills");

const SKILL_ORDER = [
  "persona",
  "irs-reference",
  "formatting",
  "section-179",
  "1099-rules",
] as const;

type SkillName = (typeof SKILL_ORDER)[number];

let cache: string | null = null;

function loadSkill(name: SkillName): string {
  const filePath = path.join(SKILLS_DIR, `${name}.md`);
  return fs.readFileSync(filePath, "utf8").trim();
}

export function buildSystemPrompt(): string {
  if (cache) return cache;
  const blocks = SKILL_ORDER.map((name) => {
    const body = loadSkill(name);
    return `<skill name="${name}">\n${body}\n</skill>`;
  });
  cache = [
    "You are JAX, a tax insights assistant. Follow the skills below as authoritative guidance.",
    ...blocks,
  ].join("\n\n");
  return cache;
}

export function systemBlocks(): { type: "text"; text: string; cache_control?: { type: "ephemeral" } }[] {
  return [
    {
      type: "text",
      text: buildSystemPrompt(),
      cache_control: { type: "ephemeral" },
    },
  ];
}
