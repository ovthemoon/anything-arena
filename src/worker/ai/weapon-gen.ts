import { z } from 'zod'
import type { PlayerSlot } from '../../shared/schemas/enums'
import { WeaponProfile, type WeaponInput } from '../../shared/schemas/weapon'
import type { OpenRouterClient } from './openrouter'
import { WEAPON_GEN_SYSTEM_BY_LANG, WeaponGenOutput, buildWeaponGenUser } from './prompts/weapon'
import { rosterDescription } from '../../shared/rules/roster'
import { DEFAULT_LANG, type Lang } from '../../shared/i18n/lang'

const WEAPON_GEN_JSON_SCHEMA = z.toJSONSchema(WeaponGenOutput)

export interface WeaponGenContext {
  matchId: string
  slot: PlayerSlot
  lang?: Lang
}

/**
 * OpenRouter 로 무기 프로필을 생성한다. 스키마 검증 실패 시 1회 재시도, 다시 실패하면 throw
 * (호출자인 DO 가 DEFAULT_WEAPONS 로 대체한다).
 */
export const generateWeaponWithOpenRouter = async (
  or: OpenRouterClient,
  model: string,
  input: WeaponInput,
  ctx: WeaponGenContext,
): Promise<WeaponProfile> => {
  const lang = ctx.lang ?? DEFAULT_LANG
  const call = () =>
    or.chatJson({
      model,
      system: WEAPON_GEN_SYSTEM_BY_LANG[lang],
      user: buildWeaponGenUser(input.weaponName, input.description, input.character, rosterDescription(input.characterId, lang)),
      schema: WeaponGenOutput,
      jsonSchema: WEAPON_GEN_JSON_SCHEMA,
      timeoutMs: 8000,
    })

  let output: WeaponGenOutput
  try {
    output = await call()
  } catch {
    output = await call()
  }

  const id = `${ctx.matchId}-${ctx.slot}-${crypto.randomUUID()}`
  const profile = {
    id,
    version: 1,
    characterName: output.characterName,
    characterId: input.characterId ?? null,
    imageUrl: null,
    displayName: input.weaponName,
    tagline: output.tagline,
    capabilities: output.capabilities,
    weakness: output.weakness,
    visualTag: output.visualTag,
    techniques: [
      { id: `${id}-t1`, ...output.techniques[0] },
      { id: `${id}-t2`, ...output.techniques[1] },
    ],
  }
  return WeaponProfile.parse(profile)
}
