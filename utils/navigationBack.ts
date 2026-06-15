import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/RootNavigator'

type FallbackRoute<N extends keyof RootStackParamList> = {
  name: N
  params?: RootStackParamList[N]
}

/** 스택 pop 우선, 없으면 replace로 이전 화면 복원 (navigate 대신 사용) */
export function goBackWithFallback<N extends keyof RootStackParamList>(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  fallback: FallbackRoute<N>,
) {
  if (navigation.canGoBack()) {
    navigation.goBack()
    return
  }
  navigation.replace(fallback.name, fallback.params as RootStackParamList[N])
}
