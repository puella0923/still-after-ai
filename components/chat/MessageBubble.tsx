import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export type Message = {
  id: string
  role: 'user' | 'ai'
  text: string
  timestamp: Date
}

type Props = {
  message: Message
}

function formatTime(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes().toString().padStart(2, '0')
  const period = h < 12 ? '오전' : '오후'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${period} ${hour}:${m}`
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAi]}>
      {!isUser && <View style={styles.avatar}><Text style={styles.avatarText}>엄</Text></View>}

      <View style={[styles.bubbleWrapper, isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperAi]}>
        {!isUser && <Text style={styles.senderName}>엄마</Text>}

        <View style={styles.bubbleRow}>
          {isUser && (
            <Text style={[styles.timestamp, styles.timestampUser]}>
              {formatTime(message.timestamp)}
            </Text>
          )}

          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
            <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAi]}>
              {message.text}
            </Text>
          </View>

          {!isUser && (
            <Text style={[styles.timestamp, styles.timestampAi]}>
              {formatTime(message.timestamp)}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAi: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#D4C9BE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5E55',
  },
  bubbleWrapper: {
    maxWidth: '72%',
  },
  bubbleWrapperUser: {
    alignItems: 'flex-end',
  },
  bubbleWrapperAi: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#7A6F65',
    marginBottom: 4,
    marginLeft: 2,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  bubbleUser: {
    backgroundColor: '#2C2C2C',
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  bubbleTextAi: {
    color: '#2C2C2C',
  },
  timestamp: {
    fontSize: 10,
    color: '#B0A89E',
    marginBottom: 2,
  },
  timestampUser: {
    alignSelf: 'flex-end',
  },
  timestampAi: {
    alignSelf: 'flex-end',
  },
})
