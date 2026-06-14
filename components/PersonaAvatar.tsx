import React, { useState } from 'react'
import { Image, Text, View, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

type Props = {
  photoUrl?: string | null
  name: string
  size?: number
  style?: ViewStyle
}

export default function PersonaAvatar({ photoUrl, name, size = 48, style }: Props) {
  const [photoError, setPhotoError] = useState(false)

  if (photoUrl && !photoError) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        onError={() => setPhotoError(true)}
      />
    )
  }

  return (
    <LinearGradient
      colors={['rgba(168,85,247,0.6)', 'rgba(219,39,119,0.4)']}
      style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '700' }}>
        {name.charAt(0) || '?'}
      </Text>
    </LinearGradient>
  )
}
