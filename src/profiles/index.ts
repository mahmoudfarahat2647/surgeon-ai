import type { FrameworkProfile, AuditMode } from "./types.js";
import type { ProjectInfo } from "../types/scan.js";

const CONCRETE_MODES: AuditMode[] = ["security", "performance", "reliability", "maintainability", "tests"];
import { baseProfile } from "./base.js";
import { nodeProfile } from "./node.js";
import { typescriptProfile } from "./typescript.js";
import { reactProfile } from "./react.js";
import { nextjsProfile } from "./nextjs.js";
import { expressProfile } from "./express.js";
import { fastifyProfile } from "./fastify.js";
import { nestjsProfile } from "./nestjs.js";
import { testingProfile } from "./testing.js";

export type { FrameworkProfile, AuditMode, Pitfall } from "./types.js";

const ALL_PROFILES: FrameworkProfile[] = [
  nodeProfile,
  typescriptProfile,
  reactProfile,
  nextjsProfile,
  expressProfile,
  fastifyProfile,
  nestjsProfile,
  testingProfile,
];

export function detectProfiles(project: ProjectInfo): FrameworkProfile[] {
  const detected: FrameworkProfile[] = [baseProfile];
  for (const profile of ALL_PROFILES) {
    if (profile.detect(project)) {
      detected.push(profile);
    }
  }
  return detected;
}

export function getProfileFragments(
  profiles: FrameworkProfile[],
  mode: AuditMode,
  project: ProjectInfo,
): string {
  const modes = mode === "full" ? CONCRETE_MODES : [mode];
  const fragments: string[] = [];

  for (const m of modes) {
    for (const p of profiles) {
      const static_ = p.promptFragments[m];
      if (static_) fragments.push(static_);

      if (p.dynamicPrompt) {
        const dyn = p.dynamicPrompt(project, m);
        if (dyn) fragments.push(dyn);
      }
    }
  }

  return fragments.join("\n\n");
}

export function getAllPitfalls(profiles: FrameworkProfile[]): string {
  return profiles
    .flatMap((p) => p.knownPitfalls)
    .map((p) => `- [${p.id}] ${p.title}: ${p.description}`)
    .join("\n");
}
