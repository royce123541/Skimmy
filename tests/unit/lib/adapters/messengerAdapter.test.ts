import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parseSelectorPack } from '@/lib/adapters/core/selectorPack'
import { createMessengerAdapter, threadIdFromUrl } from '@/lib/adapters/messenger/messengerAdapter'
import messengerPack from '@/lib/adapters/messenger/selectors.json'

// Vitest runs from the project root.
const FIXTURE_PATH = path.resolve('tests/fixtures/messenger/conversation.html')

function loadFixture(): Document {
  const html = readFileSync(FIXTURE_PATH, 'utf8')
  return new DOMParser().parseFromString(html, 'text/html')
}

function rect(left: number, width: number): DOMRect {
  return {
    left,
    width,
    top: 0,
    height: 20,
    right: left + width,
    bottom: 20,
    x: left,
    y: 0,
  } as DOMRect
}

describe('threadIdFromUrl', () => {
  test.each([
    ['https://www.facebook.com/messages/t/1234567890', '1234567890'],
    ['https://www.facebook.com/messages/e2ee/t/987', '987'],
    ['https://www.messenger.com/t/555/', '555'],
    ['https://www.facebook.com/messages/', null],
    ['https://www.facebook.com/groups/42', null],
  ])('extracts the thread id from %s', (url, expected) => {
    // Act
    const threadId = threadIdFromUrl(new URL(url))

    // Assert
    expect(threadId).toBe(expected)
  })
})

describe('createMessengerAdapter', () => {
  const pack = parseSelectorPack(messengerPack)

  test('reports the open conversation with its id, title and canonical URL', () => {
    // Arrange
    const adapter = createMessengerAdapter(loadFixture(), pack)

    // Act
    const conversation = adapter.getActiveConversation(
      new URL('https://www.facebook.com/messages/t/1234?ref=notif'),
    )

    // Assert
    expect(conversation).toEqual({
      platform: 'messenger',
      workspaceId: '_',
      conversationId: '1234',
      title: 'Weekend Trip Crew',
      isGroup: true,
      url: 'https://www.facebook.com/messages/t/1234',
    })
  })

  test('reads ids, senders and text with inline emoji, skipping empty rows', () => {
    // Arrange
    const adapter = createMessengerAdapter(loadFixture(), pack)

    // Act
    const messages = adapter.readVisibleMessages()

    // Assert
    expect(
      messages.map(message => [message.platformMessageId, message.sender.name, message.text]),
    ).toEqual([
      ['mid.$fixture0001', 'Mia Santos', "Who's handling the Airbnb deposit?"],
      ['mid.$fixture0002', 'Mia Santos', 'Also need someone to book the van 🚐'],
      ['mid.$fixture0003', 'Marcou :3', 'I can do the van 👍'],
      ['mid.$fixture0004', 'You', "I'll pay the deposit tonight"],
      ['mid.$fixture0005', 'Mia Santos', ''],
    ])
  })

  test('marks messages the label attributes to You as sent by the user', () => {
    // Arrange
    const adapter = createMessengerAdapter(loadFixture(), pack)

    // Act
    const mine = adapter.readVisibleMessages()[3]

    // Assert
    expect(mine?.sender).toEqual({ name: 'You', platformUserId: null, isSelf: true })
  })

  test('captures reply excerpts separately from the reply text', () => {
    // Arrange
    const adapter = createMessengerAdapter(loadFixture(), pack)

    // Act
    const reply = adapter.readVisibleMessages()[3]

    // Assert
    expect(reply?.replyToExcerpt).toBe("Who's handling the Airbnb deposit?")
    expect(reply?.text).toBe("I'll pay the deposit tonight")
  })

  test('detects photos but not avatars, reactions or read receipts as attachments', () => {
    // Arrange
    const adapter = createMessengerAdapter(loadFixture(), pack)

    // Act
    const attachments = adapter.readVisibleMessages().map(message => message.attachments)

    // Assert
    expect(attachments).toEqual([[], [], [], [], ['image']])
  })

  test('falls back to the visible sender name when the label is in another language', () => {
    // Arrange
    const adapter = createMessengerAdapter(loadFixture(), pack)

    // Act
    const photo = adapter.readVisibleMessages()[4]

    // Assert
    expect(photo?.sender).toEqual({ name: 'Mia Santos', platformUserId: null, isSelf: false })
  })

  test('treats right-aligned bubbles as messages from You when no label matches', () => {
    // Arrange
    const document = loadFixture()
    const list = document.querySelector('[role="log"]')
    const message = document.querySelector('[data-message-id="mid.$fixture0003"]')
    const bubble = message?.querySelector('span[dir="auto"] > div[dir="auto"]')
    if (list === null || message === null || bubble === null || bubble === undefined) {
      throw new Error('fixture is missing the message list or bubble')
    }
    message.removeAttribute('aria-label')
    message.querySelector('h3')?.remove()
    list.getBoundingClientRect = () => rect(0, 600)
    bubble.getBoundingClientRect = () => rect(360, 240)
    const adapter = createMessengerAdapter(document, pack)

    // Act
    const mine = adapter.readVisibleMessages()[2]

    // Assert
    expect(mine?.sender).toEqual({ name: 'You', platformUserId: null, isSelf: true })
  })
})
