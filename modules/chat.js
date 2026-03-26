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

  /** Время жизни сообщений в истории (мс). */
  static CHAT_HISTORY_TTL_MS = 2 * 60 * 60 * 1000;

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

    Chat.roleTooltip = DOM({ style: 'chat-role-tooltip' });
    document.body.append(Chat.roleTooltip);

    Chat.body.addEventListener('mouseenter', (e) => {
      const el = e.target.closest('[data-tooltip-source], [data-tooltip-role]');
      if (!el || !Chat.body.contains(el)) return;
      const source = el.getAttribute('data-tooltip-source');
      const role = el.getAttribute('data-tooltip-role');
      if (!source && !role) return;
      const lines = [];
      if (source) lines.push(source);
      if (role) lines.push(role);
      Chat.roleTooltip.innerHTML = '';
      lines.forEach((line) => {
        Chat.roleTooltip.append(DOM({ tag: 'div' }, line));
      });
      Chat.roleTooltip.style.display = 'block';
      const place = () => {
        const r = el.getBoundingClientRect();
        const chatRect = Chat.body.getBoundingClientRect();
        const tw = Chat.roleTooltip.offsetWidth;
        const gap = 8;
        Chat.roleTooltip.style.left = `${chatRect.left - tw - gap}px`;
        Chat.roleTooltip.style.top = `${r.top}px`;
      };
      requestAnimationFrame(place);
      requestAnimationFrame(place);
    }, true);
    Chat.body.addEventListener('mouseleave', (e) => {
      if (e.relatedTarget !== Chat.roleTooltip && !Chat.roleTooltip.contains(e.relatedTarget)) {
        Chat.roleTooltip.style.display = 'none';
      }
    }, true);
    Chat.roleTooltip.addEventListener('mouseleave', () => { Chat.roleTooltip.style.display = 'none'; });

    Chat.body.addEventListener('mouseleave', () => Chat.collapsePinnedList());

    const handleSend = async (event) => {
      if (!App.isEnterKey(event)) return;

      event.preventDefault();
      await Chat.sendMessage();
    };

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

  static get canManagePins() {
    return App.isAdmin() || App.isHelper();
  }

  static focusReplyTo(data) {
    Chat.to = data.id;
    Chat.body.lastChild.firstChild.value = `@${data.nickname}, `;
    Chat.input.firstChild.focus();
  }

  static createPinButton(data, label = '📌') {
    return DOM(
      {
        tag: 'button',
        style: 'chat-pin-button',
        event: [
          'click',
          async (e) => {
            e.stopPropagation();
            await Chat.togglePin(data);
          },
        ],
      },
      label,
    );
  }

  /** Syncs pinned list from one message (add/update or remove), keeps list open, re-renders. */
  static syncPinnedMessage(data) {
    if (!Array.isArray(Chat.pinnedMessages)) Chat.pinnedMessages = [];
    Chat.pinnedMessages = Chat.pinnedMessages.filter((m) => m.messageId !== data.messageId);
    if (data.pinned) Chat.pinnedMessages.push(data);
    Chat.pinnedCollapsed = false;
    Chat.renderPinnedMessages();
  }

  static revealChatIfNeeded() {
    if (Chat.hide) {
      Chat.body.style.display = 'block';
      Chat.hide = false;
    }
  }

  static collapsePinnedList() {
    const listWrap = Chat.pinnedContainer?.querySelector('.chat-pinned-list-wrap');
    if (listWrap) listWrap.classList.add('chat-pinned-list-wrap-collapsed');
    Chat.pinnedCollapsed = true;
  }

  static getMessageSourceType(data) {
    if (Number(data?.client) === 1) return 'phone';
    if (Number(data?.id) === -2) return 'telegram';
    return null;
  }

  static getMessageSourceLabel(data) {
    const source = Chat.getMessageSourceType(data);
    if (source === 'phone') return Lang.text('titlePhone');
    if (source === 'telegram') return Lang.text('titleTelegram');
    return '';
  }

  static isFromCastleMessage(data) {
    if (!data || typeof data !== 'object') return true;
    if (typeof data.fromCastle === 'boolean') return data.fromCastle;
    if (typeof data.isCastle === 'boolean') return data.isCastle;
    if ('castle' in data) {
      const v = data.castle;
      if (typeof v === 'boolean') return v;
      if (Number.isFinite(Number(v))) return Number(v) !== 0;
    }
    return false;
  }

  static getFlagLabel(flagId) {
    if (!flagId || flagId === 0) return '';
    const key = `flag_${flagId}`;
    const text = Lang.text(key);
    if (!text || text === key) return String(flagId);
    return text;
  }

  /** Builds flag, nickname and message nodes with same styling as chat (for viewMessage and pinned list). */
  static buildMessageContent(data) {
    let flag = null;
    if (data.flag && data.flag !== 0) {
      flag = DOM({ tag: 'img' });
      flag.setAttribute('src', `content/flags/${data.flag}.png`);
      flag.classList.add('chat-flag');
      const flagLabel = Chat.getFlagLabel(data.flag);
      if (flagLabel) flag.dataset.tooltipSource = flagLabel;
    }

    const sourceLabel = Chat.getMessageSourceLabel(data);
    const fromCastle = Chat.isFromCastleMessage(data);
    let sourceIcon = null;
    if (sourceLabel && !fromCastle) {
      const sourceType = Chat.getMessageSourceType(data) || 'unknown';
      sourceIcon = DOM({ tag: 'span', style: ['chat-source-icon', `chat-source-icon-${sourceType}`] });
      sourceIcon.dataset.tooltipSource = sourceLabel;
      sourceIcon.textContent = sourceType === 'phone' ? '📱' : '';
    }

    const nickname = DOM({ tag: 'div' }, data.nickname + ': ');
    nickname.style.color = 'rgb(250, 229, 108)';
    nickname.style.fontWeight = 100;
    if (data.id == 1) {
      nickname.style.color = 'transparent';
      nickname.style.fontWeight = 600;
      nickname.classList.add('owner-text');
      nickname.dataset.tooltipRole = Lang.text('titleOwner');
    } else if (data.id == -2) {
      nickname.style.color = 'rgb(250, 229, 108)';
      nickname.style.fontWeight = 600;
    } else if (App.isAdmin(data.id)) {
      nickname.style.color = 'transparent';
      nickname.style.fontWeight = 600;
      nickname.classList.add('administration-text');
      nickname.dataset.tooltipRole = Lang.text('titleAdministration');
    } else if (App.isHelper(data.id)) {
      nickname.style.color = '#48D1CC';
      nickname.style.fontWeight = 600;
      nickname.classList.add('helper-text');
      nickname.dataset.tooltipRole = Lang.text('titleHelper');
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

    return { flag, sourceIcon, nickname, message };
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
        existingItem.querySelector('.chat-pin-button')?.remove();
        Chat.syncPinnedMessage(data);
        if (!fromHistory) Chat.revealChatIfNeeded();
      } else {
        const wasInPinned = Chat.pinnedMessages.some((m) => m.messageId === data.messageId);
        if (wasInPinned) Chat.syncPinnedMessage(data);
        if (Chat.canManagePins && !existingItem.querySelector('.chat-pin-button')) {
          existingItem.append(Chat.createPinButton(data));
        }
      }
      if (!fromHistory && !data.pinned) Chat.addMessageToHistory(data);
      Chat.scroll();
      return;
    }

    if (data.pinned) {
      Chat.syncPinnedMessage(data);
      if (!fromHistory) Chat.revealChatIfNeeded();
      return;
    }

    const wasOnlyPinned = Chat.pinnedMessages.some((m) => m.messageId === data.messageId);
    if (wasOnlyPinned) {
      Chat.syncPinnedMessage(data);
      return;
    }

    const { flag, sourceIcon, nickname, message } = Chat.buildMessageContent(data);
    const parts = [];
    if (flag) parts.push(flag);
    if (sourceIcon) parts.push(sourceIcon);
    parts.push(nickname, message);
    const contentWrap = DOM({ style: 'chat-body-item-content' }, ...parts);
    const item = DOM(
      {
        style: 'chat-body-item',
        domaudio: domAudioPresets.bigButton,
        event: ['click', () => Chat.focusReplyTo(data)],
      },
      contentWrap,
    );

    item.dataset.messageId = data.messageId;
    if (Chat.canManagePins && !data.pinned) item.append(Chat.createPinButton(data));

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
      Chat.syncPinnedMessage(data);
      if (!fromHistory) Chat.revealChatIfNeeded();
    } else if (Chat.pinnedMessages.some((m) => m.messageId === data.messageId)) {
      Chat.syncPinnedMessage(data);
    }
    if (!fromHistory && !data.pinned) Chat.addMessageToHistory(data);
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
      const clone = { ...data, _ts: Date.now() };
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
      const now = Date.now();
      const ttl = Chat.CHAT_HISTORY_TTL_MS;
      Chat.messages = parsed.filter((msg) => {
        const ts = msg._ts ?? 0;
        return now - ts < ttl;
      });
      if (Chat.messages.length !== parsed.length) {
        localStorage.setItem(Chat.STORAGE_KEY, JSON.stringify(Chat.messages));
      }
      for (let i = Chat.messages.length - 1; i >= 0; i--) {
        Chat.viewMessage(Chat.messages[i], true);
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  }

  static fillPinnedList(list) {
    while (list.firstChild) list.firstChild.remove();

    Chat.pinnedMessages.forEach((msg) => {
      const { flag, sourceIcon, nickname, message } = Chat.buildMessageContent(msg);
      const parts = [];
      if (flag) parts.push(flag);
      if (sourceIcon) parts.push(sourceIcon);
      parts.push(nickname, message);
      const contentWrap = DOM({ style: 'chat-body-item-content' }, ...parts);
      const row = DOM(
        {
          style: ['chat-body-item', 'chat-pinned-item'],
          domaudio: domAudioPresets.bigButton,
          event: ['click', () => Chat.focusReplyTo(msg)],
        },
        contentWrap,
      );

      if (Chat.canManagePins) row.append(Chat.createPinButton(msg, '❌'));
      list.append(row);
    });
  }

  static renderPinnedMessages() {
    if (!Chat.pinnedContainer) {
      return;
    }

    const hasPinned = Array.isArray(Chat.pinnedMessages) && Chat.pinnedMessages.length > 0;
    Chat.body?.classList.toggle('chat-has-pinned', hasPinned);

    const existingListWrap = Chat.pinnedContainer.querySelector('.chat-pinned-list-wrap');
    const existingList = existingListWrap?.querySelector('.chat-pinned-list');
    const existingHeader = Chat.pinnedContainer.querySelector('.chat-pinned-header');

    if (hasPinned && existingHeader && existingList) {
      const last = Chat.pinnedMessages[Chat.pinnedMessages.length - 1];
      existingHeader.children[1].textContent = last.message;
      existingHeader.children[2].textContent = Chat.pinnedMessages.length;
      Chat.fillPinnedList(existingList);
      if (!Chat.pinnedCollapsed) existingListWrap.classList.remove('chat-pinned-list-wrap-collapsed');
      return;
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
            if (Chat.pinnedCollapsed) Chat.collapsePinnedList();
            else Chat.renderPinnedMessages();
          },
        ],
      },
    );

    const title = DOM({ tag: 'div' }, '📌 ');
    const headerText = DOM({ tag: 'div' }, last.message);
    const count = DOM({ tag: 'div', style: 'chat-pinned-count' }, `${total}`);

    header.append(title, headerText, count);
    Chat.pinnedContainer.append(header);

    const listWrap = DOM({ style: 'chat-pinned-list-wrap' });
    listWrap.classList.add('chat-pinned-list-wrap-collapsed');
    const list = DOM({ style: 'chat-pinned-list' });

    Chat.fillPinnedList(list);

    listWrap.append(list);
    Chat.pinnedContainer.append(listWrap);

    if (!Chat.pinnedCollapsed) {
      requestAnimationFrame(() => listWrap.classList.remove('chat-pinned-list-wrap-collapsed'));
    }
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
