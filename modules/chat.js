import { DOM } from './dom.js';
import { Lang } from './lang.js';
import { App } from './app.js';
import { NativeAPI } from './nativeApi.js';
import { Splash } from './splash.js';
import { domAudioPresets } from './domAudioPresets.js';

export class Chat {
  static body;

  static hide = false;

  static to = 0;

  static STORAGE_KEY = 'castle_chat_messages_v1';

  static MAX_HISTORY = 20;

  static messages = [];

  static pinnedMessages = [];

  static pinnedCollapsed = true;

  static pinnedContainer;

  static initView() {
    let scrollBtn = DOM(
      {
        style: 'scroll-btn',
        domaudio: domAudioPresets.smallButton,
        event: [
          'click',
          () => {
            Chat.scroll(true);
          },
        ],
        title: 'Прокрутить чат вниз', // Добавляем описание при наведении
      },
      '▼',
    ); // Замените '▼' на нужный вам текст или символ для кнопки прокрутки

    let input = DOM({
      tag: 'input',
      domaudio: domAudioPresets.chatButton,
      style: 'chat-input',
      placeholder: Lang.text('enterTextAndPressEnter'),
    });

    Chat.input = DOM({ style: 'chat-input-container' }, input, scrollBtn);

    Chat.pinnedContainer = DOM({ style: 'chat-pinned-container' });

    Chat.body = DOM({ style: 'chat' }, DOM({ style: 'chat-body' }), Chat.pinnedContainer, Chat.input);

		const handleSend = async (event) => {
		  if (event.key === 'Enter' || event.keyCode === 13 || event.code === 'Enter' || event.code === 'NumpadEnter') {
			event.preventDefault();
			await Chat.sendMessage();
		  }
		};

 // input.addEventListener('keyup', handleSend);
 // input.addEventListener('keypress', handleSend);
    input.addEventListener('keydown', handleSend);

    input.addEventListener('input', () => {
      if (!Chat.input.firstChild.value) {
        Chat.to = 0;
      }
    });
  }

  static init() {
    Chat.initView();

    Chat.loadHistory();

    document.addEventListener('keydown', (event) => {
      if (event.code == 'KeyM' && (event.ctrlKey || event.metaKey)) {
        changeChatVisibility();
      }
    });
  }

  static changeChatVisibility() {
    if (Chat.hide) {
      Chat.body.style.display = 'block';

      Chat.hide = false;
    } else {
      Chat.body.style.display = 'none';

      Chat.hide = true;
    }
  }

  static wrapLinksInATag(message) {
    const urlRegex = /(https:\/\/[^\s]+)/g;
    return message.replace(urlRegex, '<a href="$1">$1</a>');
  }

  /** Builds flag, nickname and message nodes with same styling as chat (for viewMessage and pinned list). */
  static buildMessageContent(data) {
    let flag = null;
    if (data.flag && data.flag !== 0) {
      flag = DOM({ tag: 'img' });
      flag.setAttribute('src', `content/flags/${data.flag}.png`);
      flag.classList.add('chat-flag');
    }

    const nickname = DOM({ tag: 'div' }, data.nickname + ': ');
    nickname.style.color = 'rgb(250, 229, 108)';
    nickname.style.fontWeight = 100;
    if (data.id == 1) {
      nickname.style.color = 'transparent';
      nickname.style.fontWeight = 600;
      nickname.classList.add('owner-text');
      nickname.dataset.role = Lang.text('titleOwner');
    } else if (data.id == -2) {
      nickname.style.color = 'transparent';
      nickname.style.fontWeight = 600;
      nickname.classList.add('telegrambot-text');
      nickname.dataset.role = Lang.text('titleTelegram');
    } else if (App.isAdmin(data.id)) {
      nickname.style.color = 'transparent';
      nickname.style.fontWeight = 600;
      nickname.classList.add('administration-text');
      nickname.dataset.role = Lang.text('titleAdministration');
    } else if (App.isHelper(data.id)) {
      nickname.style.color = '#48D1CC';
      nickname.style.fontWeight = 600;
      nickname.classList.add('helper-text');
      nickname.dataset.role = Lang.text('titleHelper');
    }

    const message = DOM({ tag: 'div' });
    if (data.id == 1) {
      if (String(data.message).slice(0, 5) == 'https') {
        message.append(DOM({ tag: 'img', src: data.message }));
      } else {
        message.innerText = `${data.message}`;
      }
    } else {
      message.innerText = `${data.message}`;
    }
    if (App.isAdmin(data.id)) {
      if (String(data.message).includes('https') && !String(data.message).includes('.gif')) {
        message.innerHTML = this.wrapLinksInATag(message.innerHTML);
      }
      if (NativeAPI.status) {
        message.addEventListener('click', (e) => NativeAPI.linkHandler(e));
      }
    }
    if (data.to == -1) {
      message.style.color = 'rgb(255,50,0)';
      message.style.fontWeight = 600;
      message.style.fontStyle = 'italic';
    } else if (data.to == App.storage.data.id) {
      message.style.color = 'rgba(51,255,0,0.9)';
    }

    return { flag, nickname, message };
  }

