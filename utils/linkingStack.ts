import type { PartialState, NavigationState } from '@react-navigation/native'

type StackRoute = { name: string; params?: object }
type StackState = { routes: StackRoute[]; index: number }

/** URL 직접 진입 시 단일 화면만 복원되는 문제 — 부모 스택을 붙여 뒤로가기 지원 */
export function withParentStack(
  state: PartialState<NavigationState> | undefined,
): PartialState<NavigationState> | undefined {
  if (!state?.routes?.length) return state

  const index = state.index ?? state.routes.length - 1
  const leaf = state.routes[index] as StackRoute
  if (state.routes.length !== 1) return state

  const p = (leaf.params ?? {}) as Record<string, unknown>
  const careType = (p.careType as 'human' | 'pet') ?? 'human'

  const prefixes: Record<string, StackRoute[]> = {
    CareSelect: [{ name: 'Main' }],
    RelationSetup: [{ name: 'Main' }, { name: 'CareSelect' }],
    TimingCheck: [
      { name: 'Main' },
      { name: 'CareSelect' },
      { name: 'RelationSetup', params: { careType } },
    ],
    PersonaCreate: [
      { name: 'Main' },
      { name: 'CareSelect' },
      { name: 'RelationSetup', params: { careType } },
      {
        name: 'TimingCheck',
        params: {
          careType,
          relation: typeof p.relation === 'string' ? p.relation : '',
          name: typeof p.name === 'string' ? p.name : '',
        },
      },
    ],
    Settings: [{ name: 'Main' }],
    AccountProfile: [{ name: 'Main' }, { name: 'Settings' }],
    PrivacyPolicy: [{ name: 'Main' }],
    Terms: [{ name: 'Main' }],
    CustomerSupport: [{ name: 'Main' }],
    EmailAuth: [{ name: 'Onboarding' }],
  }

  const prefix = prefixes[leaf.name]
  if (!prefix) return state

  return {
    routes: [...prefix, leaf],
    index: prefix.length,
  }
}