  static viewMessage(data, fromHistory = false) {
    if (!data) {
      return;
    }

    if (!data.messageId) {
      data.messageId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    const existingItem = Chat.body?.firstChild?.querySelector(
      `.chat-body-item[data-message-id="${data.messageId}"]`,
    );
    if (existingItem) {
      if (data.pinned) {
        const pinBtn = existingItem.querySelector('.chat-pin-button');
        if (pinBtn) pinBtn.remove();
        if (!Array.isArray(Chat.pinnedMessages)) Chat.pinnedMessages = [];
        Chat.pinnedMessages = Chat.pinnedMessages.filter((m) => m.messageId !== data.messageId);
        Chat.pinnedMessages.push(data);
        Chat.renderPinnedMessages();
        if (!fromHistory && Chat.hide) {
          Chat.body.style.display = 'block';
          Chat.hide = false;
        }
      } else {
        if (Array.isArray(Chat.pinnedMessages) && Chat.pinnedMessages.length) {
          const before = Chat.pinnedMessages.length;
          Chat.pinnedMessages = Chat.pinnedMessages.filter((m) => m.messageId !== data.messageId);
          if (Chat.pinnedMessages.length !== before) Chat.renderPinnedMessages();
        }
        if ((App.isAdmin() || App.isHelper()) && !existingItem.querySelector('.chat-pin-button')) {
          const pinButton = DOM(
            {
              tag: 'button',
              style: 'chat-pin-button',
              event: [
                'click',
                async (event) => {
                  event.stopPropagation();
                  await Chat.togglePin(data);
                },
              ],
            },
            '📌',
          );
          existingItem.append(pinButton);
        }
      }
      if (!fromHistory) Chat.addMessageToHistory(data);
      Chat.scroll();
      return;
    }

    if (data.pinned) {
      if (!Array.isArray(Chat.pinnedMessages)) Chat.pinnedMessages = [];
      Chat.pinnedMessages = Chat.pinnedMessages.filter((m) => m.messageId !== data.messageId);
      Chat.pinnedMessages.push(data);
      Chat.renderPinnedMessages();
      if (!fromHistory) Chat.addMessageToHistory(data);
      if (!fromHistory && Chat.hide) {
        Chat.body.style.display = 'block';
        Chat.hide = false;
      }
      return;
    }

    const wasOnlyPinned =
      Array.isArray(Chat.pinnedMessages) && Chat.pinnedMessages.some((m) => m.messageId === data.messageId);
    if (wasOnlyPinned) {
      Chat.pinnedMessages = Chat.pinnedMessages.filter((m) => m.messageId !== data.messageId);
      Chat.renderPinnedMessages();
      if (!fromHistory) Chat.addMessageToHistory(data);
      return;
    }

    const { flag, nickname, message } = Chat.buildMessageContent(data);

    const item = DOM(
      {
        style: 'chat-body-item',
        domaudio: domAudioPresets.bigButton,
        event: [
          'click',
          () => {
            Chat.to = data.id;
            Chat.body.lastChild.firstChild.value = `@${data.nickname}, `;
            Chat.input.firstChild.focus();
          },
        ],
      },
      ...(flag ? [flag, nickname, message] : [nickname, message]),
    );

    item.dataset.messageId = data.messageId;

    const canManagePins = App.isAdmin() || App.isHelper();
    if (canManagePins && !data.pinned) {
      const pinButton = DOM(
        {
          tag: 'button',
          style: 'chat-pin-button',
          event: [
            'click',
            async (event) => {
              event.stopPropagation();
              await Chat.togglePin(data);
            },
          ],
        },
        '📌',
      );
      item.append(pinButton);
    }

    item.addEventListener('contextmenu', () => {
      if (App.isAdmin() || App.isHelper()) {
        let body = document.createDocumentFragment();

        body.append(
          DOM(`Выдать мут чата ${data.nickname}?`),
          DOM(
            {
              style: 'splash-content-button',
              domaudio: domAudioPresets.bigButton,
              event: [
                'click',
                async () => {
                  await App.api.request('user', 'mute', { id: data.id });

                  Splash.hide();
                },
              ],
            },
            'Да',
          ),
          DOM(
            {
              style: 'splash-content-button',
              domaudio: domAudioPresets.bigButton,
              event: ['click', async () => Splash.hide()],
            },
            'Нет',
          ),
        );

        Splash.show(body);
      }

      return false;
    });

    Chat.body.firstChild.prepend(item);

    if (data.pinned) {
      if (!Array.isArray(Chat.pinnedMessages)) {
        Chat.pinnedMessages = [];
      }
      Chat.pinnedMessages = Chat.pinnedMessages.filter((m) => m.messageId !== data.messageId);
      Chat.pinnedMessages.push(data);
      Chat.renderPinnedMessages();
      if (!fromHistory && Chat.hide) {
        Chat.body.style.display = 'block';
        Chat.hide = false;
      }
    } else if (Array.isArray(Chat.pinnedMessages) && Chat.pinnedMessages.length) {
      const beforeLength = Chat.pinnedMessages.length;
      Chat.pinnedMessages = Chat.pinnedMessages.filter((m) => m.messageId !== data.messageId);
      if (Chat.pinnedMessages.length !== beforeLength) {
        Chat.renderPinnedMessages();
      }
    }

    if (!fromHistory) {
      Chat.addMessageToHistory(data);
    }

    Chat.scroll();
  }

  static async sendMessage() {
    if (Chat.input.firstChild.value.length > 128) {
      return;
    }

    await App.api.request('user', 'chat', {
      message: Chat.input.firstChild.value,
      to: Chat.to,
    });

    Chat.to = 0;

    Chat.input.firstChild.value = '';
  }

  static scroll(forceScroll = false) {
    if (
      Chat.body.firstChild.children.length &&
      (forceScroll || Chat.body.firstChild.firstChild.offsetTop == Chat.body.firstChild.firstChild.offsetHeight)
    ) {
      Chat.body.firstChild.firstChild.scrollIntoView({
        block: 'end',
        behavior: 'smooth',
      });
    }
  }

  static addMessageToHistory(data) {
    try {
      const clone = { ...data };
      if (!Array.isArray(Chat.messages)) {
        Chat.messages = [];
      }
      if (clone.messageId) {
        Chat.messages = Chat.messages.filter((msg) => msg.messageId !== clone.messageId);
      }
      Chat.messages.unshift(clone);
      if (Chat.messages.length > Chat.MAX_HISTORY) {
        Chat.messages.length = Chat.MAX_HISTORY;
      }
      localStorage.setItem(Chat.STORAGE_KEY, JSON.stringify(Chat.messages));
    } catch (e) {
      console.error('Failed to save chat history', e);
    }
  }

  static loadHistory() {
    try {
      const raw = localStorage.getItem(Chat.STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }
      Chat.messages = parsed;
      for (let i = parsed.length - 1; i >= 0; i--) {
        Chat.viewMessage(parsed[i], true);
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  }

  static renderPinnedMessages() {
    if (!Chat.pinnedContainer) {
      return;
    }

    const hasPinned = Array.isArray(Chat.pinnedMessages) && Chat.pinnedMessages.length > 0;
    if (Chat.body) {
      Chat.body.classList.toggle('chat-has-pinned', hasPinned);
    }

    while (Chat.pinnedContainer.firstChild) {
      Chat.pinnedContainer.firstChild.remove();
    }

    if (!hasPinned) {
      Chat.pinnedContainer.style.display = 'none';
      return;
    }

    Chat.pinnedContainer.style.display = 'block';

    const total = Chat.pinnedMessages.length;
    const last = Chat.pinnedMessages[total - 1];

    const header = DOM(
      {
        style: ['chat-pinned-header', 'chat-pinned-message'],
        event: [
          'click',
          () => {
            Chat.pinnedCollapsed = !Chat.pinnedCollapsed;
            Chat.renderPinnedMessages();
          },
        ],
      },
    );

    const title = DOM({ tag: 'div' }, '📌 ');
    const headerText = DOM({ tag: 'div' }, `${last.nickname}: ${last.message}`);
    const count = DOM({ tag: 'div', style: 'chat-pinned-count' }, `${total}`);

    header.append(title, headerText, count);
    Chat.pinnedContainer.append(header);

    if (Chat.pinnedCollapsed) {
      return;
    }

    const listWrap = DOM({ style: 'chat-pinned-list-wrap' });
    const list = DOM({ style: 'chat-pinned-list' });

    const canManagePins = App.isAdmin() || App.isHelper();

    Chat.pinnedMessages.forEach((msg) => {
      const { flag, nickname, message } = Chat.buildMessageContent(msg);
      const row = DOM({
        style: ['chat-body-item', 'chat-pinned-item'],
        domaudio: domAudioPresets.bigButton,
        event: [
          'click',
          () => {
            Chat.to = msg.id;
            Chat.body.lastChild.firstChild.value = `@${msg.nickname}, `;
            Chat.input.firstChild.focus();
          },
        ],
      });
      row.append(...(flag ? [flag, nickname, message] : [nickname, message]));

      if (canManagePins) {
        const btn = DOM(
          {
            tag: 'button',
            style: 'chat-pin-button',
            event: [
              'click',
              async (event) => {
                event.stopPropagation();
                await Chat.togglePin(msg);
              },
            ],
          },
          '❌',
        );
        row.append(btn);
      }

      list.append(row);
    });

    listWrap.append(list);
    Chat.pinnedContainer.append(listWrap);
  }

  static async togglePin(data) {
    if (!data || !data.messageId) {
      return;
    }

    const isPinnedNow =
      Array.isArray(Chat.pinnedMessages) && Chat.pinnedMessages.some((msg) => msg.messageId === data.messageId);
    const shouldPin = !isPinnedNow;

    try {
      await App.api.request('user', 'chatPin', {
        messageId: data.messageId,
        pinned: shouldPin,
      });
    } catch (error) {
      App.error(error);
    }
  }
}
